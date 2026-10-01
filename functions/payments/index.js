const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const core = require("./core");

const {
  db, requireStripe, PAYABLE, isHeld, notify, ensureCustomer,
  markJobPaid, releaseJobFunds, retryModelTransfer, cancelAndRefundJob,
} = core;
const { FieldValue } = admin.firestore;

const FRONTEND_URL = process.env.FRONTEND_URL || "https://app.themodel.cloud";
const AUTO_RELEASE_DAYS = 14;

const loadJob = async (jobId) => {
  if (!jobId) throw new HttpsError("invalid-argument", "Job ID is required");
  const snap = await db().collection("jobs").doc(jobId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Job not found");
  return { ref: snap.ref, job: snap.data() };
};

const requireAuth = (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
  return request.auth.uid;
};

// ---------------------------------------------------------------------------
// Client: pay for an awarded job
// ---------------------------------------------------------------------------

/**
 * Start (or resume) payment for an awarded job. The client is charged in full straight away; the money is
 * held by the platform until the job is complete. Returns a client secret for the payment form, or, when a
 * saved payment method is supplied, confirms the payment server-side.
 */
exports.createJobPaymentIntent = onCall(async (request) => {
  const uid = requireAuth(request);
  const s = requireStripe();
  const { jobId, paymentMethodId } = request.data || {};
  const { ref, job } = await loadJob(jobId);

  if (job.userId !== uid) throw new HttpsError("permission-denied", "Only the job owner can pay for the job");
  if (!job.awardedTo || !job.payment) throw new HttpsError("failed-precondition", "Job must be awarded before payment");
  if (!PAYABLE.includes(job.payment.status)) throw new HttpsError("already-exists", "Payment has already been made for this job");

  const userSnap = await db().collection("users").doc(uid).get();
  const userData = userSnap.data();
  const customerId = await ensureCustomer(uid, userData);

  if (paymentMethodId) {
    const pm = await s.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) throw new HttpsError("permission-denied", "That payment method does not belong to you");
  }

  const { clientAmount } = job.payment;
  const currency = String(job.payment.currency).toLowerCase();

  // Resume an existing attempt where possible
  let pi = null;
  if (job.payment.paymentIntentId) {
    try {
      pi = await s.paymentIntents.retrieve(job.payment.paymentIntentId);
    } catch (error) {
      pi = null;
    }
    if (pi) {
      if (pi.status === "succeeded") {
        await markJobPaid(jobId, pi);
        return { success: true, paid: true, status: "succeeded", paymentIntentId: pi.id };
      }
      if (pi.status === "requires_capture") {
        await s.paymentIntents.cancel(pi.id).catch(() => {}); // abandoned legacy hold
        pi = null;
      } else if (pi.status === "canceled" || pi.amount !== clientAmount || pi.currency !== currency) {
        pi = null;
      }
    }
  }

  try {
    if (!pi) {
      pi = await s.paymentIntents.create({
        amount: clientAmount,
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true }, // cards, plus Pay by Bank where enabled in Stripe
        transfer_group: `job_${jobId}`,
        receipt_email: userData.email || undefined,
        description: `Payment for job ${job.reference}: ${job.title}`,
        metadata: { jobId, jobReference: job.reference || "", clientId: uid, modelId: job.awardedTo.modelId, platform: "model-cloud" },
      });
    }

    // Record the intent BEFORE confirming, so the webhook can always match it to the job
    await ref.update({
      "payment.paymentIntentId": pi.id,
      "payment.status": "pending",
      "payment.modelHasStripeAccount": false,
    });

    if (paymentMethodId) {
      pi = await s.paymentIntents.confirm(pi.id, {
        payment_method: paymentMethodId,
        return_url: `${FRONTEND_URL}/jobs/${job.reference}?payment=return`,
      });
    }

    if (pi.status === "succeeded") {
      await markJobPaid(jobId, pi);
      return { success: true, paid: true, status: "succeeded", paymentIntentId: pi.id };
    }
    if (pi.status === "processing") {
      await ref.update({ "payment.status": "processing" });
    }
    return {
      success: true,
      paid: false,
      paymentIntentId: pi.id,
      clientSecret: pi.client_secret,
      status: pi.status,
      requiresAction: pi.status === "requires_action",
    };
  } catch (error) {
    console.error("createJobPaymentIntent failed:", error.message);
    if (error.type === "StripeCardError") {
      await ref.update({ "payment.status": "failed", "payment.failureMessage": error.message, "payment.failedAt": FieldValue.serverTimestamp() }).catch(() => {});
      throw new HttpsError("failed-precondition", error.message);
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Called by the browser after the payment form completes. The browser's claim is never trusted: the payment
 * is re-read from Stripe and must be the job's own, for the right amount. The webhook does the same job, and
 * whichever arrives first wins.
 */
exports.confirmJobPaymentAuthorized = onCall(async (request) => {
  const uid = requireAuth(request);
  const s = requireStripe();
  const { jobId, paymentIntentId } = request.data || {};
  const { job } = await loadJob(jobId);

  if (job.userId !== uid) throw new HttpsError("permission-denied", "Only the job owner can confirm payment");
  if (!job.payment?.paymentIntentId || job.payment.paymentIntentId !== paymentIntentId) {
    throw new HttpsError("failed-precondition", "That payment does not belong to this job");
  }
  if (isHeld(job.payment.status) || ["released", "partially_released"].includes(job.payment.status)) {
    return { success: true, paid: true, message: "Payment already received." };
  }

  const pi = await s.paymentIntents.retrieve(paymentIntentId);
  if (pi.status === "succeeded") {
    await markJobPaid(jobId, pi);
    return { success: true, paid: true, message: "Payment received. Funds are held securely until the job is complete." };
  }
  if (pi.status === "processing") {
    return { success: true, paid: false, pending: true, message: "Your payment is being processed. We'll update the job as soon as it clears." };
  }
  throw new HttpsError("failed-precondition", `Payment has not completed (${pi.status}).`);
});

// ---------------------------------------------------------------------------
// Completion and release
// ---------------------------------------------------------------------------

exports.clientConfirmJobComplete = onCall(async (request) => {
  const uid = requireAuth(request);
  const { jobId } = request.data || {};
  const { job } = await loadJob(jobId);

  if (job.userId !== uid) throw new HttpsError("permission-denied", "Only the job owner can confirm completion");
  if (!job.completion?.modelMarkedComplete) throw new HttpsError("failed-precondition", "Model must mark the job as complete first");
  if (!isHeld(job.payment?.status)) throw new HttpsError("failed-precondition", "Payment must be held before it can be released");

  await releaseJobFunds(jobId, { actorUid: uid });
  return { success: true, message: "Payment released successfully. The model has been notified." };
});

/** Admin: release, cancel (full refund), or part-refund a job's held payment. */
exports.adminManageJobPayment = onCall(async (request) => {
  const uid = requireAuth(request);
  requireStripe();
  const { jobId, action, refundPercentage = 100 } = request.data || {};

  if (!jobId || !action) throw new HttpsError("invalid-argument", "Job ID and action are required");
  if (!["release", "cancel", "partial_refund"].includes(action)) {
    throw new HttpsError("invalid-argument", "Invalid action. Must be: release, cancel, or partial_refund");
  }

  const adminSnap = await db().collection("users").doc(uid).get();
  const adminData = adminSnap.data();
  if (!adminSnap.exists || !["admin", "super admin"].includes(adminData.role)) {
    throw new HttpsError("permission-denied", "Only admins can manage job payments");
  }

  const { job } = await loadJob(jobId);
  if (!job.payment?.paymentIntentId) throw new HttpsError("failed-precondition", "No payment found for this job");

  const log = (extra) =>
    db().collection("adminLogs").add({
      adminUid: uid, adminEmail: adminData.email, adminName: `${adminData.firstName} ${adminData.lastName}`,
      jobId, jobReference: job.reference, timestamp: FieldValue.serverTimestamp(), ...extra,
    });

  if (action === "release") {
    await releaseJobFunds(jobId, { actorUid: uid });
    await log({ action: "force_release_payment", amount: job.payment.modelAmount });
    return { success: true, message: "Funds released to model" };
  }

  if (action === "cancel") {
    await cancelAndRefundJob(jobId, { actorUid: uid });
    await log({ action: "cancel_payment", amount: job.payment.clientAmount });
    return { success: true, message: "Payment cancelled and client refunded" };
  }

  // partial_refund: the model receives `refundPercentage`% of their share, the client is refunded the remainder
  const pct = Number(refundPercentage);
  if (!(pct > 0 && pct < 100)) throw new HttpsError("invalid-argument", "Percentage must be between 1 and 99");
  const result = await releaseJobFunds(jobId, { actorUid: uid, percentage: pct });
  const modelReceives = Math.round(job.payment.modelAmount * (pct / 100));
  await log({ action: "partial_refund", originalAmount: job.payment.modelAmount, refundPercentage: pct, modelReceives });
  return { success: true, message: `Partial payment processed. Model receives ${pct}% (${(modelReceives / 100).toFixed(2)})`, releaseStatus: result.releaseStatus };
});

// ---------------------------------------------------------------------------
// Client: cancel a booking (before payment only)
// ---------------------------------------------------------------------------

/**
 * Remove the award from a job that has NOT been paid for. This used to be a direct browser write; it is now
 * server-side so a payment can never be orphaned. Paid bookings must be cancelled and refunded by an admin.
 */
exports.cancelJobBooking = onCall(async (request) => {
  const uid = requireAuth(request);
  const s = requireStripe();
  const { jobId } = request.data || {};
  const { ref, job } = await loadJob(jobId);

  if (job.userId !== uid) throw new HttpsError("permission-denied", "Only the job owner can cancel the booking");
  if (!job.awardedTo) throw new HttpsError("failed-precondition", "This job has not been awarded");

  if (job.payment?.paymentIntentId) {
    let pi = null;
    try {
      pi = await s.paymentIntents.retrieve(job.payment.paymentIntentId);
    } catch (error) {
      pi = null;
    }
    if (pi?.status === "succeeded") {
      await markJobPaid(jobId, pi); // the payment landed: record it, then refuse
      throw new HttpsError("failed-precondition", "This booking has already been paid for. Please contact support to cancel it and arrange a refund.");
    }
    if (pi && !["canceled"].includes(pi.status)) await s.paymentIntents.cancel(pi.id).catch(() => {});
  }
  if (job.payment && !PAYABLE.includes(job.payment.status)) {
    throw new HttpsError("failed-precondition", "This booking has already been paid for. Please contact support to cancel it and arrange a refund.");
  }

  const awarded = job.awardedTo;
  await ref.update({
    status: "open",
    awardedTo: FieldValue.delete(),
    payment: FieldValue.delete(),
    completion: FieldValue.delete(),
    awardCancelledAt: new Date().toISOString(),
  });

  await notify(awarded.modelId, {
    type: "job_award_cancelled",
    title: "Job Award Cancelled",
    message: `The booking for "${job.title}" has been cancelled by the client.`,
    data: { jobId, jobReference: job.reference, jobTitle: job.title, link: `/jobs/${job.reference}` },
  });
  return { success: true };
});

// ---------------------------------------------------------------------------
// Scheduled: auto-release after 14 days, and retry transfers that could not be made
// ---------------------------------------------------------------------------

exports.autoReleaseFunds = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Europe/London", retryCount: 3, timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    if (!core.stripe) {
      console.log("Stripe not configured, skipping auto-release");
      return;
    }
    const cutoff = Date.now() - AUTO_RELEASE_DAYS * 86400000;

    for (const status of ["held", "authorized"]) {
      const snap = await db().collection("jobs")
        .where("status", "==", "in_progress")
        .where("payment.status", "==", status)
        .where("completion.modelMarkedComplete", "==", true)
        .where("completion.clientConfirmed", "==", false)
        .get();

      for (const doc of snap.docs) {
        const markedAt = doc.data().completion?.modelMarkedAt?.toDate?.();
        if (!markedAt || markedAt.getTime() > cutoff) continue;
        try {
          console.log(`Auto-releasing funds for job ${doc.id} (${doc.data().reference})`);
          await releaseJobFunds(doc.id, { auto: true });
        } catch (error) {
          console.error(`Auto-release failed for job ${doc.id}:`, error.message);
        }
      }
    }

    // Transfers that were waiting for a bank account or failed earlier
    const waiting = await db().collection("jobs").where("payment.releaseStatus", "in", core.RETRYABLE_RELEASES).get();
    for (const doc of waiting.docs) {
      await retryModelTransfer(doc.id).catch((error) => console.error(`Transfer retry failed for ${doc.id}:`, error.message));
    }
  }
);

