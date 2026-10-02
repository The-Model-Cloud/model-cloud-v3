// Shared helpers for the Vouchers & Billing admin page

// Default end of the current offer; always editable
export const DEFAULT_UNTIL = "2026-12-31";
export const WARNING_DAYS = 30;
export const DAY_MS = 24 * 60 * 60 * 1000;

// Individual clients use the subscription tiers; organisations use the organisation tiers
export const USER_TIERS = [
  { id: "starter", label: "Starter (£49.99/mo)" },
  { id: "premium", label: "Professional / Premium (£99.99/mo)" },
  { id: "agency", label: "Agency (£149.99/mo)" },
];
export const ORG_TIERS = [
  { id: "starter", label: "Starter" },
  { id: "professional", label: "Professional" },
  { id: "enterprise", label: "Enterprise" },
  { id: "agency", label: "Agency" },
];
export const TIER_LABEL = {
  free: "Free",
  starter: "Starter",
  premium: "Professional",
  professional: "Professional",
  enterprise: "Enterprise",
  agency: "Agency",
};

// Dates are stored as Firestore Timestamps or ISO strings
export const toDate = (value) => {
  if (!value) return null;
  const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const fmt = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

export const errorMessage = (err) => err?.message?.replace(/^.*?:\s*/, "") || "Something went wrong";

export const endingSoon = (date) => !!date && date.getTime() > Date.now() && date.getTime() <= Date.now() + WARNING_DAYS * DAY_MS;
export const hasEnded = (date) => !!date && date.getTime() <= Date.now();

export const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** What a client pays today. Paying = a live Stripe subscription. */
export const billingStatus = (sub) => {
  const s = sub || {};
  const comp = s.complimentary;
  const compUntil = comp?.enabled ? toDate(comp.until) : null;

  if (s.stripeSubscriptionId && ["active", "trialing"].includes(s.status)) {
    return { key: "paying", label: "Paying", color: "success" };
  }
  if (s.stripeSubscriptionId && s.status === "past_due") {
    return { key: "paying", label: "Payment failed", color: "error" };
  }
  if (compUntil && compUntil > new Date()) {
    return { key: "nocharge", label: "No charge", color: "info" };
  }
  if (s.managedSeat) {
    return { key: "other", label: "Agency seat", color: "default" };
  }
  if (s.status === "expired" || s.status === "past_due") {
    return { key: "other", label: "Expired", color: "warning" };
  }
  return { key: "free", label: "Free", color: "default" };
};

/** One row of the Clients list, built from a users document */
export const buildClientRow = (docSnap) => {
  const u = docSnap.data();
  const sub = u.subscription || {};
  const comp = sub.complimentary?.enabled ? sub.complimentary : null;
  const voucher = sub.voucher || null;
  const viaOrganisation = !!comp?.organisationId && !voucher;

  // The date the free time runs out: the no-charge end date, or the end of a Stripe coupon
  const endsAt = comp ? toDate(comp.until) : voucher ? toDate(voucher.until) : null;

  return {
    uid: docSnap.id,
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
    email: u.email || "",
    company: u.companyName || "",
    role: u.role,
    tier: sub.tier || "free",
    billing: billingStatus(sub),
    paying: !!sub.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(sub.status),
    voucherCode: voucher?.code || "",
    voucherMethod: voucher?.mode || (viaOrganisation ? "organisation" : ""),
    endsAt,
    reason: comp?.reason || "",
    viaOrganisation,
  };
};
