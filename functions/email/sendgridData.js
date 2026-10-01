const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
const { SUPPRESSION_REASONS, CONSENT_STATUS, optOut, normaliseEmail, suppressionId } = require("./consent");
const { bounceFlag, isDeadDomainBlock } = require("./bounces");

/**
 * Read-only views of SendGrid's own data (stats, per-email activity, suppression lists) for the
 * "Email Delivery" admin page, so nobody has to log in to SendGrid. The API key stays on the server.
 *
 * Note SendGrid's Email Activity API is limited to 6 requests per minute, so results are cached briefly.
 */

const db = () => admin.firestore();
const API = "https://api.sendgrid.com/v3";
const ADMIN_ROLES = ["admin", "super admin"];

const requireRole = async (request, roles) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const snap = await db().collection("users").doc(request.auth.uid).get();
  if (!roles.includes(snap.data()?.role)) throw new HttpsError("permission-denied", "Admin access required.");
  return snap;
};

const cache = new Map();
const cached = async (key, ttlMs, fn) => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await fn();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
};

const sg = async (path, params) => {
  if (!process.env.SENDGRID_API_KEY) throw new HttpsError("failed-precondition", "SendGrid is not configured.");
  try {
    const res = await axios.get(`${API}${path}`, {
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
      params,
      paramsSerializer: { indexes: null },
      timeout: 25000,
    });
    return res.data;
  } catch (error) {
    const status = error.response?.status;
    if (status === 429) throw new HttpsError("resource-exhausted", "SendGrid is rate limiting this request. Wait a minute and try again.");
    if (status === 401 || status === 403) throw new HttpsError("failed-precondition", "The SendGrid API key does not have permission for this data.");
    console.error(`SendGrid GET ${path} failed:`, status, error.response?.data || error.message);
    throw new HttpsError("internal", "Could not fetch data from SendGrid.");
  }
};

const isoDay = (d) => d.toISOString().slice(0, 10);

const sumMetrics = (rows) => {
  const totals = {};
  rows.forEach((r) => Object.entries(r.metrics).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; }));
  return totals;
};

// ---------------------------------------------------------------------------
// Stats (totals and daily series)
// ---------------------------------------------------------------------------

exports.sendgridStats = onCall(async (request) => {
  await requireRole(request, ADMIN_ROLES);
  const days = Math.min(Math.max(parseInt(request.data?.days, 10) || 30, 1), 365);
  const end = new Date();
  const start = new Date(Date.now() - (days - 1) * 86400000);
  const range = { start_date: isoDay(start), end_date: isoDay(end) };

  const daily = await cached(`stats:${range.start_date}:${range.end_date}`, 60000, () =>
    sg("/stats", { ...range, aggregated_by: "day" })
  );
  const series = daily.map((d) => ({ date: d.date, ...sumMetrics(d.stats) }));

  // Breakdown by the categories we tag on every email (service, marketing, campaign, migration-optin...)
  let byCategory = [];
  try {
    const sums = await cached(`catsums:${range.start_date}:${range.end_date}`, 60000, () =>
      sg("/categories/stats/sums", { ...range, sort_by_metric: "requests", sort_by_direction: "desc", limit: 25 })
    );
    byCategory = (sums.stats || []).map((s) => ({ name: s.name, ...s.metrics }));
  } catch (error) {
    console.warn("sendgridStats: category breakdown unavailable:", error.message);
  }

  return { range, series, totals: sumMetrics(series.map((s) => ({ metrics: s }))), byCategory };
});

// ---------------------------------------------------------------------------
// Activity (individual emails)
// ---------------------------------------------------------------------------

const STATUSES = ["processed", "delivered", "not_delivered"];
const safe = (v) => String(v || "").replace(/["\\]/g, "").slice(0, 200);

exports.sendgridActivity = onCall(async (request) => {
  await requireRole(request, ADMIN_ROLES);
  const { status, email } = request.data || {};
  const days = Math.min(Math.max(parseInt(request.data?.days, 10) || 30, 1), 90);
  const limit = Math.min(Math.max(parseInt(request.data?.limit, 10) || 500, 1), 1000);

  const parts = [
    `last_event_time BETWEEN TIMESTAMP "${new Date(Date.now() - days * 86400000).toISOString()}" AND TIMESTAMP "${new Date().toISOString()}"`,
  ];
  if (status) {
    if (!STATUSES.includes(status)) throw new HttpsError("invalid-argument", "Unknown status.");
    parts.push(`status="${status}"`);
  }
  if (email) parts.push(`to_email="${safe(email)}"`);
  const query = parts.join(" AND ");

  const data = await cached(`activity:${query}:${limit}`, 60000, () => sg("/messages", { query, limit }));
  return {
    messages: (data.messages || []).map((m) => ({
      msgId: m.msg_id,
      email: m.to_email,
      subject: m.subject,
      status: m.status,
      opens: m.opens_count || 0,
      clicks: m.clicks_count || 0,
      lastEventTime: m.last_event_time,
    })),
    truncated: (data.messages || []).length >= limit,
  };
});

exports.sendgridMessage = onCall(async (request) => {
  await requireRole(request, ADMIN_ROLES);
  const msgId = safe((request.data || {}).msgId);
  if (!msgId) throw new HttpsError("invalid-argument", "Message id required.");
  const m = await cached(`message:${msgId}`, 60000, () => sg(`/messages/${msgId}`));
  return {
    msgId: m.msg_id,
    email: m.to_email,
    subject: m.subject,
    status: m.status,
    opens: m.opens_count || 0,
    clicks: m.clicks_count || 0,
    events: (m.events || []).map((e) => ({
      event: e.event_name,
      at: e.processed,
      reason: e.reason || null,
      url: e.url || null,
      bounceType: e.bounce_type || null,
      userAgent: e.http_user_agent || null,
    })),
  };
});

// ---------------------------------------------------------------------------
// Suppression lists (bounces, blocks, spam reports, invalid addresses, unsubscribes)
// ---------------------------------------------------------------------------

const LISTS = {
  bounces: "/suppression/bounces",
  blocks: "/suppression/blocks",
  spam_reports: "/suppression/spam_reports",
  invalid_emails: "/suppression/invalid_emails",
  unsubscribes: "/suppression/unsubscribes",
};
const PAGE = 500;
const MAX_PAGES = 10;

const fetchList = (type) =>
  cached(`list:${type}`, 60000, async () => {
    const all = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const rows = await sg(LISTS[type], { limit: PAGE, offset: page * PAGE });
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
    return all.map((r) => ({
      email: r.email,
      created: r.created ? r.created * 1000 : null,
      reason: r.reason || null,
      status: r.status || null,
    }));
  });

exports.sendgridSuppressions = onCall(async (request) => {
  await requireRole(request, ADMIN_ROLES);
  const { type } = request.data || {};
  if (type && !LISTS[type]) throw new HttpsError("invalid-argument", "Unknown list.");

  const types = Object.keys(LISTS);
  const lists = await Promise.all(types.map((t) => fetchList(t)));
  const counts = Object.fromEntries(types.map((t, i) => [t, lists[i].length]));
  return { counts, list: type ? lists[types.indexOf(type)] : null };
});

/**
 * Copy SendGrid's suppression lists into our own, so our sends and reports respect them too.
 * bounces + invalid addresses -> bounce (blocks all email); spam reports -> spam_report (blocks all email,
 * and the user is opted out); unsubscribes -> unsubscribe (marketing).
 * Blocks are normally temporary and are not copied, except those showing the recipient's domain cannot
 * receive mail at all (no MX records), which are treated as bounces.
 *
 * Users whose current address bounced are also flagged (users/{uid}.emailBounced) so the platform can ask them
 * to update it. Flagging happens even when the address was already suppressed, so re-running is useful.
 *
 * Everything is read once up front and written in batches, so ~1000 addresses take seconds, not minutes.
 */
exports.sendgridSyncSuppressions = onCall({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
  await requireRole(request, ["super admin"]);

  const [bounces, invalid, spam, unsubs, blocks] = await Promise.all(
    ["bounces", "invalid_emails", "spam_reports", "unsubscribes", "blocks"].map((t) => fetchList(t))
  );
  const deadDomains = blocks.filter((b) => isDeadDomainBlock(b.reason));

  const [usersSnap, suppSnap] = await Promise.all([
    db().collection("users").get(),
    db().collection("emailSuppressions").select().get(), // ids only (sha256 of the address)
  ]);
  const byEmail = new Map();
  usersSnap.docs.forEach((d) => {
    const e = normaliseEmail(d.data().email);
    if (e) byEmail.set(e, d);
  });
  const existing = new Set(suppSnap.docs.map((d) => d.id));

  const result = { added: 0, alreadySuppressed: 0, optedOut: 0, flagged: 0 };
  const ops = []; // { ref, kind: "set" | "update", data }
  const flagged = new Set();
  const toOptOut = new Map(); // uid -> email

  const process = (rows, reason, { optOutUser = false, flagUser = false } = {}) => {
    for (const row of rows) {
      const email = normaliseEmail(row.email);
      if (!email) continue;
      const user = byEmail.get(email);
      const id = suppressionId(email);

      if (existing.has(id)) {
        result.alreadySuppressed += 1;
      } else {
        existing.add(id);
        ops.push({
          ref: db().collection("emailSuppressions").doc(id),
          kind: "set",
          data: {
            email, reason, source: "sendgrid-sync", ...(user ? { uid: user.id } : {}),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
        result.added += 1;
      }

      if (flagUser && user && !flagged.has(user.id) && normaliseEmail(user.data().emailBounced?.email) !== email) {
        flagged.add(user.id);
        ops.push({ ref: user.ref, kind: "update", data: { emailBounced: bounceFlag(email, row.reason, "sendgrid-sync") } });
        result.flagged += 1;
      }
      if (optOutUser && user && user.data().marketingConsent?.status !== CONSENT_STATUS.OPTED_OUT) {
        toOptOut.set(user.id, email);
      }
    }
  };

  process(bounces, SUPPRESSION_REASONS.BOUNCE, { flagUser: true });
  process(invalid, SUPPRESSION_REASONS.BOUNCE, { flagUser: true });
  process(deadDomains, SUPPRESSION_REASONS.BOUNCE, { flagUser: true });
  process(spam, SUPPRESSION_REASONS.SPAM_REPORT, { optOutUser: true });
  process(unsubs, SUPPRESSION_REASONS.UNSUBSCRIBE, { optOutUser: true });

  for (let i = 0; i < ops.length; i += 400) {
    const batch = db().batch();
    ops.slice(i, i + 400).forEach((op) => (op.kind === "set" ? batch.set(op.ref, op.data, { merge: true }) : batch.update(op.ref, op.data)));
    await batch.commit();
  }

  // Few people are involved here (spam reporters and unsubscribers), so the per-user helper is fine
  for (const [uid, email] of toOptOut) {
    await optOut(db(), uid, email, "sendgrid-sync");
    result.optedOut += 1;
  }

  cache.clear();
  return result;
});
