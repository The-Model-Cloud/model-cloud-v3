// Must match functions/email/consent.js (MARKETING_PREFERENCE_KEYS) and functions/email/audience.js
export const CATEGORIES = [
  { key: "newLaunches", label: "New launches and projects" },
  { key: "productUpdates", label: "Monthly product updates" },
  { key: "newsletter", label: "Newsletter" },
];

export const AUDIENCES = [
  { key: "models", label: "Models" },
  { key: "clients", label: "Clients (includes account managers)" },
  { key: "all", label: "Models and clients" },
];

export const STATUS_META = {
  draft: { label: "Draft", color: "default" },
  scheduled: { label: "Scheduled", color: "info" },
  sending: { label: "Sending", color: "warning" },
  sent: { label: "Sent", color: "success" },
  paused: { label: "Paused", color: "warning" },
  cancelled: { label: "Cancelled", color: "error" },
};

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || key;
export const audienceLabel = (key) => AUDIENCES.find((a) => a.key === key)?.label || key;

// Dates from the backend are epoch milliseconds
export const fmtDateTime = (ms) =>
  ms
    ? new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export const pct = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—");
