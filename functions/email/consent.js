const crypto = require("crypto");
const admin = require("firebase-admin");

/**
 * Marketing consent model (UK GDPR / PECR).
 *
 * users/{uid}.marketingConsent = { status, source, date }
 *
 * status:
 *   unconfirmed   - migrated from the legacy system, no confirmed consent. NOT sendable.
 *   opted_in      - explicit consent. The only status campaigns may be sent to.
 *   not_opted_in  - signed up and did not tick the opt-in box. NOT sendable.
 *   opted_out     - withdrew consent. NOT sendable.
 *
 * source: legacy-migration | migration-email | signup | preferences-page | settings-page | unsubscribe-link | admin
 */

const CONSENT_STATUS = {
  UNCONFIRMED: "unconfirmed",
  OPTED_IN: "opted_in",
  NOT_OPTED_IN: "not_opted_in",
  OPTED_OUT: "opted_out",
};

// Accounts created on or after this date signed up on the new platform.
const LEGACY_CUTOFF = new Date("2026-03-01T00:00:00Z");

// Matches the keys used in users/{uid}.marketingPreferences (Settings page)
const MARKETING_PREFERENCE_KEYS = ["newLaunches", "productUpdates", "newsletter"];

// users/{uid}.notificationSettings keys (service emails; the default is on, "=== false" opts out)
const NOTIFICATION_KEYS = ["emailOnMessage", "emailOnJobMatch", "emailOnModelMatch", "emailOnJobApplication"];

const SUPPRESSION_REASONS = {
  UNSUBSCRIBE: "unsubscribe", // blocks marketing only
  BOUNCE: "bounce", // blocks all email
  SPAM_REPORT: "spam_report", // blocks all email
};

const buildConsent = (status, source) => ({
  status,
  source,
  date: admin.firestore.FieldValue.serverTimestamp(),
});

const canReceiveMarketing = (userData) =>
  userData?.marketingConsent?.status === CONSENT_STATUS.OPTED_IN;

const normaliseEmail = (email) => String(email || "").trim().toLowerCase();

const suppressionId = (email) =>
  crypto.createHash("sha256").update(normaliseEmail(email)).digest("hex");

const getSuppression = async (db, email) => {
  if (!email) return null;
  const snap = await db.collection("emailSuppressions").doc(suppressionId(email)).get();
  return snap.exists ? snap.data() : null;
};

const addSuppression = async (db, email, reason, extra = {}) => {
  await db.collection("emailSuppressions").doc(suppressionId(email)).set(
    {
      email: normaliseEmail(email),
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    },
    { merge: true }
  );
};

const removeSuppression = async (db, email, onlyReason) => {
  const ref = db.collection("emailSuppressions").doc(suppressionId(email));
  const snap = await ref.get();
  if (snap.exists && (!onlyReason || snap.data().reason === onlyReason)) {
    await ref.delete();
  }
};

/** Record explicit consent (e.g. clicking "Continue Opt-In"). */
const optIn = async (db, uid, email, source) => {
  const update = {
    marketingConsent: buildConsent(CONSENT_STATUS.OPTED_IN, source),
  };
  // Enable every marketing preference; the user can fine-tune these in Settings.
  MARKETING_PREFERENCE_KEYS.forEach((key) => {
    update[`marketingPreferences.${key}`] = true;
  });
  await db.collection("users").doc(uid).update(update);
  // Only lift an unsubscribe suppression; bounces and spam reports stay blocked.
  await removeSuppression(db, email, SUPPRESSION_REASONS.UNSUBSCRIBE);
};

/** Withdraw consent and stop all marketing email to this address. */
const optOut = async (db, uid, email, source) => {
  const update = {
    marketingConsent: buildConsent(CONSENT_STATUS.OPTED_OUT, source),
  };
  MARKETING_PREFERENCE_KEYS.forEach((key) => {
    update[`marketingPreferences.${key}`] = false;
  });
  await db.collection("users").doc(uid).update(update);
  // Keep a stronger existing suppression (bounce, spam report) rather than downgrading it to marketing-only
  const existing = await getSuppression(db, email);
  if (!existing || existing.reason === SUPPRESSION_REASONS.UNSUBSCRIBE) {
    await addSuppression(db, email, SUPPRESSION_REASONS.UNSUBSCRIBE, { uid, source });
  }
};

/**
 * Soft preference change for a single marketing category from the Settings page.
 * Switching a category ON is an explicit act, so it also records opted_in consent (and lifts an
 * earlier unsubscribe). Switching OFF only affects that category.
 */
const setMarketingPreference = async (db, uid, userData, key, value) => {
  const update = { [`marketingPreferences.${key}`]: value };
  if (value && userData.marketingConsent?.status !== CONSENT_STATUS.OPTED_IN) {
    update.marketingConsent = buildConsent(CONSENT_STATUS.OPTED_IN, "settings-page");
  }
  await db.collection("users").doc(uid).update(update);
  if (value) await removeSuppression(db, userData.email, SUPPRESSION_REASONS.UNSUBSCRIBE);
};

/** Set every notification (service email) preference to the same value. */
const setAllNotificationSettings = (db, uid, value) =>
  db.collection("users").doc(uid).update(
    Object.fromEntries(NOTIFICATION_KEYS.map((k) => [`notificationSettings.${k}`, value]))
  );

module.exports = {
  NOTIFICATION_KEYS,
  setMarketingPreference,
  setAllNotificationSettings,
  CONSENT_STATUS,
  LEGACY_CUTOFF,
  MARKETING_PREFERENCE_KEYS,
  SUPPRESSION_REASONS,
  buildConsent,
  canReceiveMarketing,
  normaliseEmail,
  suppressionId,
  getSuppression,
  addSuppression,
  removeSuppression,
  optIn,
  optOut,
};
