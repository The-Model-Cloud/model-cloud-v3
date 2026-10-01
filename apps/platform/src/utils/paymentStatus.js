/**
 * Job payment status helpers. job.payment.status is written by Cloud Functions only.
 *
 *   pending / failed   not paid: the client still needs to pay        (shown as "Require Payment")
 *   processing         payment started, waiting for the bank
 *   held               paid; held securely until the job completes    (shown as "Paid")
 *   released           funds sent to the model                        (shown as "Paid")
 *   refunded / cancelled
 *
 * "authorized" and "captured" are the older names for held and released (earlier manual-capture flow) and
 * are still understood so existing jobs keep working.
 */

export const HELD = ["held", "authorized"];
export const RELEASED = ["released", "partially_released", "captured", "partial_captured"];

export const isPaymentHeld = (status) => HELD.includes(status);
export const isPaymentReleased = (status) => RELEASED.includes(status);
/** Money has been taken from the client (held or already released). */
export const isPaymentPaid = (status) => isPaymentHeld(status) || isPaymentReleased(status);
/** The client can still pay (or retry paying). */
export const isPaymentDue = (status) => !status || status === "pending" || status === "failed";

/**
 * The three states clients see on the Payments & Invoices page.
 *   Pending          the job has not been awarded yet, so there is nothing to pay
 *   Require Payment  awarded and started, but not paid
 *   Paid             the client's money has been taken
 */
export const clientPaymentState = (job) => {
  const status = job?.payment?.status;
  if (isPaymentPaid(status)) return "paid";
  if (status === "refunded") return "refunded";
  if (job?.awardedTo && (isPaymentDue(status) || status === "processing")) return "require_payment";
  return "pending";
};
