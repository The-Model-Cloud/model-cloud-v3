const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { verifyToken } = require("./tokens");
const {
  CONSENT_STATUS,
  LEGACY_CUTOFF,
  MARKETING_PREFERENCE_KEYS,
  optIn,
  optOut,
  setMarketingPreference,
  setAllNotificationSettings,
  buildConsent,
} = require("./consent");
const { sendToUser, preferencesUrl, escapeHtml } = require("./send");

const db = () => admin.firestore();

const requireSuperAdmin = async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const caller = await db().collection("users").doc(request.auth.uid).get();
  if (caller.data()?.role !== "super admin") {
    throw new HttpsError("permission-denied", "Super admin access required.");
  }
  return caller;
};

const loadUserFromToken = async (token) => {
  const payload = verifyToken(token);
  if (!payload?.u) throw new HttpsError("invalid-argument", "This link is invalid.");
  const snap = await db().collection("users").doc(payload.u).get();
  if (!snap.exists) throw new HttpsError("not-found", "This account no longer exists.");
  return { uid: snap.id, data: snap.data() };
};

/**
 * Public (no login) preferences endpoint used by /email-preferences.
 * actions: status | opt_in | opt_out. State changes only happen on an explicit action call,
 * never on page load, so email link scanners cannot opt anyone in or out.
 */
exports.emailPreferences = onCall({ cors: true }, async (request) => {
  const { token, action, intent } = request.data || {};
  const { uid, data } = await loadUserFromToken(token);

  // `intent` is the `a` param of the email link; it only selects which audit-trail source is recorded.
  if (action === "opt_in") {
    await optIn(db(), uid, data.email, intent === "optin" ? "migration-email" : "preferences-page");
  } else if (action === "opt_out") {
    await optOut(db(), uid, data.email, intent === "unsubscribe" ? "unsubscribe-link" : "preferences-page");
  } else if (action !== "status") {
    throw new HttpsError("invalid-argument", "Unknown action.");
  }

  const fresh = action === "status" ? data : (await db().collection("users").doc(uid).get()).data();
  return {
    firstName: fresh.firstName || "",
    email: fresh.email || "",
    consentStatus: fresh.marketingConsent?.status || CONSENT_STATUS.NOT_OPTED_IN,
  };
});

/**
 * Signed-in users managing their own email preferences from the Settings page.
 *
 * data: { action: "set_marketing_pref", key, value }   soft opt-in/out of one marketing category
 *       { action: "unsubscribe_all" }                  stop all marketing + notification emails
 *       { action: "subscribe_all" }                    turn everything back on
 * Essential account emails (password resets, payments, security) are never affected.
 */
exports.updateMyEmailPreferences = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;
  const snap = await db().collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpsError("not-found", "Account not found.");
  const userData = snap.data();
  const { action, key, value } = request.data || {};

  if (action === "set_marketing_pref") {
    if (!MARKETING_PREFERENCE_KEYS.includes(key) || typeof value !== "boolean") {
      throw new HttpsError("invalid-argument", "Invalid preference.");
    }
    await setMarketingPreference(db(), uid, userData, key, value);
  } else if (action === "unsubscribe_all") {
    await optOut(db(), uid, userData.email, "settings-page");
    await setAllNotificationSettings(db(), uid, false);
  } else if (action === "subscribe_all") {
    await optIn(db(), uid, userData.email, "settings-page");
    await setAllNotificationSettings(db(), uid, true);
  } else {
    throw new HttpsError("invalid-argument", "Unknown action.");
  }

  const fresh = (await db().collection("users").doc(uid).get()).data();
  return {
    success: true,
    consentStatus: fresh.marketingConsent?.status || CONSENT_STATUS.NOT_OPTED_IN,
    marketingPreferences: fresh.marketingPreferences || {},
    notificationSettings: fresh.notificationSettings || {},
  };
});

// createdAt is stored inconsistently: ISO string, Firestore Timestamp, or missing.
const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Super admin only. Tags existing users who have no marketingConsent yet:
 *   created before 1 March 2026 (or creation date unknown) -> { unconfirmed, legacy-migration }
 *   created on/after that date                             -> left alone (they get consent at sign-up)
 * Never overwrites an existing marketingConsent. Defaults to a dry run.
 */
exports.backfillMarketingConsent = onCall({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
  await requireSuperAdmin(request);
  const { dryRun = true } = request.data || {};

  const snap = await db().collection("users").get();
  const counts = { totalUsers: snap.size, alreadyHasConsent: 0, noEmail: 0, postCutoff: 0, tagLegacy: 0, byRole: {} };

  const needsConsent = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.marketingConsent) counts.alreadyHasConsent += 1;
    else if (!data.email) counts.noEmail += 1;
    else needsConsent.push({ ref: doc.ref, uid: doc.id, role: data.role || "unknown", created: toDate(data.createdAt) });
  }

  // For users with no usable createdAt, fall back to the Firebase Auth creation time (100 per call).
  const unknownDate = needsConsent.filter((u) => !u.created);
  for (let i = 0; i < unknownDate.length; i += 100) {
    const chunk = unknownDate.slice(i, i + 100);
    const result = await admin.auth().getUsers(chunk.map((u) => ({ uid: u.uid })));
    const byUid = new Map(result.users.map((u) => [u.uid, toDate(u.metadata.creationTime)]));
    chunk.forEach((u) => { u.created = byUid.get(u.uid) || null; });
  }

  const toTag = [];
  for (const u of needsConsent) {
    // Unknown creation date: cannot prove they signed up on the new platform, so treat as legacy.
    if (u.created && u.created >= LEGACY_CUTOFF) {
      counts.postCutoff += 1;
    } else {
      counts.tagLegacy += 1;
      counts.byRole[u.role] = (counts.byRole[u.role] || 0) + 1;
      toTag.push(u.ref);
    }
  }

  if (dryRun) return { dryRun: true, ...counts };

  for (let i = 0; i < toTag.length; i += 400) {
    const batch = db().batch();
    toTag.slice(i, i + 400).forEach((ref) => {
      batch.update(ref, { marketingConsent: buildConsent(CONSENT_STATUS.UNCONFIRMED, "legacy-migration") });
    });
    await batch.commit();
  }
  return { dryRun: false, ...counts, written: toTag.length };
});

/**
 * RFC 8058 one-click unsubscribe (mail clients POST here from their "Unsubscribe" button).
 * A plain GET is deliberately a no-op so link scanners cannot unsubscribe people.
 */
exports.emailOneClickUnsubscribe = onRequest({ region: "europe-west2", cors: false }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Use the unsubscribe link in the email to manage your preferences.");
    return;
  }
  try {
    const { uid, data } = await loadUserFromToken(req.query.t);
    await optOut(db(), uid, data.email, "unsubscribe-link");
    res.status(200).send("Unsubscribed");
  } catch (error) {
    res.status(400).send("Invalid unsubscribe request");
  }
});

// ---------------------------------------------------------------------------
// Migration service email ("Continue Opt-In")
// ---------------------------------------------------------------------------

// Audience groups for the migration send. Admins are never included.
const AUDIENCE_ROLES = {
  models: ["model"],
  clients: ["client", "account manager"],
};
AUDIENCE_ROLES.all = [...AUDIENCE_ROLES.models, ...AUDIENCE_ROLES.clients];

const migrationEmail = (firstName, optInUrl, prefsUrl) => {
  const name = escapeHtml(firstName || "there");
  return {
    subject: "You've moved to the new Model Cloud",
    text:
      `Hi ${firstName || "there"},\n\n` +
      "Your account has moved to the new Model Cloud platform. Your profile and data came with you.\n\n" +
      "We'd like to keep you up to date with news, launches and product updates. " +
      "We only do that with your permission. To carry on hearing from us, confirm here:\n" +
      `${optInUrl}\n\n` +
      "If you'd rather not receive marketing email, you don't need to do anything. " +
      "You can manage your preferences or delete your account at any time:\n" +
      `${prefsUrl}\n`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;line-height:1.6;">
        <h2 style="color:#111;">You've moved to the new Model Cloud</h2>
        <p>Hi ${name},</p>
        <p>Your account has moved to the new Model Cloud platform. Your profile and data came with you.</p>
        <p>We'd like to keep you up to date with news, launches and product updates. We only do that with your permission, so if you'd like to carry on hearing from us, please confirm below.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${optInUrl}" style="background:#111;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Continue Opt-In</a>
        </p>
        <p>If you'd rather not receive marketing email, you don't need to do anything. You can manage your preferences or delete your account at any time from <a href="${prefsUrl}">your email preferences</a>.</p>
      </div>`,
  };
};

/**
 * Super admin only. Sends the one-off migration service email to legacy users who have not
 * yet confirmed consent. Defaults to a dry run. Safe to re-run: users already emailed are skipped.
 *
 * data: { dryRun = true, limit = 100, audience = "all"|"models"|"clients", afterUid?: string,
 *         testEmail?: string, onlyEmail?: string }
 *   audience  - which group to email. Clients includes account managers. Admins are never included.
 *   afterUid  - cursor for batched sends: only users with a document ID after this are considered.
 *   testEmail - send a single sample to this address using the caller's own account instead.
 *   onlyEmail - send only to the user registered with this email (ignores the legacy/already-sent filters).
 */
exports.sendMigrationOptInEmails = onCall({ timeoutSeconds: 540 }, async (request) => {
  const caller = await requireSuperAdmin(request);

  const { dryRun = true, limit = 100, testEmail, onlyEmail, audience = "all", afterUid = "" } = request.data || {};
  if (!AUDIENCE_ROLES[audience]) throw new HttpsError("invalid-argument", "Unknown audience.");
  const max = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

  if (testEmail) {
    const userData = { ...caller.data(), email: testEmail };
    const mail = migrationEmail(
      userData.firstName,
      preferencesUrl(caller.id, "&a=optin"),
      preferencesUrl(caller.id)
    );
    const result = await sendToUser(db(), { uid: caller.id, userData, ...mail, kind: "service", categories: ["migration-optin-test"] });
    return { test: true, ...result };
  }

  let snapDocs;
  let pending;
  let notYetEmailed = [];
  if (onlyEmail) {
    // Single explicit target: bypasses the legacy/unconfirmed/already-emailed filters so it can be
    // re-sent for testing. Email casing in Firestore isn't guaranteed, so try both forms.
    const wanted = String(onlyEmail).trim();
    const variants = [...new Set([wanted, wanted.toLowerCase()])];
    const found = await db().collection("users").where("email", "in", variants).get();
    if (found.empty) throw new HttpsError("not-found", `No user with email ${wanted}.`);
    snapDocs = found.docs;
    pending = found.docs;
  } else {
    const snap = await db()
      .collection("users")
      .where("marketingConsent.source", "==", "legacy-migration")
      .where("marketingConsent.status", "==", CONSENT_STATUS.UNCONFIRMED)
      .get();
    snapDocs = snap.docs;
    notYetEmailed = snap.docs.filter((doc) => !doc.data().migrationOptInEmailSentAt);
    pending = notYetEmailed
      .filter((doc) => AUDIENCE_ROLES[audience].includes(doc.data().role) && doc.id > afterUid)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  }
  const batch = pending.slice(0, max);

  if (dryRun) {
    return {
      dryRun: true,
      onlyEmail: onlyEmail || null,
      totalLegacyUnconfirmed: snapDocs.length,
      alreadyEmailed: onlyEmail ? 0 : snapDocs.length - notYetEmailed.length,
      audienceTotal: pending.length, // everyone in the chosen audience still to email (all batches)
      wouldSendNow: batch.length, // just the first batch
      remainingAfterThisBatch: pending.length - batch.length,
      audience,
      // Counts of users not yet emailed, per group, so the UI can show them before anything is sent
      pendingByAudience: {
        models: notYetEmailed.filter((d) => AUDIENCE_ROLES.models.includes(d.data().role)).length,
        clients: notYetEmailed.filter((d) => AUDIENCE_ROLES.clients.includes(d.data().role)).length,
      },
      ...(onlyEmail && {
        targets: batch.map((d) => ({ uid: d.id, email: d.data().email, consent: d.data().marketingConsent || null })),
      }),
    };
  }

  const summary = { sent: 0, skipped: 0, failed: 0, skippedReasons: {} };
  for (const doc of batch) {
    const userData = doc.data();
    const mail = migrationEmail(
      userData.firstName,
      preferencesUrl(doc.id, "&a=optin"),
      preferencesUrl(doc.id)
    );
    const result = await sendToUser(db(), { uid: doc.id, userData, ...mail, kind: "service", categories: ["migration-optin"] });
    if (result.sent) {
      await doc.ref.update({ migrationOptInEmailSentAt: admin.firestore.FieldValue.serverTimestamp() });
      summary.sent += 1;
    } else if (result.reason === "sendgrid_error") {
      summary.failed += 1;
    } else {
      summary.skipped += 1;
      summary.skippedReasons[result.reason] = (summary.skippedReasons[result.reason] || 0) + 1;
    }
  }
  return {
    dryRun: false,
    ...summary,
    remaining: pending.length - batch.length,
    lastUid: batch.length ? batch[batch.length - 1].id : afterUid,
  };
});
