const admin = require("firebase-admin");
const Stripe = require("stripe");
const { HttpsError } = require("firebase-functions/v2/https");
const { sendToUser } = require("../email/send");

/**
 * Job payment core.
 *
 * Money model ("separate charges and transfers"):
 *   1. The client is charged the full amount (job + platform fee) immediately.
 *   2. The money stays in the platform's Stripe balance ("held") until the job is complete.
 *   3. On completion the model's share is transferred to their connected account. The platform fee stays here.
 *
 * job.payment.status:
 *   pending     awarded, not yet paid (UI: Require Payment)
 *   processing  payment started but not yet confirmed (3D Secure, bank payment)
 *   failed      last attempt failed; the client may retry (UI: Require Payment)
 *   held        paid; funds held by the platform (UI: Paid)
 *   releasing   transient claim while funds are being released
 *   released / partially_released   funds sent to the model
 *   refunded    client refunded in full
 *   Legacy (earlier manual-capture flow): authorized = held, captured = released, partial_captured.
 *
 * Every state change that moves money is claimed in a Firestore transaction first, and Stripe calls use
 * idempotency keys, so webhooks, retries and double clicks cannot pay anyone twice.
 */

const db = () => admin.firestore();
const { FieldValue } = admin.firestore;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null;

const requireStripe = () => {
  if (!stripe) throw new HttpsError("unavailable", "Stripe is not configured");
  return stripe;
};

const HELD = ["held", "authorized"]; // authorized = legacy manual-capture hold
const PAYABLE = ["pending", "processing", "failed"];
const RETRYABLE_RELEASES = ["awaiting_model_account", "transfer_failed"];

const isHeld = (status) => HELD.includes(status);

const pounds = (pence, currency = "GBP") => `${currency} ${(pence / 100).toFixed(2)}`;

// ---------------------------------------------------------------------------
// Notifications and email
// ---------------------------------------------------------------------------

const notify = async (uid, { type, title, message, data }) => {
  try {
    await db().collection("users").doc(uid).collection("notifications").add({
      type, title, message, data: data || {}, read: false, createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn(`notify(${uid}) failed:`, error.message);
  }
};

/** Service email (respects suppression, bounces and the system email toggle). Never throws. */
const emailUser = async (uid, subject, html) => {
  try {
    const snap = await db().collection("users").doc(uid).get();
    if (!snap.exists) return;
    await sendToUser(db(), { uid, userData: snap.data(), subject, html, kind: "service", categories: ["payments"] });
  } catch (error) {
    console.warn(`emailUser(${uid}) failed:`, error.message);
  }
};

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

const ensureCustomer = async (uid, userData) => {
  if (userData.stripeCustomerId) return userData.stripeCustomerId;
  const customer = await requireStripe().customers.create({
    email: userData.email,
    name: userData.companyName || `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
    metadata: { firebaseUid: uid, role: userData.role || "", platform: "model-cloud" },
  });
  await db().collection("users").doc(uid).update({ stripeCustomerId: customer.id });
  return customer.id;
};

// ---------------------------------------------------------------------------
// Transactions ledger (one document per job payment: transactions/job_{jobId})
// ---------------------------------------------------------------------------

const jobTransactionRef = (jobId) => db().collection("transactions").doc(`job_${jobId}`);

/** Update the job's transaction record, falling back to a legacy auto-id document. */
const updateJobTransaction = async (jobId, patch) => {
  const ref = jobTransactionRef(jobId);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update(patch);
    return;
  }
  const legacy = await db().collection("transactions").where("jobId", "==", jobId).where("type", "==", "job_payment_authorized").limit(1).get();
  if (!legacy.empty) await legacy.docs[0].ref.update(patch);
};

// ---------------------------------------------------------------------------
// Payment received
// ---------------------------------------------------------------------------

/**
 * Record that the client's payment succeeded: job becomes in_progress, funds are "held".
 * Called by the webhook AND by the confirm callable; only the first caller does the work.
 * @returns {Promise<boolean>} true if this call performed the transition
 */
const markJobPaid = async (jobId, paymentIntent) => {
  const jobRef = db().collection("jobs").doc(jobId);

  const claimed = await db().runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    if (!snap.exists) return null;
    const job = snap.data();
    const pay = job.payment;
    if (!pay || !job.awardedTo) return null;

    // Must be the payment intent for this job, for exactly the agreed amount
    if (pay.paymentIntentId && pay.paymentIntentId !== paymentIntent.id) return null;
    if (!pay.paymentIntentId && paymentIntent.metadata?.jobId !== jobId) return null;
    if (paymentIntent.status !== "succeeded") return null;
    if (paymentIntent.amount !== pay.clientAmount || paymentIntent.currency !== String(pay.currency).toLowerCase()) {
      console.error(`markJobPaid: amount/currency mismatch for job ${jobId}`);
      return null;
    }
    if (!PAYABLE.includes(pay.status)) return null; // already held, released, refunded...

    tx.update(jobRef, {
      status: "in_progress",
      "payment.status": "held",
      "payment.paymentIntentId": paymentIntent.id,
      "payment.chargeId": typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id || null,
      "payment.paidAt": FieldValue.serverTimestamp(),
      "payment.authorizedAt": FieldValue.serverTimestamp(),
      "payment.failureMessage": FieldValue.delete(),
    });
    return job;
  });

  if (!claimed) return false;

  const job = claimed;
  const modelId = job.awardedTo.modelId;
  const { modelAmount, clientAmount, platformFee, currency } = job.payment;

  await db().collection("users").doc(modelId).update({
    "balance.pending": FieldValue.increment(modelAmount),
    "balance.lastUpdated": FieldValue.serverTimestamp(),
  }).catch((error) => console.error("markJobPaid: model balance update failed:", error.message));

  await jobTransactionRef(jobId).set({
    type: "job_payment_authorized", // kept for the existing transaction list; status shows "funds held"
    jobId,
    jobReference: job.reference,
    clientId: job.userId,
    modelId,
    amount: modelAmount,
    clientAmount,
    platformFee,
    currency,
    status: "authorized",
    stripePaymentIntentId: paymentIntent.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  await notify(modelId, {
    type: "payment_authorised",
    title: "Payment Received",
    message: `Payment for job "${job.title}" has been received and is held securely. You can now start working on the job.`,
    data: { jobId, jobReference: job.reference, jobTitle: job.title, amount: modelAmount, currency, link: `/jobs/${job.reference}` },
  });
  try {
    await require("./invoices").createInvoiceForJob(jobId, job, paymentIntent);
  } catch (error) {
    console.error(`markJobPaid: invoice for job ${jobId} failed (can be backfilled):`, error.message);
  }

  await notify(job.userId, {
    type: "payment_received",
    title: "Payment Received",
    message: `Your payment of ${pounds(clientAmount, currency)} for "${job.title}" was successful. The funds are held securely until the job is complete.`,
    data: { jobId, jobReference: job.reference, jobTitle: job.title, link: `/jobs/${job.reference}` },
  });
  return true;
};

// ---------------------------------------------------------------------------
// Transfers to the model
// ---------------------------------------------------------------------------

/** A transfer already made for this job (protects against double payment after a crash). */
const findExistingTransfer = async (jobId, amount) => {
  const list = await requireStripe().transfers.list({ transfer_group: `job_${jobId}`, limit: 10 });
  return list.data.find((t) => !t.reversed && t.amount === amount && t.metadata?.jobId === jobId) || null;
};

const createModelTransfer = async ({ jobId, job, modelData, amount, attempt }) => {
  const s = requireStripe();
  const existing = await findExistingTransfer(jobId, amount);
  if (existing) return existing;

  return s.transfers.create(
    {
      amount,
      currency: String(job.payment.currency).toLowerCase(),
      destination: modelData.stripeAccountId,
      transfer_group: `job_${jobId}`,
      // Ties the transfer to the client's charge so it is allowed while the charge is still settling
      ...(job.payment.chargeId ? { source_transaction: job.payment.chargeId } : {}),
      metadata: { jobId, jobReference: job.reference || "", modelId: job.awardedTo.modelId, platform: "model-cloud" },
    },
    // New key per attempt: Stripe caches failures for an idempotency key, so a retry needs a fresh one
    { idempotencyKey: `release-${jobId}-${amount}-${attempt}` }
  );
};

/**
 * Release (all or part of) the held funds for a job to the model.
 *
 * @param {number} percentage 100 for a normal release; 1-99 gives the model that share and refunds the client the rest
 * @returns {Promise<{status: string, releaseStatus: string, transferId: string|null}>}
 */
const releaseJobFunds = async (jobId, { actorUid = null, auto = false, percentage = 100 } = {}) => {
  const s = requireStripe();
  const jobRef = db().collection("jobs").doc(jobId);

  // Claim: only one release can ever run, and only on held funds
  const claim = await db().runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    const job = snap.data();
    if (!job?.payment || !isHeld(job.payment.status)) return null;
    tx.update(jobRef, { "payment.status": "releasing", "payment.releaseStartedAt": FieldValue.serverTimestamp() });
    return { job, previousStatus: job.payment.status };
  });
  if (!claim) throw new HttpsError("failed-precondition", "Funds are not currently held for this job (they may already have been released).");

  const { job, previousStatus } = claim;
  const modelId = job.awardedTo.modelId;
  const { clientAmount, modelAmount, currency } = job.payment;
  const captureAmount = Math.round(clientAmount * (percentage / 100));
  const modelShare = Math.round(modelAmount * (percentage / 100));
  const refundAmount = clientAmount - captureAmount;

  try {
    let pi = await s.paymentIntents.retrieve(job.payment.paymentIntentId);

    // Legacy manual-capture hold: capture now (a partial capture releases the rest back to the card)
    if (pi.status === "requires_capture") {
      pi = await s.paymentIntents.capture(pi.id, percentage < 100 ? { amount_to_capture: captureAmount } : undefined);
    } else if (pi.status === "succeeded" && refundAmount > 0) {
      await s.refunds.create(
        { payment_intent: pi.id, amount: refundAmount, metadata: { jobId, reason: "partial_release", platform: "model-cloud" } },
        { idempotencyKey: `partial-refund-${jobId}-${refundAmount}` }
      );
    }
    if (pi.status !== "succeeded") throw new Error(`Payment is not in a releasable state: ${pi.status}`);

    // Pay the model
    let transferId = null;
    let releaseStatus = "released";
    let releaseError = null;
    const legacyDestinationCharge = !!pi.transfer_data?.destination; // Stripe already paid the model on capture

    if (!legacyDestinationCharge && modelShare > 0) {
      const modelSnap = await db().collection("users").doc(modelId).get();
      const modelData = modelSnap.data() || {};
      if (!modelData.stripeAccountId) {
        releaseStatus = "awaiting_model_account"; // paid out automatically once they link a bank account
      } else {
        try {
          const transfer = await createModelTransfer({ jobId, job, modelData, amount: modelShare, attempt: 1 });
          transferId = transfer.id;
        } catch (error) {
          console.error(`releaseJobFunds: transfer failed for job ${jobId}:`, error.message);
          releaseStatus = "transfer_failed";
          releaseError = error.message;
        }
      }
    }

    await jobRef.update({
      status: "completed",
      "payment.status": percentage < 100 ? "partially_released" : "released",
      "payment.releaseStatus": releaseStatus,
      "payment.releaseError": releaseError,
      "payment.stripeTransferId": transferId,
      "payment.releasedModelAmount": modelShare,
      "payment.capturedAt": FieldValue.serverTimestamp(),
      "payment.releasedAt": FieldValue.serverTimestamp(),
      ...(percentage < 100 ? { "payment.refundedAmount": refundAmount, "payment.partialRefundByAdmin": actorUid } : {}),
      "completion.fundsReleasedAt": FieldValue.serverTimestamp(),
      ...(auto ? { "completion.autoReleased": true } : {}),
      ...(!auto && actorUid && actorUid !== job.userId ? { "completion.releasedByAdmin": actorUid } : {}),
      ...(!auto && actorUid === job.userId ? { "completion.clientConfirmed": true, "completion.clientConfirmedAt": FieldValue.serverTimestamp() } : {}),
    });

    await db().collection("users").doc(modelId).update({
      "balance.pending": FieldValue.increment(-modelAmount),
      "balance.available": FieldValue.increment(modelShare),
      "balance.lastUpdated": FieldValue.serverTimestamp(),
    });

    await updateJobTransaction(jobId, {
      status: "completed",
      type: "job_payment_completed",
      completedAt: FieldValue.serverTimestamp(),
      ...(auto ? { autoReleased: true } : {}),
    });

    await notify(modelId, {
      type: auto ? "funds_auto_released" : "funds_released",
      title: auto ? "Funds Auto-Released!" : "Funds Released!",
      message: `Payment of ${pounds(modelShare, currency)} for job "${job.title}" has been released to your account.`,
      data: { jobId, jobReference: job.reference, jobTitle: job.title, amount: modelShare, currency, link: `/jobs/${job.reference}` },
    });
    if (auto) {
      await notify(job.userId, {
        type: "funds_auto_released",
        title: "Payment Auto-Released",
        message: `Payment for job "${job.title}" was automatically released after 14 days without a response.`,
        data: { jobId, jobReference: job.reference, jobTitle: job.title, link: `/jobs/${job.reference}` },
      });
    }
    await emailUser(
      modelId,
      `Payment Released: ${job.title}`,
      `<h2>Payment Released!</h2>
       <p>The payment for job "${job.title}" (${job.reference}) has been released.</p>
       <p><strong>Amount:</strong> ${pounds(modelShare, currency)}</p>
       <p>${releaseStatus === "awaiting_model_account"
         ? "To receive it, please link your bank account in the Payouts section of The Model Cloud. The funds are held safely and will be sent to you as soon as your account is set up."
         : "The funds are now in your Model Cloud balance and can be withdrawn to your bank account."}</p>`
    );

    return { status: percentage < 100 ? "partially_released" : "released", releaseStatus, transferId };
  } catch (error) {
    // Give the claim back so the release can be retried (Stripe calls above are idempotent)
    await jobRef.update({ "payment.status": previousStatus, "payment.releaseError": String(error.message).slice(0, 300) }).catch(() => {});
    console.error(`releaseJobFunds failed for job ${jobId}:`, error);
    throw new HttpsError("internal", `Could not release the funds: ${error.message}`);
  }
};

/** Retry a transfer that could not be made yet (model had no account) or failed. */
const retryModelTransfer = async (jobId) => {
  const jobRef = db().collection("jobs").doc(jobId);
  const snap = await jobRef.get();
  const job = snap.data();
  if (!job?.payment || !RETRYABLE_RELEASES.includes(job.payment.releaseStatus)) return false;

  const modelSnap = await db().collection("users").doc(job.awardedTo.modelId).get();
  const modelData = modelSnap.data() || {};
  if (!modelData.stripeAccountId) return false;

  const amount = job.payment.releasedModelAmount;
  if (!amount || amount <= 0) return false;
  const attempt = (job.payment.transferAttempts || 1) + 1;

  try {
    const transfer = await createModelTransfer({ jobId, job, modelData, amount, attempt });
    await jobRef.update({
      "payment.releaseStatus": "released",
      "payment.releaseError": null,
      "payment.stripeTransferId": transfer.id,
      "payment.transferAttempts": attempt,
    });
    await notify(job.awardedTo.modelId, {
      type: "funds_transferred",
      title: "Funds Sent to Your Account",
      message: `${pounds(amount, job.payment.currency)} for job "${job.title}" has been sent to your payout account.`,
      data: { jobId, jobReference: job.reference, link: "/payouts" },
    });
    return true;
  } catch (error) {
    console.error(`retryModelTransfer failed for job ${jobId}:`, error.message);
    await jobRef.update({ "payment.releaseStatus": "transfer_failed", "payment.releaseError": String(error.message).slice(0, 300), "payment.transferAttempts": attempt });
    return false;
  }
};

/** Called when a model finishes (or updates) their Stripe onboarding: send them anything that was waiting. */
const releasePendingTransfersForModel = async (modelId) => {
  const snap = await db().collection("jobs").where("awardedTo.modelId", "==", modelId).where("payment.releaseStatus", "in", RETRYABLE_RELEASES).get();
  let sent = 0;
  for (const doc of snap.docs) {
    if (await retryModelTransfer(doc.id)) sent += 1;
  }
  return sent;
};

// ---------------------------------------------------------------------------
// Refund / cancel
// ---------------------------------------------------------------------------

/** Cancel a paid job and refund the client in full (nothing has been paid to the model yet). */
const cancelAndRefundJob = async (jobId, { actorUid } = {}) => {
  const s = requireStripe();
  const jobRef = db().collection("jobs").doc(jobId);

  const claim = await db().runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    const job = snap.data();
    if (!job?.payment || !isHeld(job.payment.status)) return null;
    tx.update(jobRef, { "payment.status": "refunding" });
    return { job, previousStatus: job.payment.status };
  });
  if (!claim) throw new HttpsError("failed-precondition", "Only a job whose funds are held can be cancelled and refunded. If the funds were already released, handle the refund manually.");

  const { job, previousStatus } = claim;
  const modelId = job.awardedTo.modelId;
  try {
    const pi = await s.paymentIntents.retrieve(job.payment.paymentIntentId);
    if (pi.status === "requires_capture") {
      await s.paymentIntents.cancel(pi.id); // legacy hold: releases the card hold
    } else if (pi.status === "succeeded") {
      await s.refunds.create(
        { payment_intent: pi.id, metadata: { jobId, reason: "job_cancelled", platform: "model-cloud" } },
        { idempotencyKey: `full-refund-${jobId}` }
      );
    } else {
      throw new Error(`Payment is not refundable: ${pi.status}`);
    }

    await jobRef.update({
      status: "cancelled",
      "payment.status": "refunded",
      "payment.refundedAmount": job.payment.clientAmount,
      "payment.cancelledAt": FieldValue.serverTimestamp(),
      ...(actorUid ? { "payment.cancelledByAdmin": actorUid } : {}),
    });
    await db().collection("users").doc(modelId).update({
      "balance.pending": FieldValue.increment(-job.payment.modelAmount),
      "balance.lastUpdated": FieldValue.serverTimestamp(),
    });
    await updateJobTransaction(jobId, { status: "refunded", type: "job_payment_refunded", completedAt: FieldValue.serverTimestamp() });

    await notify(job.userId, {
      type: "payment_refunded",
      title: "Payment Refunded",
      message: `Your payment for "${job.title}" has been refunded. It can take a few days to appear on your statement.`,
      data: { jobId, jobReference: job.reference, link: `/jobs/${job.reference}` },
    });
    await notify(modelId, {
      type: "job_cancelled",
      title: "Job Cancelled",
      message: `The job "${job.title}" has been cancelled.`,
      data: { jobId, jobReference: job.reference, link: `/jobs/${job.reference}` },
    });
    return { refundedAmount: job.payment.clientAmount };
  } catch (error) {
    await jobRef.update({ "payment.status": previousStatus }).catch(() => {});
    console.error(`cancelAndRefundJob failed for job ${jobId}:`, error);
    throw new HttpsError("internal", `Could not refund this payment: ${error.message}`);
  }
};

module.exports = {
  db, stripe, requireStripe, HELD, PAYABLE, RETRYABLE_RELEASES, isHeld, pounds,
  notify, emailUser, ensureCustomer,
  markJobPaid, releaseJobFunds, retryModelTransfer, releasePendingTransfersForModel, cancelAndRefundJob,
};
