/**
 * One-off backfill: tag existing users with marketingConsent.
 *
 *   Accounts created BEFORE 1 March 2026  -> { status: "unconfirmed", source: "legacy-migration" }
 *   Accounts created on/after that date   -> left untouched (they get consent at sign-up)
 *   Accounts that already have marketingConsent are never overwritten.
 *
 * Usage (from /functions, with credentials, e.g. GOOGLE_APPLICATION_CREDENTIALS set):
 *   node scripts/backfill-marketing-consent.js            # dry run, writes nothing
 *   node scripts/backfill-marketing-consent.js --apply    # performs the writes
 */
const admin = require("firebase-admin");

const CUTOFF = new Date("2026-03-01T00:00:00Z");
const APPLY = process.argv.includes("--apply");

admin.initializeApp();
const db = admin.firestore();

// createdAt is stored inconsistently: ISO string, Firestore Timestamp, or missing.
const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const authCreationTime = async (uid) => {
  try {
    const user = await admin.auth().getUser(uid);
    return toDate(user.metadata.creationTime);
  } catch {
    return null; // e.g. imported user with no Auth account
  }
};

(async () => {
  const snap = await db.collection("users").get();
  const counts = { total: snap.size, alreadyHasConsent: 0, tagLegacy: 0, postCutoff: 0, noEmail: 0 };
  const writes = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.marketingConsent) { counts.alreadyHasConsent += 1; continue; }
    if (!data.email) { counts.noEmail += 1; continue; }

    const created = toDate(data.createdAt) || (await authCreationTime(doc.id));
    // Unknown creation date => cannot prove they signed up on the new platform => treat as legacy.
    if (created && created >= CUTOFF) { counts.postCutoff += 1; continue; }

    counts.tagLegacy += 1;
    writes.push(doc.ref);
  }

  console.log(APPLY ? "APPLYING" : "DRY RUN (no writes)", counts);
  if (!APPLY) { console.log("Re-run with --apply to write."); return; }

  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach((ref) => {
      batch.update(ref, {
        marketingConsent: {
          status: "unconfirmed",
          source: "legacy-migration",
          date: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    });
    await batch.commit();
    console.log(`Committed ${Math.min(i + 400, writes.length)}/${writes.length}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
