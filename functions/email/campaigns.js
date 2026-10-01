const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { signToken } = require("./tokens");
const { MARKETING_PREFERENCE_KEYS } = require("./consent");
const { sendToUser } = require("./send");
const { AUDIENCE_ROLES } = require("./audience");
const { renderCampaignEmail, applyMerge } = require("./render");

/**
 * Email campaigns.
 *
 * emailCampaigns/{id}                  the campaign (status: draft | scheduled | sending | sent | paused | cancelled)
 * emailCampaigns/{id}/recipients/{uid} one row per person (status: queued | sending | sent | skipped | failed)
 * emailCampaigns/{id}/events/{id}      opens, clicks, visits, bounces (written by tracking.js)
 *
 * All access goes through these callables (admin / super admin only); Firestore rules stay closed
 * for these collections.
 */

const db = () => admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

const ADMIN_ROLES = ["admin", "super admin"];
const BATCH_SIZE = 50;
const RUN_BUDGET_MS = 240 * 1000; // scheduled run is limited to 300s
const LOCK_MS = 270 * 1000;

const emptyCounts = () => ({
  recipients: 0, sent: 0, failed: 0, skipped: 0,
  delivered: 0, opened: 0, clicked: 0, bounced: 0, dropped: 0, spam: 0, unsubscribed: 0,
  visitors: 0, visits: 0,
});

const requireAdmin = async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const snap = await db().collection("users").doc(request.auth.uid).get();
  if (!ADMIN_ROLES.includes(snap.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return snap;
};

/** Firestore Timestamps to millis, recursively, so results are plain JSON. */
const plain = (value) => {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  }
  return value;
};

const clean = (value, max) => String(value ?? "").trim().slice(0, max);

const readFields = (data) => {
  const category = data.category;
  const audience = data.audience;
  if (category && !MARKETING_PREFERENCE_KEYS.includes(category)) throw new HttpsError("invalid-argument", "Unknown category.");
  if (audience && !AUDIENCE_ROLES[audience]) throw new HttpsError("invalid-argument", "Unknown audience.");
  return {
    name: clean(data.name, 120),
    subject: clean(data.subject, 200),
    preheader: clean(data.preheader, 200),
    category: category || "newsletter",
    audience: audience || "all",
    html: String(data.html ?? "").slice(0, 200000),
  };
};

const getCampaign = async (id) => {
  if (!id) throw new HttpsError("invalid-argument", "Campaign id required.");
  const ref = db().collection("emailCampaigns").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Campaign not found.");
  return { ref, data: snap.data() };
};

/** Everyone who would receive a campaign right now: opted in, right group, category switched on. */
const findEligible = async (category, audience) => {
  const snap = await db().collection("users").where("marketingConsent.status", "==", "opted_in").get();
  return snap.docs.filter((d) => {
    const u = d.data();
    return u.email && AUDIENCE_ROLES[audience].includes(u.role) && u.marketingPreferences?.[category] === true;
  });
};

// ---------------------------------------------------------------------------
// Admin callables
// ---------------------------------------------------------------------------

exports.emailCampaignSave = onCall(async (request) => {
  const caller = await requireAdmin(request);
  const { id } = request.data || {};
  const fields = readFields(request.data || {});
  if (!fields.name) throw new HttpsError("invalid-argument", "Give the campaign a name.");

  if (id) {
    const { ref, data } = await getCampaign(id);
    if (data.status !== "draft") throw new HttpsError("failed-precondition", "Only drafts can be edited.");
    await ref.update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
    return { id };
  }

  const ref = await db().collection("emailCampaigns").add({
    ...fields,
    status: "draft",
    counts: emptyCounts(),
    createdBy: request.auth.uid,
    createdByName: `${caller.data().firstName || ""} ${caller.data().lastName || ""}`.trim(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});

exports.emailCampaignList = onCall(async (request) => {
  await requireAdmin(request);
  const snap = await db().collection("emailCampaigns").orderBy("createdAt", "desc").limit(100).get();
  return {
    campaigns: snap.docs.map((d) => {
      const { html, ...rest } = d.data(); // list view doesn't need the body
      return { id: d.id, ...plain(rest) };
    }),
  };
});

exports.emailCampaignGet = onCall(async (request) => {
  await requireAdmin(request);
  const { id, withRecipients = false } = request.data || {};
  const { ref, data } = await getCampaign(id);

  const result = { campaign: { id, ...plain(data) } };
  if (!withRecipients) return result;

  const [recipients, clicks] = await Promise.all([
    ref.collection("recipients").limit(2000).get(),
    ref.collection("events").where("type", "==", "click").limit(5000).get(),
  ]);

  const byUrl = new Map();
  clicks.docs.forEach((d) => {
    const { url, uid } = d.data();
    if (!url) return;
    const entry = byUrl.get(url) || { url, clicks: 0, people: new Set() };
    entry.clicks += 1;
    entry.people.add(uid);
    byUrl.set(url, entry);
  });

  result.topLinks = [...byUrl.values()]
    .map((e) => ({ url: e.url, clicks: e.clicks, people: e.people.size }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);
  result.recipients = recipients.docs.map((d) => ({ uid: d.id, ...plain(d.data()) }));
  return result;
});

exports.emailCampaignAudienceCount = onCall(async (request) => {
  await requireAdmin(request);
  const fields = readFields(request.data || {});
  const eligible = await findEligible(fields.category, fields.audience);
  return { count: eligible.length };
});

exports.emailCampaignPreview = onCall(async (request) => {
  await requireAdmin(request);
  const fields = readFields(request.data || {});
  const rendered = renderCampaignEmail({
    html: fields.html,
    preheader: fields.preheader,
    firstName: "Alex",
    lastName: "Example",
  });
  const footer =
    '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;color:#888;text-align:center;">' +
    "You are receiving this email because you opted in to updates from The Model Cloud.<br>Unsubscribe &middot; Manage email preferences</div>";
  return {
    subject: applyMerge(fields.subject, { firstName: "Alex", lastName: "Example" }, { plain: true }),
    html: rendered.wrap(`${rendered.inner}${footer}`),
  };
});

exports.emailCampaignSendTest = onCall(async (request) => {
  const caller = await requireAdmin(request);
  const fields = readFields(request.data || {});
  if (!fields.subject || !fields.html) throw new HttpsError("invalid-argument", "Add a subject and some content first.");

  const userData = caller.data();
  const rendered = renderCampaignEmail({
    html: fields.html,
    preheader: fields.preheader,
    firstName: userData.firstName,
    lastName: userData.lastName,
  });
  const result = await sendToUser(db(), {
    uid: caller.id,
    userData,
    subject: applyMerge(fields.subject, userData, { plain: true }),
    html: rendered.inner,
    wrap: rendered.wrap,
    text: rendered.text,
    kind: "marketing",
    categories: ["campaign-test"],
    test: true,
  });
  return result;
});

exports.emailCampaignSend = onCall(async (request) => {
  await requireAdmin(request);
  const { id, scheduledAt } = request.data || {};
  const { ref, data } = await getCampaign(id);

  if (!["draft", "paused"].includes(data.status)) {
    throw new HttpsError("failed-precondition", `A ${data.status} campaign cannot be sent.`);
  }
  if (!data.subject || !data.html || !data.category || !data.audience) {
    throw new HttpsError("failed-precondition", "Subject, content, category and audience are all required.");
  }

  const eligible = await findEligible(data.category, data.audience);
  if (data.status === "draft" && eligible.length === 0) {
    throw new HttpsError("failed-precondition", "Nobody is currently eligible for this audience and category.");
  }

  let when = Date.now();
  if (scheduledAt) {
    const parsed = Number(scheduledAt) || Date.parse(scheduledAt);
    if (Number.isNaN(parsed)) throw new HttpsError("invalid-argument", "Invalid schedule time.");
    when = Math.max(parsed, Date.now());
  }

  await ref.update({
    status: data.status === "paused" ? "sending" : "scheduled",
    scheduledAt: Timestamp.fromMillis(when),
    pauseReason: FieldValue.delete(),
    lockUntil: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id, status: data.status === "paused" ? "sending" : "scheduled", estimatedRecipients: eligible.length };
});

exports.emailCampaignCancel = onCall(async (request) => {
  await requireAdmin(request);
  const { ref, data } = await getCampaign((request.data || {}).id);
  if (!["scheduled", "sending", "paused"].includes(data.status)) {
    throw new HttpsError("failed-precondition", `A ${data.status} campaign cannot be cancelled.`);
  }
  // Anyone already emailed stays emailed; the processor stops before the next batch.
  await ref.update({ status: "cancelled", cancelledAt: FieldValue.serverTimestamp(), lockUntil: null });
  return { id: ref.id, status: "cancelled" };
});

exports.emailCampaignDelete = onCall(async (request) => {
  await requireAdmin(request);
  const { ref, data } = await getCampaign((request.data || {}).id);
  if (!["draft", "cancelled"].includes(data.status) || data.counts?.sent > 0) {
    throw new HttpsError("failed-precondition", "Only drafts, or cancelled campaigns that sent nothing, can be deleted.");
  }
  await ref.delete();
  return { id: ref.id };
});

// ---------------------------------------------------------------------------
// Sending engine: runs every minute and works through due campaigns in batches
// ---------------------------------------------------------------------------

/** Claim a campaign for this run (transaction, so overlapping runs never double-send). */
const claim = (ref) =>
  db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || !["scheduled", "sending"].includes(data.status)) return null;
    if (data.lockUntil && data.lockUntil.toMillis() > Date.now()) return null;
    if (data.status === "scheduled" && data.scheduledAt && data.scheduledAt.toMillis() > Date.now()) return null;
    tx.update(ref, { lockUntil: Timestamp.fromMillis(Date.now() + LOCK_MS) });
    return data;
  });

/** Snapshot the audience into the recipients subcollection and move to "sending". */
const startCampaign = async (ref, data) => {
  const eligible = await findEligible(data.category, data.audience);
  for (let i = 0; i < eligible.length; i += 400) {
    const batch = db().batch();
    eligible.slice(i, i + 400).forEach((d) => {
      const u = d.data();
      batch.set(ref.collection("recipients").doc(d.id), {
        email: u.email,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        role: u.role || "",
        status: "queued",
      });
    });
    await batch.commit();
  }
  await ref.update({
    status: eligible.length ? "sending" : "sent",
    startedAt: FieldValue.serverTimestamp(),
    ...(eligible.length ? {} : { completedAt: FieldValue.serverTimestamp() }),
    "counts.recipients": eligible.length,
  });
  return eligible.length;
};

const processCampaign = async (ref) => {
  const claimed = await claim(ref);
  if (!claimed) return;

  const campaignId = ref.id;
  if (claimed.status === "scheduled") {
    const n = await startCampaign(ref, claimed);
    if (n === 0) return;
  }

  const campaign = (await ref.get()).data();
  const deadline = Date.now() + RUN_BUDGET_MS;

  while (Date.now() < deadline) {
    const current = (await ref.get()).data();
    if (current.status !== "sending") break; // cancelled or paused

    const queued = await ref.collection("recipients").where("status", "==", "queued").limit(BATCH_SIZE).get();
    if (queued.empty) {
      await ref.update({ status: "sent", completedAt: FieldValue.serverTimestamp(), lockUntil: null });
      return;
    }

    // Mark first, send second: if this run dies mid-batch, nobody is emailed twice on the retry.
    const marker = db().batch();
    queued.docs.forEach((d) => marker.update(d.ref, { status: "sending" }));
    await marker.commit();

    const tally = { sent: 0, failed: 0, skipped: 0 };
    let pauseReason = null;

    for (const rec of queued.docs) {
      if (pauseReason) {
        await rec.ref.update({ status: "queued" });
        continue;
      }
      const userSnap = await db().collection("users").doc(rec.id).get();
      const u = userSnap.data();

      let outcome;
      if (!u) {
        outcome = { status: "skipped", reason: "user_deleted" };
      } else if (u.marketingPreferences?.[campaign.category] !== true) {
        outcome = { status: "skipped", reason: "category_off" };
      } else {
        const token = signToken({ c: campaignId, u: rec.id });
        const rendered = renderCampaignEmail({
          html: campaign.html,
          preheader: campaign.preheader,
          firstName: u.firstName,
          lastName: u.lastName,
          campaignId,
          token,
        });
        const result = await sendToUser(db(), {
          uid: rec.id,
          userData: u,
          subject: applyMerge(campaign.subject, u, { plain: true }),
          html: rendered.inner,
          wrap: rendered.wrap,
          text: rendered.text,
          kind: "marketing",
          categories: ["campaign"],
          campaignId,
        });
        if (result.sent) outcome = { status: "sent", sentAt: FieldValue.serverTimestamp() };
        else if (["emails_disabled", "sendgrid_not_configured"].includes(result.reason)) {
          pauseReason = result.reason;
          await rec.ref.update({ status: "queued" });
          continue;
        } else if (result.reason === "sendgrid_error") outcome = { status: "failed", reason: result.reason };
        else outcome = { status: "skipped", reason: result.reason };
      }

      await rec.ref.update(outcome);
      tally[outcome.status] += 1;
    }

    await ref.update({
      "counts.sent": FieldValue.increment(tally.sent),
      "counts.failed": FieldValue.increment(tally.failed),
      "counts.skipped": FieldValue.increment(tally.skipped),
    });

    if (pauseReason) {
      await ref.update({ status: "paused", pauseReason, lockUntil: null });
      return;
    }
  }

  // Out of time for this run: release the lock so the next run carries on straight away.
  await ref.update({ lockUntil: null });
};

exports.processEmailCampaigns = onSchedule(
  { schedule: "every 1 minutes", timeoutSeconds: 300, memory: "512MiB", retryCount: 0 },
  async () => {
    const snap = await db().collection("emailCampaigns").where("status", "in", ["scheduled", "sending"]).get();
    for (const doc of snap.docs) {
      try {
        await processCampaign(doc.ref);
      } catch (error) {
        console.error(`processEmailCampaigns: campaign ${doc.id} failed:`, error);
      }
    }
  }
);
