const admin = require("firebase-admin");
const core = require("./core");

const { db, requireStripe, PAYABLE, markJobPaid, releasePendingTransfersForModel, notify } = core;
const { FieldValue } = admin.firestore;

/**
 * Stripe webhook handlers for job payments. The webhook function itself (signature check, event
 * de-duplication, subscription events) stays in index.js and calls these.
 */

const jobIdFor = (paymentIntent) => paymentIntent.metadata?.jobId || null;

/** The payment succeeded: this is the authoritative "paid" signal (the browser confirm is only a fast path). */
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  const jobId = jobIdFor(paymentIntent);
  if (!jobId) return; // not a job payment (e.g. a subscription)
  await markJobPaid(jobId, paymentIntent);
};

/** A payment attempt failed: let the client try again. Never touches a job that is already paid. */
const handlePaymentIntentFailed = async (paymentIntent) => {
  const jobId = jobIdFor(paymentIntent);
  if (!jobId) return;

  const ref = db().collection("jobs").doc(jobId);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const pay = snap.data()?.payment;
    if (!pay || pay.paymentIntentId !== paymentIntent.id || !PAYABLE.includes(pay.status)) return;
    tx.update(ref, {
      "payment.status": "failed",
      "payment.failedAt": FieldValue.serverTimestamp(),
      "payment.failureMessage": paymentIntent.last_payment_error?.message || "Payment failed",
    });
  });
};

/** An unpaid intent was cancelled: the job goes back to "needs payment" with a fresh start. */
const handlePaymentIntentCanceled = async (paymentIntent) => {
  const jobId = jobIdFor(paymentIntent);
  if (!jobId) return;

  const ref = db().collection("jobs").doc(jobId);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const pay = snap.data()?.payment;
    // Only an unpaid job whose CURRENT intent was cancelled. Paid, released or refunded jobs are never touched.
    if (!pay || pay.paymentIntentId !== paymentIntent.id || !PAYABLE.includes(pay.status)) return;
    tx.update(ref, { "payment.status": "pending", "payment.paymentIntentId": null });
  });
};

/** Record refunds in the ledger (one transaction document per Stripe refund, so repeats are harmless). */
const handleChargeRefunded = async (charge) => {
  const s = requireStripe();
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;

  const jobs = await db().collection("jobs").where("payment.paymentIntentId", "==", piId).limit(1).get();
  if (jobs.empty) return;
  const jobDoc = jobs.docs[0];
  const job = jobDoc.data();

  const refunds = await s.refunds.list({ charge: charge.id, limit: 20 });
  for (const refund of refunds.data) {
    if (refund.status === "failed" || refund.status === "canceled") continue;
    await db().collection("transactions").doc(`refund_${refund.id}`).set({
      type: "refund",
      jobId: jobDoc.id,
      jobReference: job.reference,
      clientId: job.userId,
      modelId: job.awardedTo?.modelId || null,
      amount: refund.amount,
      clientAmount: refund.amount,
      currency: String(refund.currency).toUpperCase(),
      status: "completed",
      stripeRefundId: refund.id,
      stripePaymentIntentId: piId,
      createdAt: admin.firestore.Timestamp.fromMillis(refund.created * 1000),
    }, { merge: true });
  }
  await jobDoc.ref.update({ "payment.totalRefunded": charge.amount_refunded });
};

/** A client disputed the charge with their bank: flag the job and tell the admins. */
const handleDispute = async (dispute, closed = false) => {
  const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!piId) return;

  const jobs = await db().collection("jobs").where("payment.paymentIntentId", "==", piId).limit(1).get();
  if (jobs.empty) return;
  const jobDoc = jobs.docs[0];
  const job = jobDoc.data();

  await jobDoc.ref.update({
    "payment.dispute": { id: dispute.id, status: dispute.status, reason: dispute.reason, amount: dispute.amount, updatedAt: new Date().toISOString() },
  });

  await db().collection("adminLogs").add({
    action: closed ? "payment_dispute_closed" : "payment_dispute_opened",
    jobId: jobDoc.id,
    jobReference: job.reference,
    amount: dispute.amount,
    disputeId: dispute.id,
    disputeStatus: dispute.status,
    reason: dispute.reason,
    timestamp: FieldValue.serverTimestamp(),
  });

  if (!closed) {
    const admins = await db().collection("users").where("role", "==", "super admin").limit(5).get();
    await Promise.all(admins.docs.map((a) => notify(a.id, {
      type: "payment_dispute",
      title: "Payment Dispute Opened",
      message: `The client's bank has disputed the payment for job ${job.reference}. Evidence must be submitted in Stripe before the deadline.`,
      data: { jobId: jobDoc.id, jobReference: job.reference, link: `/jobs/${job.reference}` },
    })));
  }
};

/** A model finished (or changed) their Stripe setup: send them any money that was waiting. */
const handleModelAccountReady = async (modelId, account) => {
  if (!account.details_submitted && !account.payouts_enabled) return;
  const sent = await releasePendingTransfersForModel(modelId);
  if (sent > 0) console.log(`Released ${sent} waiting transfer(s) to model ${modelId}`);
};

module.exports = {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handlePaymentIntentCanceled,
  handleChargeRefunded,
  handleDispute,
  handleModelAccountReady,
};
