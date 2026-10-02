/**
 * Vouchers and complimentary ("no-charge") access.
 *
 * A VOUCHER (vouchers/{CODE}) is a reusable offer: a tier plus either a fixed end date ("free until 31 Dec") or
 * a number of days ("30 days free"). An admin applies it to a client (redeemVoucher). What that does depends on
 * whether the client is paying:
 *
 *   Not paying -> complimentary access: the account gets the tier with no Stripe subscription.
 *     users/{uid}.subscription = {
 *       tier, status: "active", stripeSubscriptionId: null, currentPeriodEnd: <until>,
 *       complimentary: { enabled, until, reason, grantedBy, grantedAt, organisationId?, warningSentAt },
 *       voucher: { code, mode: "complimentary", appliedAt, until }
 *     }
 *   Paying     -> a 100%-off Stripe coupon on their existing subscription, so billing stays intact and
 *     free months are simply taken off the next invoices.
 *     subscription.voucher = { code, mode: "stripe_coupon", appliedAt, until, months, stripeCouponId }
 *
 * Applying a voucher always EXTENDS: it never shortens time a client already has.
 *
 * Organisations can also be put on no-charge directly:
 *   organisations/{id}.noCharge = { enabled, until, reason, grantedBy, grantedAt, previousTier, previousLicenceLimit }
 *
 * Browsers can never write these fields (see firestore.rules); everything here runs as a Cloud Function.
 *
 * Lifecycle (complimentary): 30 days before the end a warning email + notification, then back to Free.
 * If the client starts paying through Stripe, the checkout webhook replaces the subscription map, which removes
 * the flag.
 *
 * Client self-redemption is NOT enabled. redeemVoucherCore() is the single place that applies a voucher; to let
 * clients redeem their own, add an onCall that calls it with { uid: request.auth.uid, byAdmin: false } and set
 * clientRedeemable: true on the vouchers that should allow it.
 */

const crypto = require("crypto");

const WARNING_DAYS = 30;
const MAX_GRANT_DAYS = 800; // guard against typos like 2062
const GRANTABLE_ROLES = ["client", "account manager"];
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;
const TIER_RANK = { free: 0, starter: 1, premium: 2, agency: 3 };
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L to avoid misreading

// Organisation tier ids differ from subscription tier ids (same mapping the website uses)
const ORG_TIER_TO_SUBSCRIPTION_TIER = {
  starter: "starter",
  professional: "premium",
  premium: "premium",
  enterprise: "agency",
  agency: "agency",
};

const toDate = (value) => {
  if (!value) return null;
  const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** True while a complimentary grant is switched on and its end date is in the future. */
const isComplimentaryActive = (subscription) => {
  const c = subscription?.complimentary;
  if (!c?.enabled) return false;
  const until = toDate(c.until);
  return !!until && until > new Date();
};

/** True if the subscription is a real, billed Stripe subscription (as opposed to a complimentary grant). */
const hasPaidStripeSubscription = (subscription) =>
  !!subscription?.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(subscription.status);

module.exports = ({ admin, db, stripe, onCall, onSchedule, HttpsError, SUBSCRIPTION_TIERS }) => {
  const { FieldValue, Timestamp } = admin.firestore;

  const freeSubscription = () => ({
    tier: "free",
    status: "active",
    stripeSubscriptionId: null,
    stripePriceId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    managedSeat: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const requireAdmin = async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
    const callerDoc = await db.collection("users").doc(request.auth.uid).get();
    const role = callerDoc.exists ? callerDoc.data().role : null;
    if (role !== "admin" && role !== "super admin") {
      throw new HttpsError("permission-denied", "Only admins can manage complimentary access");
    }
    return request.auth.uid;
  };

  /** Accepts "YYYY-MM-DD" (or any ISO date) and returns the end of that day. */
  const parseUntil = (value) => {
    if (!value || typeof value !== "string") {
      throw new HttpsError("invalid-argument", "An end date is required");
    }
    const day = value.slice(0, 10);
    const until = new Date(`${day}T23:59:59.000Z`);
    if (Number.isNaN(until.getTime())) {
      throw new HttpsError("invalid-argument", "End date is not a valid date");
    }
    const now = Date.now();
    if (until.getTime() <= now) {
      throw new HttpsError("invalid-argument", "End date must be in the future");
    }
    if (until.getTime() - now > MAX_GRANT_DAYS * DAY_MS) {
      throw new HttpsError("invalid-argument", "End date is too far in the future");
    }
    return until;
  };

  const requireTier = (tierId) => {
    if (!tierId || tierId === "free" || !SUBSCRIPTION_TIERS[tierId]) {
      throw new HttpsError("invalid-argument", "Choose a paid tier: starter, premium or agency");
    }
    return SUBSCRIPTION_TIERS[tierId];
  };

  const logEvent = (userId, eventType, extra = {}) =>
    db.collection("subscriptionEvents").add({
      userId,
      eventType,
      ...extra,
      createdAt: FieldValue.serverTimestamp(),
    });

  /**
   * Put one user on a complimentary tier. Throws HttpsError if the account can't take one.
   * @returns {Promise<void>}
   */
  const applyUserGrant = async (uid, userData, { tier, until, reason, grantedBy, organisationId = null, voucherCode = null }) => {
    if (!GRANTABLE_ROLES.includes(userData.role)) {
      throw new HttpsError("failed-precondition", "Complimentary access is for client accounts only");
    }
    const existing = userData.subscription || {};
    if (existing.managedSeat) {
      throw new HttpsError("failed-precondition", "This client's access is managed by an agency seat");
    }
    if (hasPaidStripeSubscription(existing)) {
      throw new HttpsError(
        "failed-precondition",
        "This client has a paid Stripe subscription. Cancel it in Stripe first so they are not charged twice."
      );
    }

    const now = Timestamp.now();
    const update = {
      subscription: {
        tier,
        status: "active",
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: now,
        currentPeriodEnd: Timestamp.fromDate(until),
        cancelAtPeriodEnd: false,
        managedSeat: false,
        complimentary: {
          enabled: true,
          until: Timestamp.fromDate(until),
          reason: reason || "",
          grantedBy,
          grantedAt: now,
          organisationId,
          warningSentAt: null,
        },
        voucher: voucherCode
          ? { code: voucherCode, mode: "complimentary", appliedAt: now, until: Timestamp.fromDate(until) }
          : FieldValue.delete(),
        createdAt: existing.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
    };
    if (tier === "agency" && !userData.agency) {
      update.agency = { totalSeats: 6, usedSeats: 0, additionalSeatsPurchased: 0, managedUserIds: [] };
    }

    await db.collection("users").doc(uid).update(update);
    await logEvent(uid, "complimentary_granted", {
      previousTier: existing.tier || "free",
      newTier: tier,
      metadata: { until: until.toISOString(), reason: reason || "", grantedBy, organisationId, voucherCode },
    });
  };

  /**
   * Take a user off complimentary access and put them on the Free tier (and release any agency-managed clients).
   * @param {string} eventType - subscriptionEvents type to log
   */
  const revertUserToFree = async (uid, userData, eventType, extra = {}) => {
    const previousTier = userData.subscription?.tier || "free";

    if (previousTier === "agency" && userData.agency?.managedUserIds?.length > 0) {
      const batch = db.batch();
      for (const managedUserId of userData.agency.managedUserIds) {
        batch.update(db.collection("users").doc(managedUserId), {
          managedBy: FieldValue.delete(),
          subscription: freeSubscription(),
        });
      }
      await batch.commit();
    }

    const update = { subscription: freeSubscription() };
    if (previousTier === "agency") update.agency = FieldValue.delete();
    await db.collection("users").doc(uid).update(update);
    await logEvent(uid, eventType, { previousTier, newTier: "free", ...extra });
  };

  // --------------------------------------------------------------------------
  // Vouchers
  // --------------------------------------------------------------------------

  const normaliseCode = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "");

  /** "MC-XXXX-XXXX": easy to read out or paste, ~40 bits so it can't be guessed */
  const generateCode = () => {
    const group = () =>
      Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
    return `MC-${group()}-${group()}`;
  };

  const addMonths = (date, months) => {
    const d = new Date(date.getTime());
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
  };

  const createVoucher = onCall(async (request) => {
    const adminUid = await requireAdmin(request);
    const d = request.data || {};
    requireTier(d.tier);

    const mode = d.mode;
    if (mode !== "until" && mode !== "days") {
      throw new HttpsError("invalid-argument", "mode must be 'until' or 'days'");
    }
    let until = null;
    let days = null;
    if (mode === "until") {
      until = parseUntil(d.until);
    } else {
      days = Number(d.days);
      if (!Number.isInteger(days) || days < 1 || days > 366) {
        throw new HttpsError("invalid-argument", "Days must be a whole number from 1 to 366");
      }
    }

    let maxRedemptions = null;
    if (d.maxRedemptions !== null && d.maxRedemptions !== undefined && d.maxRedemptions !== "") {
      maxRedemptions = Number(d.maxRedemptions);
      if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
        throw new HttpsError("invalid-argument", "Maximum redemptions must be a whole number of 1 or more");
      }
    }

    const code = d.code ? normaliseCode(d.code) : generateCode();
    if (!/^[A-Z0-9-]{4,40}$/.test(code)) {
      throw new HttpsError("invalid-argument", "Codes can use letters, numbers and hyphens (4 to 40 characters)");
    }

    const email = d.restrictedToEmail ? String(d.restrictedToEmail).trim().toLowerCase() : null;
    const voucher = {
      code,
      tier: d.tier,
      mode,
      until: until ? Timestamp.fromDate(until) : null,
      days,
      maxRedemptions,
      redemptionCount: 0,
      codeExpiresAt: d.codeExpiresAt ? Timestamp.fromDate(parseUntil(d.codeExpiresAt)) : null,
      restrictedToEmail: email,
      campaign: String(d.campaign || "").slice(0, 80),
      note: String(d.note || "").slice(0, 200),
      active: true,
      clientRedeemable: false, // see header: flip to true (with a client-facing callable) to let clients redeem
      createdBy: adminUid,
      createdAt: FieldValue.serverTimestamp(),
    };

    try {
      await db.collection("vouchers").doc(code).create(voucher);
    } catch (error) {
      if (error.code === 6 || /already exists/i.test(error.message)) {
        throw new HttpsError("already-exists", `The code ${code} already exists`);
      }
      throw error;
    }
    return { success: true, code };
  });

  const setVoucherActive = onCall(async (request) => {
    await requireAdmin(request);
    const code = normaliseCode((request.data || {}).code);
    const active = !!(request.data || {}).active;
    const ref = db.collection("vouchers").doc(code);
    if (!(await ref.get()).exists) throw new HttpsError("not-found", "Voucher not found");
    await ref.update({ active });
    return { success: true };
  });

  /** Voucher on a client who is NOT paying: complimentary access, extending any time they already have. */
  const applyVoucherComplimentary = async (uid, userData, voucher, redeemedBy) => {
    const sub = userData.subscription || {};
    const existingUntil = isComplimentaryActive(sub) ? toDate(sub.complimentary.until) : null;

    let until;
    if (voucher.mode === "until") {
      until = toDate(voucher.until);
      if (existingUntil && existingUntil > until) until = existingUntil; // never shorten
    } else {
      until = new Date((existingUntil || new Date()).getTime() + voucher.days * DAY_MS);
    }

    // Keep the better tier if they already have a higher one
    const existingTier = existingUntil ? sub.tier : "free";
    const tier = (TIER_RANK[existingTier] || 0) > (TIER_RANK[voucher.tier] || 0) ? existingTier : voucher.tier;

    await applyUserGrant(uid, userData, {
      tier,
      until,
      reason: voucher.campaign || voucher.note || `Voucher ${voucher.code}`,
      grantedBy: redeemedBy,
      voucherCode: voucher.code,
    });
    return { method: "complimentary", tier, until };
  };

  /** Voucher on a paying client: 100%-off Stripe coupon covering the next N invoices. Extends any earlier voucher. */
  const applyVoucherStripe = async (uid, userData, voucher, redeemedBy) => {
    if (!stripe) throw new HttpsError("failed-precondition", "Stripe is not configured");
    const sub = userData.subscription;

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    // The current period is already paid for: free months start from its end
    const periodEnd = new Date(stripeSub.current_period_end * 1000);

    // Free months still to come from an earlier voucher
    const earlierUntil = sub.voucher?.mode === "stripe_coupon" ? toDate(sub.voucher.until) : null;
    const remaining = earlierUntil && earlierUntil > periodEnd ? Math.round((earlierUntil - periodEnd) / MONTH_MS) : 0;

    let months;
    if (voucher.mode === "until") {
      months = Math.ceil((toDate(voucher.until) - periodEnd) / MONTH_MS);
      if (months <= remaining) {
        throw new HttpsError("failed-precondition", "This client's billing is already free beyond that date");
      }
    } else {
      months = remaining + Math.ceil(voucher.days / 30);
    }
    if (months > 24) throw new HttpsError("invalid-argument", "That is more than 24 free months");

    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "repeating",
      duration_in_months: months,
      name: `Voucher ${voucher.code}`,
      max_redemptions: 1,
      metadata: { voucher: voucher.code, firebaseUid: uid, redeemedBy },
    });
    // Setting discounts replaces any earlier voucher coupon, which the new (longer) one already includes
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { discounts: [{ coupon: coupon.id }] });

    const until = addMonths(periodEnd, months);
    await db.collection("users").doc(uid).update({
      "subscription.voucher": {
        code: voucher.code,
        mode: "stripe_coupon",
        appliedAt: Timestamp.now(),
        until: Timestamp.fromDate(until),
        months,
        stripeCouponId: coupon.id,
      },
      "subscription.updatedAt": FieldValue.serverTimestamp(),
    });
    await logEvent(uid, "voucher_applied", {
      newTier: sub.tier,
      metadata: { code: voucher.code, method: "stripe_coupon", months, until: until.toISOString(), redeemedBy },
    });
    return { method: "stripe_coupon", tier: sub.tier, until };
  };

  /**
   * The one place a voucher is applied to a client.
   * @param {{code: string, uid: string, redeemedBy: string, byAdmin: boolean}} args
   */
  const redeemVoucherCore = async ({ code, uid, redeemedBy, byAdmin }) => {
    const voucherRef = db.collection("vouchers").doc(code);
    const redemptionRef = voucherRef.collection("redemptions").doc(uid);

    const [voucherDoc, userDoc] = await Promise.all([voucherRef.get(), db.collection("users").doc(uid).get()]);
    if (!voucherDoc.exists) throw new HttpsError("not-found", "That voucher code was not found");
    if (!userDoc.exists) throw new HttpsError("not-found", "Client not found");
    const voucher = voucherDoc.data();
    const userData = userDoc.data();

    if (!voucher.active) throw new HttpsError("failed-precondition", "This voucher has been deactivated");
    const codeExpires = toDate(voucher.codeExpiresAt);
    if (codeExpires && codeExpires <= new Date()) throw new HttpsError("failed-precondition", "This voucher code has expired");
    if (voucher.mode === "until" && toDate(voucher.until) <= new Date()) {
      throw new HttpsError("failed-precondition", "This voucher's free period has already ended");
    }
    if (!byAdmin && !voucher.clientRedeemable) {
      throw new HttpsError("permission-denied", "This voucher can only be applied by an admin");
    }
    if (voucher.restrictedToEmail && voucher.restrictedToEmail !== String(userData.email || "").toLowerCase()) {
      throw new HttpsError("failed-precondition", `This voucher is reserved for ${voucher.restrictedToEmail}`);
    }
    if (!GRANTABLE_ROLES.includes(userData.role)) {
      throw new HttpsError("failed-precondition", "Vouchers are for client accounts only");
    }
    if (userData.subscription?.managedSeat) {
      throw new HttpsError("failed-precondition", "This client's access is managed by an agency seat");
    }

    // Reserve a redemption first, so two admins (or a double click) can't both use the last one
    await db.runTransaction(async (t) => {
      const [v, r] = await Promise.all([t.get(voucherRef), t.get(redemptionRef)]);
      if (r.exists) throw new HttpsError("already-exists", "This client has already used this voucher");
      const max = v.data().maxRedemptions;
      if (max !== null && max !== undefined && v.data().redemptionCount >= max) {
        throw new HttpsError("resource-exhausted", "This voucher has been fully redeemed");
      }
      t.update(voucherRef, { redemptionCount: FieldValue.increment(1) });
      t.set(redemptionRef, { userId: uid, redeemedBy, byAdmin, redeemedAt: Timestamp.now(), status: "pending" });
    });

    try {
      const result = hasPaidStripeSubscription(userData.subscription)
        ? await applyVoucherStripe(uid, userData, voucher, redeemedBy)
        : await applyVoucherComplimentary(uid, userData, voucher, redeemedBy);

      await redemptionRef.update({
        status: "applied",
        method: result.method,
        tier: result.tier,
        benefitUntil: Timestamp.fromDate(result.until),
      });
      return result;
    } catch (error) {
      // Give the redemption back so the voucher isn't used up by a failure
      await redemptionRef.delete().catch(() => {});
      await voucherRef.update({ redemptionCount: FieldValue.increment(-1) }).catch(() => {});
      throw error;
    }
  };

  const redeemVoucher = onCall(async (request) => {
    const adminUid = await requireAdmin(request);
    const { userId } = request.data || {};
    const code = normaliseCode((request.data || {}).code);
    if (!code || !userId) throw new HttpsError("invalid-argument", "code and userId are required");

    const result = await redeemVoucherCore({ code, uid: userId, redeemedBy: adminUid, byAdmin: true });
    return { success: true, method: result.method, tier: result.tier, until: result.until.toISOString() };
  });

  /** Take a voucher back off a client (an admin mistake or a changed mind). Gives the redemption back to the voucher. */
  const removeVoucherFromUser = onCall(async (request) => {
    const adminUid = await requireAdmin(request);
    const { userId } = request.data || {};
    if (!userId) throw new HttpsError("invalid-argument", "userId is required");

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) throw new HttpsError("not-found", "User not found");
    const userData = userDoc.data();
    const voucher = userData.subscription?.voucher;
    if (!voucher?.code) throw new HttpsError("failed-precondition", "This client has no voucher");

    if (voucher.mode === "stripe_coupon") {
      if (stripe && userData.subscription.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.deleteDiscount(userData.subscription.stripeSubscriptionId);
        } catch (error) {
          // Already gone (e.g. the coupon ran out) is fine
          if (error.code !== "resource_missing") throw error;
        }
      }
      await userDoc.ref.update({
        "subscription.voucher": FieldValue.delete(),
        "subscription.updatedAt": FieldValue.serverTimestamp(),
      });
      await logEvent(userId, "voucher_removed", { metadata: { code: voucher.code, method: "stripe_coupon", removedBy: adminUid } });
    } else {
      await revertUserToFree(userId, userData, "voucher_removed", {
        metadata: { code: voucher.code, method: "complimentary", removedBy: adminUid },
      });
    }

    const voucherRef = db.collection("vouchers").doc(voucher.code);
    const redemptionRef = voucherRef.collection("redemptions").doc(userId);
    if ((await redemptionRef.get()).exists) {
      await redemptionRef.delete();
      await voucherRef.update({ redemptionCount: FieldValue.increment(-1) }).catch(() => {});
    }
    return { success: true };
  });

  // --------------------------------------------------------------------------
  // Organisation
  // --------------------------------------------------------------------------

  const getOrgMembers = async (organisationId) => {
    const snap = await db.collection("users").where("organisationId", "==", organisationId).get();
    return snap.docs.filter((d) => GRANTABLE_ROLES.includes(d.data().role));
  };

  const grantComplimentaryOrganisation = onCall({ timeoutSeconds: 300 }, async (request) => {
    const adminUid = await requireAdmin(request);
    const { organisationId, tier, until, reason } = request.data || {};
    if (!organisationId) throw new HttpsError("invalid-argument", "organisationId is required");
    const subscriptionTier = ORG_TIER_TO_SUBSCRIPTION_TIER[tier];
    if (!subscriptionTier) {
      throw new HttpsError("invalid-argument", "Choose a paid organisation tier: starter, professional, enterprise or agency");
    }
    const untilDate = parseUntil(until);

    const orgRef = db.collection("organisations").doc(organisationId);
    const orgDoc = await orgRef.get();
    if (!orgDoc.exists) throw new HttpsError("not-found", "Organisation not found");
    const org = orgDoc.data();

    // Licence limit follows the tier default, as it does when an admin changes tier by hand
    const tierDoc = await db.collection("pricingTiers").doc(tier).get();
    const defaultLicences = tierDoc.exists ? tierDoc.data().defaultLicences : undefined;

    // Remember what to put back. Don't overwrite it if the organisation is already on a grant (re-grant / change tier).
    const alreadyGranted = !!org.noCharge?.enabled;
    const orgUpdate = {
      tier,
      noCharge: {
        enabled: true,
        until: Timestamp.fromDate(untilDate),
        reason: reason || "",
        grantedBy: adminUid,
        grantedAt: Timestamp.now(),
        previousTier: alreadyGranted ? org.noCharge.previousTier ?? null : org.tier || null,
        previousLicenceLimit: alreadyGranted ? org.noCharge.previousLicenceLimit ?? null : org.licenceLimit ?? null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof defaultLicences === "number" && defaultLicences > (org.licenceLimit || 0)) {
      orgUpdate.licenceLimit = defaultLicences;
    }
    await orgRef.update(orgUpdate);

    // Members get the same benefits. Anyone already paying (or in an agency seat) is skipped and reported.
    const granted = [];
    const skipped = [];
    for (const memberDoc of await getOrgMembers(organisationId)) {
      try {
        await applyUserGrant(memberDoc.id, memberDoc.data(), {
          tier: subscriptionTier,
          until: untilDate,
          reason,
          grantedBy: adminUid,
          organisationId,
        });
        granted.push(memberDoc.id);
      } catch (error) {
        if (!(error instanceof HttpsError)) throw error;
        const d = memberDoc.data();
        skipped.push({ uid: memberDoc.id, name: `${d.firstName || ""} ${d.lastName || ""}`.trim(), reason: error.message });
      }
    }

    return { success: true, granted: granted.length, skipped, until: untilDate.toISOString() };
  });

  const revokeComplimentaryOrganisation = onCall({ timeoutSeconds: 300 }, async (request) => {
    await requireAdmin(request);
    const { organisationId } = request.data || {};
    if (!organisationId) throw new HttpsError("invalid-argument", "organisationId is required");

    const orgRef = db.collection("organisations").doc(organisationId);
    const orgDoc = await orgRef.get();
    if (!orgDoc.exists) throw new HttpsError("not-found", "Organisation not found");
    if (!orgDoc.data().noCharge?.enabled) {
      throw new HttpsError("failed-precondition", "This organisation does not have no-charge access");
    }

    await endOrganisationGrant(orgRef, orgDoc.data(), "complimentary_revoked");
    return { success: true };
  });

  /** Restore the organisation's previous tier and release every member that was granted through it. */
  const endOrganisationGrant = async (orgRef, org, eventType) => {
    const previous = org.noCharge || {};
    const update = {
      noCharge: { ...previous, enabled: false, endedAt: Timestamp.now() },
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (previous.previousTier) update.tier = previous.previousTier;
    if (typeof previous.previousLicenceLimit === "number") update.licenceLimit = previous.previousLicenceLimit;
    await orgRef.update(update);

    for (const memberDoc of await getOrgMembers(orgRef.id)) {
      const c = memberDoc.data().subscription?.complimentary;
      if (c?.enabled && c.organisationId === orgRef.id) {
        await revertUserToFree(memberDoc.id, memberDoc.data(), eventType, { metadata: { organisationId: orgRef.id } });
      }
    }
  };

  // --------------------------------------------------------------------------
  // Bulk: extend the offer
  // --------------------------------------------------------------------------

  const extendComplimentaryAccess = onCall({ timeoutSeconds: 540 }, async (request) => {
    const adminUid = await requireAdmin(request);
    const untilDate = parseUntil((request.data || {}).until);
    const untilTs = Timestamp.fromDate(untilDate);

    let users = 0;
    const userSnap = await db.collection("users").where("subscription.complimentary.enabled", "==", true).get();
    for (const userDoc of userSnap.docs) {
      const c = userDoc.data().subscription.complimentary;
      const current = toDate(c.until);
      if (current && current >= untilDate) continue; // only ever extend, never shorten
      const update = {
        "subscription.complimentary.until": untilTs,
        "subscription.complimentary.warningSentAt": null,
        "subscription.currentPeriodEnd": untilTs,
        "subscription.updatedAt": FieldValue.serverTimestamp(),
      };
      // Keep the voucher's displayed end date in step (a dotted path would otherwise create a partial map)
      if (userDoc.data().subscription.voucher) update["subscription.voucher.until"] = untilTs;
      await userDoc.ref.update(update);
      await logEvent(userDoc.id, "complimentary_extended", { metadata: { until: untilDate.toISOString(), by: adminUid } });
      users++;
    }

    let organisations = 0;
    const orgSnap = await db.collection("organisations").where("noCharge.enabled", "==", true).get();
    for (const orgDoc of orgSnap.docs) {
      const current = toDate(orgDoc.data().noCharge.until);
      if (current && current >= untilDate) continue;
      await orgDoc.ref.update({ "noCharge.until": untilTs, updatedAt: FieldValue.serverTimestamp() });
      organisations++;
    }

    return { success: true, users, organisations, until: untilDate.toISOString() };
  });

  // --------------------------------------------------------------------------
  // Daily: warn 30 days out, then end the grant
  // --------------------------------------------------------------------------

  const notify = async (uid, userData, { type, title, message, subject, html }) => {
    await db.collection("users").doc(uid).collection("notifications").add({
      type,
      title,
      message,
      data: { link: "/account/billing" },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    try {
      // Lazy require: send.js configures SendGrid at load time
      const { sendToUser } = require("./email/send");
      await sendToUser(db, { uid, userData, subject, html, text: message, kind: "service", categories: ["complimentary"] });
    } catch (error) {
      console.error(`Complimentary email failed for ${uid}:`, error.message);
    }
  };

  const formatDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const siteUrl = () => process.env.WEBSITE_URL || "https://themodel.cloud";

  const processComplimentaryExpiry = onSchedule(
    { schedule: "0 2 * * *", timeZone: "Europe/London", retryCount: 3, timeoutSeconds: 540 },
    async () => {
      const now = new Date();
      const warnBefore = new Date(now.getTime() + WARNING_DAYS * DAY_MS);
      let warned = 0;
      let ended = 0;

      const userSnap = await db.collection("users").where("subscription.complimentary.enabled", "==", true).get();
      for (const userDoc of userSnap.docs) {
        const userData = userDoc.data();
        const c = userData.subscription.complimentary;
        const until = toDate(c.until);
        if (!until) continue;
        const tierName = SUBSCRIPTION_TIERS[userData.subscription.tier]?.name || userData.subscription.tier;

        if (until <= now) {
          await revertUserToFree(userDoc.id, userData, "complimentary_expired");
          await notify(userDoc.id, userData, {
            type: "complimentary_expired",
            title: "Your complimentary plan has ended",
            message: `Your complimentary ${tierName} plan has ended and your account is now on the Free plan. Choose a plan to keep your benefits.`,
            subject: "Your complimentary Model Cloud plan has ended",
            html: `<p>Hi ${userData.firstName || "there"},</p>
              <p>Your complimentary <strong>${tierName}</strong> plan ended on ${formatDate(until)}, and your account is now on the Free plan.</p>
              <p>Your profile, jobs and history are all still there. To keep your ${tierName} benefits, <a href="${siteUrl()}/pricing">choose a plan</a>.</p>`,
          });
          ended++;
        } else if (until <= warnBefore && !c.warningSentAt) {
          await userDoc.ref.update({ "subscription.complimentary.warningSentAt": Timestamp.now() });
          await notify(userDoc.id, userData, {
            type: "complimentary_ending",
            title: "Your complimentary plan ends soon",
            message: `Your complimentary ${tierName} plan ends on ${formatDate(until)}. Choose a plan to keep your benefits.`,
            subject: "Your complimentary Model Cloud plan ends soon",
            html: `<p>Hi ${userData.firstName || "there"},</p>
              <p>Your complimentary <strong>${tierName}</strong> plan ends on <strong>${formatDate(until)}</strong>, after which your account moves to the Free plan.</p>
              <p>To keep your ${tierName} benefits, <a href="${siteUrl()}/pricing">choose a plan</a> before then. Nothing will be charged unless you do.</p>`,
          });
          warned++;
        }
      }

      // Organisations: members were handled above; this restores the organisation's own tier and licence limit
      const orgSnap = await db.collection("organisations").where("noCharge.enabled", "==", true).get();
      for (const orgDoc of orgSnap.docs) {
        const until = toDate(orgDoc.data().noCharge.until);
        if (until && until <= now) {
          await endOrganisationGrant(orgDoc.ref, orgDoc.data(), "complimentary_expired");
        }
      }

      console.log(`Complimentary expiry: ${warned} warned, ${ended} ended.`);
    }
  );

  return {
    createVoucher,
    setVoucherActive,
    redeemVoucher,
    removeVoucherFromUser,
    grantComplimentaryOrganisation,
    revokeComplimentaryOrganisation,
    extendComplimentaryAccess,
    processComplimentaryExpiry,
  };
};

module.exports.isComplimentaryActive = isComplimentaryActive;
module.exports.hasPaidStripeSubscription = hasPaidStripeSubscription;
