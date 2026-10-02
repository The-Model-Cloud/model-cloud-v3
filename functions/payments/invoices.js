const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const core = require("./core");

/**
 * Invoices for job payments.
 *
 * invoices/{jobId-based id}  one per paid job, created by the server the moment the payment succeeds.
 * An invoice is a snapshot: the client's billing details and the amounts are copied in at that moment so later
 * edits can never change a document that has already been issued. Clients read their own (rules); nobody
 * writes from a browser.
 *
 * Membership invoices (type "membership") are issued for every client every 30 days, including £0 ones for
 * free and no-charge accounts, so each client has a complete record. Paying clients' invoices come from Stripe's
 * subscription invoices (source "stripe"), the rest are issued by the membership scheduler. Same numbering,
 * same collection, same PDF.
 *
 * Issuer details come from environment variables (set these in functions/.env):
 *   INVOICE_COMPANY_NAME, INVOICE_COMPANY_ADDRESS (lines separated by |), INVOICE_COMPANY_NUMBER,
 *   INVOICE_VAT_NUMBER, INVOICE_EMAIL, INVOICE_FOOTER
 */

const db = () => admin.firestore();
const { FieldValue } = admin.firestore;

const issuer = () => ({
  name: process.env.INVOICE_COMPANY_NAME || "The Model Cloud",
  address: (process.env.INVOICE_COMPANY_ADDRESS || "").split("|").map((l) => l.trim()).filter(Boolean),
  companyNumber: process.env.INVOICE_COMPANY_NUMBER || "",
  vatNumber: process.env.INVOICE_VAT_NUMBER || "",
  email: process.env.INVOICE_EMAIL || process.env.SENDGRID_FROM_EMAIL || "",
  footer: process.env.INVOICE_FOOTER || "",
});

const invoiceRef = (jobId) => db().collection("invoices").doc(`job_${jobId}`);

/** Next sequential, gap-free invoice number (INV-2026-000001). Must be called inside a transaction, before any writes. */
const allocateInvoiceNumber = async (tx) => {
  const counterRef = db().collection("settings").doc("invoiceCounter");
  const counter = await tx.get(counterRef);
  const next = (counter.exists ? counter.data().next : 1) || 1;
  tx.set(counterRef, { next: next + 1 }, { merge: true });
  return `INV-${new Date().getFullYear()}-${String(next).padStart(6, "0")}`;
};

/** Who is being billed: a snapshot, so later edits never change an issued invoice */
const billToSnapshot = (client) => {
  const billing = client.billingDetails || {};
  return {
    name: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
    email: billing.billingEmail || client.email || "",
    companyName: billing.companyName || client.companyName || "",
    addressLine1: billing.addressLine1 || "",
    addressLine2: billing.addressLine2 || "",
    city: billing.city || "",
    postcode: billing.postcode || "",
    country: billing.country || "",
    vatNumber: billing.vatNumber || "",
  };
};

/**
 * Issue the invoice for a paid job. Safe to call more than once: the second call returns the existing invoice.
 * @returns {Promise<string>} the invoice id
 */
const createInvoiceForJob = async (jobId, job, paymentIntent) => {
  const ref = invoiceRef(jobId);
  if ((await ref.get()).exists) return ref.id;

  const clientSnap = await db().collection("users").doc(job.userId).get();
  const client = clientSnap.data() || {};

  // Stripe's own receipt link, when available
  let receiptUrl = null;
  const chargeId = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id;
  if (chargeId && core.stripe) {
    try {
      receiptUrl = (await core.stripe.charges.retrieve(chargeId)).receipt_url || null;
    } catch (error) {
      console.warn("createInvoiceForJob: could not fetch receipt url:", error.message);
    }
  }

  const { modelAmount, platformFee, clientAmount, currency } = job.payment;
  const place = [job.city, job.county || job.state, job.country].filter(Boolean).join(", ");

  await db().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;

    const invoiceNumber = await allocateInvoiceNumber(tx);

    tx.set(ref, {
      invoiceNumber,
      status: "paid",
      clientId: job.userId,
      organisationId: job.organisationId || null,
      jobId,
      jobReference: job.reference || "",
      jobTitle: job.title || "",
      jobLocation: place,
      modelName: job.awardedTo?.modelName || "",
      currency,
      lines: [
        { description: `Booking: ${job.title || job.reference}${job.awardedTo?.modelName ? ` (${job.awardedTo.modelName})` : ""}`, amount: modelAmount },
        { description: "Platform fee", amount: platformFee },
      ],
      total: clientAmount,
      refundedAmount: 0,
      billTo: billToSnapshot(client),
      issuer: issuer(),
      stripePaymentIntentId: paymentIntent.id,
      receiptUrl,
      issuedAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
    });
  });
  return ref.id;
};

/**
 * Issue a membership invoice for one 30-day period. Safe to call twice with the same id: returns the existing one.
 *
 * @param {object} p
 * @param {string} p.id            document id, which makes it idempotent (membership_<uid>_<yyyymmdd> or membership_stripe_<id>)
 * @param {string} p.clientId
 * @param {object} p.client        users document data (bill-to snapshot and organisation)
 * @param {string} p.tier          subscription tier id
 * @param {string} p.tierName
 * @param {"free"|"no_charge"|"stripe"} p.source
 * @param {Array<{description: string, amount: number}>} p.lines  pence; negative for a discount
 * @param {number} p.total         pence
 * @param {string} [p.currency]
 * @param {Date} p.periodStart
 * @param {Date} p.periodEnd
 * @param {string|null} [p.voucherCode]
 * @param {string|null} [p.stripeInvoiceId]
 * @param {string|null} [p.receiptUrl]
 * @returns {Promise<string>} the invoice id
 */
const createMembershipInvoice = async (p) => {
  const ref = db().collection("invoices").doc(p.id);
  if ((await ref.get()).exists) return ref.id;

  await db().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const invoiceNumber = await allocateInvoiceNumber(tx);

    tx.set(ref, {
      type: "membership",
      invoiceNumber,
      status: "paid",
      clientId: p.clientId,
      organisationId: p.client.organisationId || null,
      jobId: null,
      jobReference: "",
      jobTitle: `${p.tierName} membership`,
      jobLocation: "",
      modelName: "",
      currency: p.currency || "GBP",
      lines: p.lines,
      total: p.total,
      refundedAmount: 0,
      billTo: billToSnapshot(p.client),
      issuer: issuer(),
      membership: {
        tier: p.tier,
        tierName: p.tierName,
        source: p.source,
        voucherCode: p.voucherCode || null,
        periodStart: admin.firestore.Timestamp.fromDate(p.periodStart),
        periodEnd: admin.firestore.Timestamp.fromDate(p.periodEnd),
      },
      stripeInvoiceId: p.stripeInvoiceId || null,
      receiptUrl: p.receiptUrl || null,
      issuedAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
    });
  });
  return ref.id;
};

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const money = (pence, currency = "GBP") =>
  `${pence < 0 ? "-" : ""}${{ GBP: "£", EUR: "€", USD: "$" }[currency] || `${currency} `}${(Math.abs(pence) / 100).toFixed(2)}`;
const dateText = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : new Date();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/** @returns {Promise<Buffer>} */
const renderInvoicePdf = (invoice) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Invoice ${invoice.invoiceNumber}`, Author: invoice.issuer?.name || "The Model Cloud" } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 50;
    const right = 545;
    const grey = "#666666";

    // Header
    doc.fillColor("#111111").fontSize(22).font("Helvetica-Bold").text("INVOICE", left, 50);
    doc.fontSize(10).font("Helvetica").fillColor(grey)
      .text(`Invoice number: ${invoice.invoiceNumber}`, left, 80)
      .text(`Date: ${dateText(invoice.issuedAt)}`, left, 94)
      .text(`Status: ${String(invoice.status).replace(/_/g, " ").toUpperCase()}`, left, 108);

    const from = invoice.issuer || {};
    doc.fillColor("#111111").font("Helvetica-Bold").fontSize(11).text(from.name || "The Model Cloud", 340, 50, { width: 205, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(grey);
    [...(from.address || []), from.companyNumber && `Company no. ${from.companyNumber}`, from.vatNumber && `VAT no. ${from.vatNumber}`, from.email]
      .filter(Boolean)
      .forEach((line) => doc.text(line, 340, doc.y, { width: 205, align: "right" }));

    // Bill to
    const billTo = invoice.billTo || {};
    doc.moveDown(2);
    let y = Math.max(doc.y, 150);
    doc.fillColor(grey).font("Helvetica-Bold").fontSize(9).text("BILL TO", left, y);
    doc.fillColor("#111111").font("Helvetica").fontSize(10);
    [billTo.companyName, billTo.name, billTo.addressLine1, billTo.addressLine2, [billTo.city, billTo.postcode].filter(Boolean).join(" "), billTo.country, billTo.vatNumber && `VAT no. ${billTo.vatNumber}`, billTo.email]
      .filter(Boolean)
      .forEach((line) => doc.text(line, left, doc.y));

    // Job, or the membership period
    y = doc.y + 20;
    if (invoice.type === "membership") {
      doc.fillColor(grey).font("Helvetica-Bold").fontSize(9).text("MEMBERSHIP", left, y);
      doc.fillColor("#111111").font("Helvetica").fontSize(10).text(`${invoice.membership?.tierName || "Membership"} plan`, left, doc.y);
      doc.fillColor(grey).text(`Period: ${dateText(invoice.membership?.periodStart)} to ${dateText(invoice.membership?.periodEnd)}`, left, doc.y);
    } else {
      doc.fillColor(grey).font("Helvetica-Bold").fontSize(9).text("JOB", left, y);
      doc.fillColor("#111111").font("Helvetica").fontSize(10)
        .text(`${invoice.jobTitle}${invoice.jobReference ? ` (${invoice.jobReference})` : ""}`, left, doc.y);
      if (invoice.jobLocation) doc.fillColor(grey).text(invoice.jobLocation, left, doc.y);
    }

    // Lines
    y = doc.y + 25;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#dddddd").stroke();
    doc.fillColor(grey).font("Helvetica-Bold").fontSize(9).text("DESCRIPTION", left, y + 8).text("AMOUNT", left, y + 8, { width: right - left, align: "right" });
    y += 26;
    doc.moveTo(left, y).lineTo(right, y).stroke();
    y += 10;
    doc.font("Helvetica").fontSize(10).fillColor("#111111");
    (invoice.lines || []).forEach((line) => {
      doc.text(line.description, left, y, { width: 380 }).text(money(line.amount, invoice.currency), left, y, { width: right - left, align: "right" });
      y = Math.max(doc.y, y + 16) + 6;
    });
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#dddddd").stroke();
    y += 10;
    doc.font("Helvetica-Bold").fontSize(12)
      .text(invoice.total === 0 ? "Total due" : "Total paid", left, y).text(money(invoice.total, invoice.currency), left, y, { width: right - left, align: "right" });

    if (invoice.refundedAmount > 0) {
      y += 22;
      doc.font("Helvetica").fontSize(10).fillColor(grey)
        .text("Refunded", left, y).text(`-${money(invoice.refundedAmount, invoice.currency)}`, left, y, { width: right - left, align: "right" });
    }

    // Footer
    const footerLead =
      invoice.type === "membership" && invoice.membership?.source !== "stripe"
        ? "No payment is due for this period."
        : `Paid by card or bank transfer via Stripe${invoice.stripePaymentIntentId ? ` (ref ${invoice.stripePaymentIntentId})` : ""}.`;
    doc.fillColor(grey).font("Helvetica").fontSize(8).text(`${footerLead} ${from.footer || ""}`.trim(), left, 770, {
      width: right - left,
      align: "center",
    });
    doc.end();
  });

// ---------------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------------

/** Download an invoice as a PDF (returned as base64 for the browser to save). */
exports.getInvoicePdf = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
  const { invoiceId } = request.data || {};
  if (!invoiceId) throw new HttpsError("invalid-argument", "Invoice ID is required");

  const snap = await db().collection("invoices").doc(invoiceId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Invoice not found");
  const invoice = snap.data();

  const callerSnap = await db().collection("users").doc(request.auth.uid).get();
  const caller = callerSnap.data() || {};
  const allowed =
    invoice.clientId === request.auth.uid ||
    ["admin", "super admin"].includes(caller.role) ||
    (caller.role === "account manager" && invoice.organisationId && caller.organisationId === invoice.organisationId);
  if (!allowed) throw new HttpsError("permission-denied", "You cannot view this invoice");

  const pdf = await renderInvoicePdf(invoice);
  return { filename: `${invoice.invoiceNumber}.pdf`, base64: pdf.toString("base64") };
});

const PAID_STATUSES = ["held", "authorized", "released", "partially_released", "captured", "partial_captured"];

/**
 * Issue any missing invoices for the signed-in user's own paid jobs (those paid before invoices existed, or
 * where issuing failed at the time). The Payments page calls this when it loads. Only touches the caller's jobs.
 */
exports.ensureMyInvoices = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
  if (!core.stripe) return { created: 0 };

  const callerSnap = await db().collection("users").doc(request.auth.uid).get();
  const caller = callerSnap.data() || {};

  const queries = [db().collection("jobs").where("userId", "==", request.auth.uid).get()];
  if (caller.role === "account manager" && caller.organisationId) {
    queries.push(db().collection("jobs").where("organisationId", "==", caller.organisationId).get());
  }
  const jobs = new Map();
  (await Promise.all(queries)).forEach((snap) => snap.docs.forEach((d) => jobs.set(d.id, d.data())));

  let created = 0;
  for (const [jobId, job] of jobs) {
    if (!PAID_STATUSES.includes(job.payment?.status) || !job.payment?.paymentIntentId) continue;
    if ((await invoiceRef(jobId).get()).exists) continue;
    try {
      const pi = await core.stripe.paymentIntents.retrieve(job.payment.paymentIntentId);
      await createInvoiceForJob(jobId, job, pi);
      created += 1;
    } catch (error) {
      console.error(`ensureMyInvoices: job ${jobId} failed:`, error.message);
    }
  }
  return { created };
});

/** Super admin: issue invoices for jobs that were paid before invoices existed. Dry run by default. */
exports.adminBackfillInvoices = onCall({ timeoutSeconds: 300 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in");
  const callerSnap = await db().collection("users").doc(request.auth.uid).get();
  if (callerSnap.data()?.role !== "super admin") throw new HttpsError("permission-denied", "Super admin access required");

  const { dryRun = true } = request.data || {};
  const snap = await db().collection("jobs").where("payment.status", "in", PAID_STATUSES).get();

  const missing = [];
  for (const doc of snap.docs) {
    if (!(await invoiceRef(doc.id).get()).exists) missing.push(doc);
  }
  if (dryRun) return { dryRun: true, paidJobs: snap.size, invoicesMissing: missing.length };

  let created = 0;
  for (const doc of missing) {
    const job = doc.data();
    if (!job.payment?.paymentIntentId || !core.stripe) continue;
    try {
      const pi = await core.stripe.paymentIntents.retrieve(job.payment.paymentIntentId);
      await createInvoiceForJob(doc.id, job, pi);
      created += 1;
    } catch (error) {
      console.error(`Backfill invoice failed for job ${doc.id}:`, error.message);
    }
  }
  return { dryRun: false, paidJobs: snap.size, invoicesMissing: missing.length, created };
});

module.exports.createInvoiceForJob = createInvoiceForJob;
module.exports.createMembershipInvoice = createMembershipInvoice;
module.exports.renderInvoicePdf = renderInvoicePdf;
