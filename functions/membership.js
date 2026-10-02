/**
 * Client membership: what a client sees and controls about their own account.
 *
 *  - Membership invoices: one every 30 days for every client, including £0 for free and no-charge accounts.
 *    Paying clients' invoices come from Stripe's subscription invoices (webhook); everyone else's from the
 *    daily scheduler. users/{uid}.membershipBilling.nextInvoiceAt anchors the 30-day cycle. See payments/invoices.js.
 *  - getMyMembership: plan, free time, voucher, renewal and upcoming payments in one call.
 *  - cancelMyMembership / resumeMyMembership: stop or restart membership billing (a paying client keeps their
 *    plan until the period they have paid for ends).
 *  - pauseMyAccount / reactivateMyAccount: reversible deactivation. Billing stops, open jobs close, marketing
 *    stops. Reactivating restores them. Permanent deletion is separate (accountDeletion.js).
 *  - exportMyData: everything we hold about the caller, as one JSON file.
 *
 * Browsers cannot write membershipBilling, accountStatus or the pause flags (firestore.rules).
 */

const { hasPaidStripeSubscription, isComplimentaryActive } = require("./complimentary");
const invoices = require("./payments/invoices");

const CLIENT_ROLES = ["client", "account manager"];
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MS = 30 * DAY_MS;
const ACTIVE_BOOKING_STATUSES = ["awarded", "in_progress"];
const EXPORT_MESSAGE_LIMIT = 5000;

const toDate = (value) => {
  if (!value) return null;
  const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
const iso = (value) => {
  const d = toDate(value);
  return d ? d.toISOString() : null;
};
const pad = (n) => String(n).padStart(2, "0");
const periodKey = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

module.exports = ({ admin, db, stripe, onCall, onSchedule, onDocumentCreated, HttpsError, SUBSCRIPTION_TIERS }) => {
  const { FieldValue, Timestamp } = admin.firestore;

  const tierName = (id) => (id === "free" ? "Free" : SUBSCRIPTION_TIERS[id]?.name || id);
  const tierPrice = (id) => SUBSCRIPTION_TIERS[id]?.price || 0;

  const logEvent = (userId, eventType, extra = {}) =>
    db.collection("subscriptionEvents").add({ userId, eventType, ...extra, createdAt: FieldValue.serverTimestamp() });

  /** Load the signed-in caller, who must be a client or account manager. */
  const requireClient = async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
    const ref = db.collection("users").doc(request.auth.uid);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Account not found");
    const user = snap.data();
    if (!CLIENT_ROLES.includes(user.role)) {
      throw new HttpsError("failed-precondition", "Membership is for client accounts");
    }
    return { uid: request.auth.uid, ref, user };
  };

  // --------------------------------------------------------------------------
  // Invoicing
  // --------------------------------------------------------------------------

  /** What the client is on right now, for invoice wording and the account page. */
  const describeMembership = (user) => {
    const sub = user.subscription || {};
    if (hasPaidStripeSubscription(sub)) {
      return { source: "stripe", tier: sub.tier || "starter", voucherCode: sub.voucher?.code || null };
    }
    if (isComplimentaryActive(sub)) {
      return { source: "no_charge", tier: sub.tier, voucherCode: sub.voucher?.code || null };
    }
    return { source: "free", tier: "free", voucherCode: null };
  };

  /** A £0 invoice for a client who is not being charged through Stripe (free or no-charge). */
  const issueFreeInvoice = async (uid, user, periodStart) => {
    const m = describeMembership(user);
    const name = tierName(m.tier);
    const price = tierPrice(m.tier);
    const lines =
      m.source === "no_charge" && price > 0
        ? [
            { description: `${name} membership (30 days)`, amount: price },
            { description: `No charge${m.voucherCode ? ` (voucher ${m.voucherCode})` : ""}`, amount: -price },
          ]
        : [{ description: "Free membership (30 days)", amount: 0 }];

    return invoices.createMembershipInvoice({
      id: `membership_${uid}_${periodKey(periodStart)}`,
      clientId: uid,
      client: user,
      tier: m.tier,
      tierName: name,
      source: m.source,
      lines,
      total: 0,
      periodStart,
      periodEnd: new Date(periodStart.getTime() + PERIOD_MS),
      voucherCode: m.voucherCode,
    });
  };

  /** First invoice and the start of the 30-day cycle. Does nothing if the cycle already started. */
  const startMembershipInvoicing = async (uid, user) => {
    if (user.membershipBilling?.nextInvoiceAt || user.accountStatus === "paused") return false;
    const now = new Date();
    // A client who already pays through Stripe gets Stripe's invoice, so only anchor the cycle
    let invoiceId = null;
    if (!hasPaidStripeSubscription(user.subscription)) invoiceId = await issueFreeInvoice(uid, user, now);
    await db.collection("users").doc(uid).update({
      "membershipBilling.nextInvoiceAt": Timestamp.fromDate(new Date(now.getTime() + PERIOD_MS)),
      "membershipBilling.startedAt": Timestamp.fromDate(now),
      ...(invoiceId ? { "membershipBilling.lastInvoiceId": invoiceId, "membershipBilling.lastInvoicedAt": Timestamp.fromDate(now) } : {}),
    });
    return true;
  };

  /** Daily: issue the invoice for every client whose 30 days are up. */
  const runMembershipInvoicing = async () => {
    const snap = await db.collection("users").where("membershipBilling.nextInvoiceAt", "<=", Timestamp.now()).get();
    let issued = 0;
    let skipped = 0;
    for (const doc of snap.docs) {
      const user = doc.data();
      if (!CLIENT_ROLES.includes(user.role)) continue;
      try {
        if (user.accountStatus === "paused") {
          // No invoices while paused; reactivating restarts the cycle
          await doc.ref.update({ "membershipBilling.nextInvoiceAt": FieldValue.delete() });
          skipped += 1;
          continue;
        }
        const due = toDate(user.membershipBilling.nextInvoiceAt);
        const update = { "membershipBilling.nextInvoiceAt": Timestamp.fromDate(new Date(due.getTime() + PERIOD_MS)) };
        if (hasPaidStripeSubscription(user.subscription)) {
          skipped += 1; // Stripe issues theirs; the webhook turns it into our invoice
        } else {
          update["membershipBilling.lastInvoiceId"] = await issueFreeInvoice(doc.id, user, due);
          update["membershipBilling.lastInvoicedAt"] = Timestamp.now();
          issued += 1;
        }
        await doc.ref.update(update);
      } catch (error) {
        console.error(`Membership invoicing failed for ${doc.id}:`, error.message);
      }
    }
    console.log(`Membership invoicing: ${issued} issued, ${skipped} skipped.`);
  };

  const issueMembershipInvoices = onSchedule(
    { schedule: "30 3 * * *", timeZone: "Europe/London", retryCount: 2, timeoutSeconds: 540 },
    runMembershipInvoicing
  );

  /** A new client gets their first invoice straight away and the 30-day cycle starts. */
  const startMembershipOnSignup = onDocumentCreated("users/{userId}", async (event) => {
    const user = event.data?.data();
    if (!user || !CLIENT_ROLES.includes(user.role)) return;
    try {
      await startMembershipInvoicing(event.params.userId, user);
    } catch (error) {
      console.error(`startMembershipOnSignup failed for ${event.params.userId}:`, error.message);
    }
  });

  /** Super admin: start the cycle (and issue the first invoice) for clients that existed before this feature. */
  const adminStartMembershipInvoicing = onCall({ timeoutSeconds: 540 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
    const caller = await db.collection("users").doc(request.auth.uid).get();
    if (caller.data()?.role !== "super admin") throw new HttpsError("permission-denied", "Super admin access required");

    const { dryRun = true } = request.data || {};
    const snap = await db.collection("users").where("role", "in", CLIENT_ROLES).get();
    const pending = snap.docs.filter((d) => !d.data().membershipBilling?.nextInvoiceAt && d.data().accountStatus !== "paused");
    if (dryRun) return { dryRun: true, clients: snap.size, toStart: pending.length };

    let started = 0;
    for (const doc of pending) {
      try {
        if (await startMembershipInvoicing(doc.id, doc.data())) started += 1;
      } catch (error) {
        console.error(`Backfill membership failed for ${doc.id}:`, error.message);
      }
    }
    return { dryRun: false, clients: snap.size, toStart: pending.length, started };
  });

  /** Called by the Stripe webhook when a subscription invoice is paid (including £0 invoices from a 100% coupon). */
  const createMembershipInvoiceFromStripe = async (uid, user, invoice) => {
    const sub = user.subscription || {};
    const line = invoice.lines?.data?.[0];
    // The invoice can reach us before the subscription webhook has updated the user, so read the tier from the invoice
    const priceId = line?.price?.id;
    const fromPrice = Object.entries(SUBSCRIPTION_TIERS).find(([, t]) => t.stripePriceId && t.stripePriceId === priceId)?.[0];
    const tier = fromPrice || invoice.subscription_details?.metadata?.tier || (sub.tier && sub.tier !== "free" ? sub.tier : "starter");
    const name = tierName(tier);
    const period = line?.period || { start: invoice.period_start, end: invoice.period_end };
    const periodStart = new Date(period.start * 1000);
    const periodEnd = new Date(period.end * 1000);
    const currency = String(invoice.currency || "gbp").toUpperCase();

    const subtotal = invoice.subtotal ?? invoice.total ?? 0;
    const total = invoice.total ?? 0;
    const lines = [{ description: line?.description || `${name} membership`, amount: subtotal }];
    if (subtotal !== total) {
      lines.push({ description: sub.voucher?.code ? `Voucher ${sub.voucher.code}` : "Discount", amount: total - subtotal });
    }

    const id = await invoices.createMembershipInvoice({
      id: `membership_stripe_${invoice.id}`,
      clientId: uid,
      client: user,
      tier,
      tierName: name,
      source: "stripe",
      lines,
      total,
      currency,
      periodStart,
      periodEnd,
      voucherCode: sub.voucher?.code || null,
      stripeInvoiceId: invoice.id,
      receiptUrl: invoice.hosted_invoice_url || null,
    });

    // Follow Stripe's cycle, so if they stop paying our own invoices carry on from the right date
    await db.collection("users").doc(uid).update({
      "membershipBilling.nextInvoiceAt": Timestamp.fromDate(periodEnd),
      "membershipBilling.lastInvoiceId": id,
      "membershipBilling.lastInvoicedAt": Timestamp.now(),
    });
    return id;
  };

  // --------------------------------------------------------------------------
  // The client's view
  // --------------------------------------------------------------------------

  const getMyMembership = onCall(async (request) => {
    let { uid, user } = await requireClient(request);

    // Clients that existed before invoicing started are picked up the first time they look
    if (!user.membershipBilling?.nextInvoiceAt && user.accountStatus !== "paused") {
      try {
        if (await startMembershipInvoicing(uid, user)) user = (await db.collection("users").doc(uid).get()).data();
      } catch (error) {
        console.error(`getMyMembership: could not start invoicing for ${uid}:`, error.message);
      }
    }

    const sub = user.subscription || {};
    const m = describeMembership(user);
    const paying = m.source === "stripe";
    const cancelAtPeriodEnd = !!sub.cancelAtPeriodEnd;
    const comp = isComplimentaryActive(sub) ? sub.complimentary : null;

    const billingKey = paying ? (sub.status === "past_due" ? "payment_failed" : "paying") : comp ? "no_charge" : "free";
    const upcoming = [];

    if (paying && !cancelAtPeriodEnd && stripe) {
      try {
        const next = await stripe.invoices.retrieveUpcoming({ subscription: sub.stripeSubscriptionId });
        upcoming.push({
          kind: "membership",
          date: iso((next.next_payment_attempt || next.period_end) * 1000),
          amount: next.amount_due,
          currency: String(next.currency || "gbp").toUpperCase(),
          description: `${tierName(m.tier)} membership renewal`,
        });
      } catch (error) {
        console.warn(`getMyMembership: no upcoming invoice for ${uid}:`, error.message);
      }
    } else if (!paying && user.membershipBilling?.nextInvoiceAt && user.accountStatus !== "paused") {
      upcoming.push({
        kind: "membership",
        date: iso(user.membershipBilling.nextInvoiceAt),
        amount: 0,
        currency: "GBP",
        description: `${tierName(m.tier)} membership invoice (no charge)`,
      });
    }

    return {
      success: true,
      accountStatus: user.accountStatus === "paused" ? "paused" : "active",
      pausedAt: iso(user.pausedAt),
      plan: {
        tier: m.tier,
        name: tierName(m.tier),
        priceMonthly: tierPrice(m.tier),
        billing: billingKey,
        status: sub.status || "active",
      },
      freeUntil: comp ? iso(comp.until) : sub.voucher?.mode === "stripe_coupon" ? iso(sub.voucher.until) : null,
      voucher: sub.voucher ? { code: sub.voucher.code, mode: sub.voucher.mode, until: iso(sub.voucher.until) } : null,
      renewsOn: paying ? iso(sub.currentPeriodEnd) : null,
      cancelAtPeriodEnd,
      canCancel: paying && !cancelAtPeriodEnd,
      canResume: paying && cancelAtPeriodEnd,
      nextInvoiceAt: iso(user.membershipBilling?.nextInvoiceAt),
      upcoming,
    };
  });

  // --------------------------------------------------------------------------
  // Stop / restart membership billing
  // --------------------------------------------------------------------------

  const setCancelAtPeriodEnd = async (request, cancel) => {
    const { uid, ref, user } = await requireClient(request);
    const sub = user.subscription || {};
    if (!hasPaidStripeSubscription(sub) || !stripe) {
      throw new HttpsError("failed-precondition", "You are not being charged for a membership, so there is nothing to change.");
    }
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: cancel });
    await ref.update({
      "subscription.cancelAtPeriodEnd": cancel,
      "subscription.updatedAt": FieldValue.serverTimestamp(),
      // A manual choice replaces whatever the pause flow did
      pausedCancelledSubscription: FieldValue.delete(),
    });
    await logEvent(uid, cancel ? "membership_cancel_requested" : "membership_resumed", { previousTier: sub.tier });
    return { success: true, endsOn: iso(sub.currentPeriodEnd) };
  };

  const cancelMyMembership = onCall((request) => setCancelAtPeriodEnd(request, true));
  const resumeMyMembership = onCall((request) => setCancelAtPeriodEnd(request, false));

  // --------------------------------------------------------------------------
  // Pause / reactivate the account
  // --------------------------------------------------------------------------

  const pauseMyAccount = onCall({ timeoutSeconds: 120 }, async (request) => {
    const { uid, ref, user } = await requireClient(request);
    if (user.accountStatus === "paused") return { success: true, alreadyPaused: true };

    // Models may have been booked: don't leave them stranded
    const bookedCounts = await Promise.all(
      ACTIVE_BOOKING_STATUSES.map(async (status) => (await db.collection("jobs").where("userId", "==", uid).where("status", "==", status).get()).size)
    );
    const booked = bookedCounts.reduce((a, b) => a + b, 0);
    if (booked > 0) {
      throw new HttpsError(
        "failed-precondition",
        `You have ${booked} active booking${booked === 1 ? "" : "s"}. Please complete or cancel ${booked === 1 ? "it" : "them"} before pausing your account.`
      );
    }

    // Stop membership billing at the end of the period they have paid for
    const update = {
      accountStatus: "paused",
      pausedAt: FieldValue.serverTimestamp(),
      "membershipBilling.nextInvoiceAt": FieldValue.delete(),
    };
    const sub = user.subscription || {};
    if (hasPaidStripeSubscription(sub) && stripe && !sub.cancelAtPeriodEnd) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
      update["subscription.cancelAtPeriodEnd"] = true;
      update.pausedCancelledSubscription = true; // so reactivating undoes only what the pause did
    }

    // Close open jobs, remembering which, so reactivating can reopen exactly those
    const open = await db.collection("jobs").where("userId", "==", uid).where("status", "==", "open").get();
    for (let i = 0; i < open.docs.length; i += 400) {
      const batch = db.batch();
      open.docs.slice(i, i + 400).forEach((d) =>
        batch.update(d.ref, { status: "closed", closedByPause: true, updatedAt: FieldValue.serverTimestamp() })
      );
      await batch.commit();
    }

    await ref.update(update);
    await logEvent(uid, "account_paused", { metadata: { jobsClosed: open.size } });
    return { success: true, jobsClosed: open.size };
  });

  const reactivateMyAccount = onCall({ timeoutSeconds: 120 }, async (request) => {
    const { uid, ref, user } = await requireClient(request);
    if (user.accountStatus !== "paused") return { success: true, alreadyActive: true };

    const update = {
      accountStatus: FieldValue.delete(),
      pausedAt: FieldValue.delete(),
      pausedCancelledSubscription: FieldValue.delete(),
      // Restart the cycle: the scheduler issues their next invoice on its next run
      "membershipBilling.nextInvoiceAt": Timestamp.now(),
    };
    const sub = user.subscription || {};
    if (user.pausedCancelledSubscription && hasPaidStripeSubscription(sub) && stripe && sub.cancelAtPeriodEnd) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
      update["subscription.cancelAtPeriodEnd"] = false;
    }

    const closed = await db.collection("jobs").where("userId", "==", uid).where("closedByPause", "==", true).get();
    for (let i = 0; i < closed.docs.length; i += 400) {
      const batch = db.batch();
      closed.docs.slice(i, i + 400).forEach((d) => {
        // Only reopen a job nobody has touched since the pause
        if (d.data().status === "closed") {
          batch.update(d.ref, { status: "open", closedByPause: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
        } else {
          batch.update(d.ref, { closedByPause: FieldValue.delete() });
        }
      });
      await batch.commit();
    }

    await ref.update(update);
    await logEvent(uid, "account_reactivated", { metadata: { jobsReopened: closed.size } });
    return { success: true, jobsReopened: closed.size };
  });

  // --------------------------------------------------------------------------
  // Data export
  // --------------------------------------------------------------------------

  /** Firestore values to plain JSON: Timestamps become ISO strings. */
  const serialise = (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(serialise);
    if (typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialise(v)]));
    }
    return value;
  };

  const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...serialise(d.data()) }));

  const exportMyData = onCall({ timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
    const uid = request.auth.uid;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError("not-found", "Account not found");
    const user = userSnap.data();

    const safe = async (fn) => {
      try {
        return await fn();
      } catch (error) {
        console.error(`exportMyData(${uid}) section failed:`, error.message);
        return { error: "This section could not be exported" };
      }
    };

    const [jobs, invoiceDocs, transactions, events, notifications, threads] = await Promise.all([
      safe(async () => docs(await db.collection("jobs").where("userId", "==", uid).get())),
      safe(async () => docs(await db.collection("invoices").where("clientId", "==", uid).get())),
      safe(async () => docs(await db.collection("transactions").where(user.role === "model" ? "modelId" : "clientId", "==", uid).get())),
      safe(async () => docs(await db.collection("subscriptionEvents").where("userId", "==", uid).get())),
      safe(async () => docs(await userRef.collection("notifications").limit(1000).get())),
      safe(async () => {
        const snap = await db.collection("threads").where("participants", "array-contains", uid).get();
        let remaining = EXPORT_MESSAGE_LIMIT;
        const out = [];
        for (const t of snap.docs) {
          const messages = remaining > 0 ? await t.ref.collection("messages").limit(remaining).get() : { docs: [] };
          remaining -= messages.docs.length;
          const sorted = docs(messages).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
          out.push({ id: t.id, ...serialise(t.data()), messages: sorted });
        }
        return { truncated: remaining <= 0, threads: out };
      }),
    ]);

    const payload = {
      about: "Everything The Model Cloud holds about your account, exported on request. Images are stored as links.",
      exportedAt: new Date().toISOString(),
      account: { id: uid, ...serialise(user) },
      jobs,
      invoices: invoiceDocs,
      transactions,
      membershipEvents: events,
      notifications,
      messages: threads,
    };

    await logEvent(uid, "data_exported");
    const json = JSON.stringify(payload, null, 2);
    return {
      success: true,
      filename: `model-cloud-data-${new Date().toISOString().slice(0, 10)}.json`,
      base64: Buffer.from(json, "utf-8").toString("base64"),
    };
  });

  return {
    functions: {
      issueMembershipInvoices,
      startMembershipOnSignup,
      adminStartMembershipInvoicing,
      getMyMembership,
      cancelMyMembership,
      resumeMyMembership,
      pauseMyAccount,
      reactivateMyAccount,
      exportMyData,
    },
    // Plain helpers (not Cloud Functions) for other modules, e.g. the Stripe webhook
    helpers: { createMembershipInvoiceFromStripe, runMembershipInvoicing },
  };
};
