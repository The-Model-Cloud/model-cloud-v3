const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const Stripe = require("stripe");
const { SUPPRESSION_REASONS, suppressionId } = require("./email/consent");

const db = () => admin.firestore();

// Deleting an account is irreversible, so require the caller to have signed in recently.
const MAX_AUTH_AGE_SECONDS = 5 * 60;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null;

/** Delete every document matched by a query, in batches of 400. */
const deleteQuery = async (query) => {
  let count = 0;
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return count;
    const batch = db().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    count += snap.size;
  }
};

/** Permanently remove the address from the Mailchimp audience (no-op if Mailchimp isn't configured). */
const removeFromMailchimp = async (email) => {
  const { MAILCHIMP_API_KEY, MAILCHIMP_AUDIENCE_ID, MAILCHIMP_SERVER_PREFIX } = process.env;
  if (!MAILCHIMP_API_KEY || !MAILCHIMP_AUDIENCE_ID || !MAILCHIMP_SERVER_PREFIX || !email) return "skipped";

  const hash = crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
  try {
    await axios.post(
      `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members/${hash}/actions/delete-permanent`,
      {},
      { auth: { username: "anystring", password: MAILCHIMP_API_KEY } }
    );
    return "removed";
  } catch (error) {
    if (error.response?.status === 404) return "not_found";
    throw error;
  }
};

/**
 * Self-service account deletion (GDPR right to erasure).
 *
 * Deletes the caller's own account only. Retained on purpose: jobs, invoices, transactions and withdrawals
 * (financial/contract records other parties and tax law depend on). Those are reported back in `retained`.
 */
exports.deleteMyAccount = onCall({ timeoutSeconds: 300 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");

  const uid = request.auth.uid;

  const authAge = Math.floor(Date.now() / 1000) - (request.auth.token.auth_time || 0);
  if (authAge > MAX_AUTH_AGE_SECONDS) {
    throw new HttpsError("failed-precondition", "reauth-required");
  }

  const userRef = db().collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("not-found", "Account not found.");
  const userData = userSnap.data();

  // Safety blocks: deletion here would be destructive to other people or lock everyone out.
  if (userData.role === "super admin" || userData.role === "admin") {
    throw new HttpsError("failed-precondition", "Admin accounts must be removed by a super admin. Please contact support.");
  }
  if (userData.organisationId && userData.organisationRole === "owner") {
    throw new HttpsError(
      "failed-precondition",
      "You own an organisation. Please transfer ownership or contact support@themodel.cloud before deleting your account."
    );
  }

  const email = userData.email || request.auth.token.email || "";
  const summary = { threads: 0, favouriteLists: 0, errors: [] };
  const step = async (name, fn) => {
    try {
      return await fn();
    } catch (error) {
      console.error(`deleteMyAccount(${uid}) step "${name}" failed:`, error.message);
      summary.errors.push({ step: name, message: error.message });
      return null;
    }
  };

  // 1. Stop billing so a deleted user is never charged again.
  const subscriptionId = userData.subscription?.stripeSubscriptionId;
  if (stripe && subscriptionId) {
    await step("stripe_subscription", () => stripe.subscriptions.cancel(subscriptionId));
  }

  // 2. Images
  if (process.env.CLOUDINARY_API_KEY) {
    await step("cloudinary", async () => {
      await cloudinary.uploader.destroy(`user_${uid}_profile`);
      await cloudinary.uploader.destroy(`users/imported/user_${uid}_profile`);
    });
  }

  // 3. Remove from other users' favourites and from jobs they applied to
  await step("favourite_lists", async () => {
    const lists = await db().collection("favouriteLists").where("modelIds", "array-contains", uid).get();
    for (const listDoc of lists.docs) {
      const update = { modelIds: admin.firestore.FieldValue.arrayRemove(uid) };
      const models = listDoc.data().models;
      if (Array.isArray(models)) update.models = models.filter((m) => m.uid !== uid);
      await listDoc.ref.update(update);
      summary.favouriteLists += 1;
    }
  });
  await step("quick_favourites", async () => {
    const users = await db().collection("users").where("favouriteModelIds", "array-contains", uid).get();
    for (const u of users.docs) {
      await u.ref.update({ favouriteModelIds: admin.firestore.FieldValue.arrayRemove(uid) });
    }
  });
  await step("job_applicants", async () => {
    const jobs = await db().collection("jobs").where("applicants", "array-contains", uid).get();
    for (const j of jobs.docs) {
      await j.ref.update({ applicants: admin.firestore.FieldValue.arrayRemove(uid) });
    }
  });

  // 4. Messages
  await step("threads", async () => {
    const threads = await db().collection("threads").where("participants", "array-contains", uid).get();
    for (const t of threads.docs) {
      await deleteQuery(t.ref.collection("messages"));
      await t.ref.delete();
      summary.threads += 1;
    }
  });

  // 5. Marketing: remove from Mailchimp and keep a hashed suppression so we never email them again.
  const mailchimp = await step("mailchimp", () => removeFromMailchimp(email));
  if (email) {
    await step("suppression", () =>
      db().collection("emailSuppressions").doc(suppressionId(email)).set({
        // Deliberately no plaintext email: only the hash (the doc id) is kept to honour the erasure/objection.
        reason: SUPPRESSION_REASONS.UNSUBSCRIBE,
        deletedAccount: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
  }

  // 6. The user document (and its notifications), then the login itself.
  const deleted = await step("user_document", async () => {
    await deleteQuery(userRef.collection("notifications"));
    await userRef.delete();
    return true;
  });
  if (!deleted) {
    // Don't remove the login if the profile is still there; the user can retry.
    throw new HttpsError("internal", "We couldn't fully delete your account. Please try again or contact support.");
  }

  await step("auth_user", async () => {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }
  });

  console.log(`deleteMyAccount: ${uid} deleted`, { ...summary, mailchimp });
  return {
    success: true,
    retained: ["jobs", "invoices", "transactions", "withdrawals"],
    // A Stripe Connect account is not closed automatically because it may hold funds.
    stripeConnectAccountNeedsReview: Boolean(userData.stripeAccountId),
    partialErrors: summary.errors.length,
  };
});
