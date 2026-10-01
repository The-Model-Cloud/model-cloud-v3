const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { verifyToken } = require("./tokens");
const { CONSENT_STATUS, SUPPRESSION_REASONS, addSuppression, optOut } = require("./consent");
const { flagBouncedUser } = require("./bounces");

const db = () => admin.firestore();
const { FieldValue } = admin.firestore;

/**
 * Site visits from campaign emails. Links to our own sites carry a signed token (?ec=...).
 * The platform calls this once per browser session when it loads with that parameter.
 */
exports.recordEmailVisit = onCall({ cors: true }, async (request) => {
  const { token, path } = request.data || {};
  const payload = verifyToken(token);
  if (!payload?.c || !payload?.u) return { ok: false };

  const campaignRef = db().collection("emailCampaigns").doc(payload.c);
  const recipientRef = campaignRef.collection("recipients").doc(payload.u);

  const first = await db().runTransaction(async (tx) => {
    const recipient = await tx.get(recipientRef);
    if (!recipient.exists) return null;
    const isFirst = !recipient.data().visitedAt;
    tx.update(recipientRef, {
      visitCount: FieldValue.increment(1),
      lastVisitAt: FieldValue.serverTimestamp(),
      ...(isFirst ? { visitedAt: FieldValue.serverTimestamp() } : {}),
    });
    tx.update(campaignRef, {
      "counts.visits": FieldValue.increment(1),
      ...(isFirst ? { "counts.visitors": FieldValue.increment(1) } : {}),
    });
    return isFirst;
  });
  if (first === null) return { ok: false };

  await campaignRef.collection("events").add({
    type: "visit",
    uid: payload.u,
    path: String(path || "").slice(0, 200),
    at: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

// ---------------------------------------------------------------------------
// SendGrid Event Webhook
// ---------------------------------------------------------------------------

/**
 * Verify SendGrid's signed webhook (ECDSA). The public key is the base64 value shown in
 * SendGrid > Settings > Mail Settings > Event Webhook > Signature Verification.
 */
const verifySignature = (req) => {
  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
  const signature = req.get("X-Twilio-Email-Event-Webhook-Signature");
  const timestamp = req.get("X-Twilio-Email-Event-Webhook-Timestamp");
  if (!publicKey || !signature || !timestamp || !req.rawBody) return false;
  try {
    const key = crypto.createPublicKey({ key: Buffer.from(publicKey, "base64"), format: "der", type: "spki" });
    return crypto.verify(
      "sha256",
      Buffer.concat([Buffer.from(timestamp), req.rawBody]),
      key,
      Buffer.from(signature, "base64")
    );
  } catch (error) {
    console.error("sendgridWebhook: signature check error:", error.message);
    return false;
  }
};

const EVENT_FIELDS = {
  delivered: { field: "deliveredAt", count: "delivered" },
  open: { field: "openedAt", count: "opened", repeat: "openCount" },
  click: { field: "clickedAt", count: "clicked", repeat: "clickCount" },
  bounce: { field: "bouncedAt", count: "bounced" },
  dropped: { field: "droppedAt", count: "dropped" },
  spamreport: { field: "spamAt", count: "spam" },
  unsubscribe: { field: "unsubscribedAt", count: "unsubscribed" },
};

/** Record one campaign event. Idempotent on sg_event_id, so SendGrid retries never double-count. */
const recordCampaignEvent = async (item) => {
  const spec = EVENT_FIELDS[item.event];
  if (!spec) return;

  const campaignRef = db().collection("emailCampaigns").doc(item.campaignId);
  const recipientRef = campaignRef.collection("recipients").doc(item.uid);
  const eventRef = campaignRef.collection("events").doc(String(item.sg_event_id || `${item.event}-${item.timestamp}-${item.uid}`).replace(/\//g, "_"));

  await db().runTransaction(async (tx) => {
    const [eventSnap, recipientSnap] = await Promise.all([tx.get(eventRef), tx.get(recipientRef)]);
    if (eventSnap.exists || !recipientSnap.exists) return;

    const recipient = recipientSnap.data();
    const update = {};
    const counts = {};
    if (!recipient[spec.field]) {
      update[spec.field] = admin.firestore.Timestamp.fromMillis((item.timestamp || Date.now() / 1000) * 1000);
      counts[`counts.${spec.count}`] = FieldValue.increment(1);
    }
    if (spec.repeat) update[spec.repeat] = FieldValue.increment(1);
    if (item.event === "bounce" || item.event === "dropped") update.failureReason = String(item.reason || item.type || "").slice(0, 300);

    tx.set(eventRef, {
      type: item.event,
      uid: item.uid,
      url: item.event === "click" ? item.url || null : null,
      at: admin.firestore.Timestamp.fromMillis((item.timestamp || Date.now() / 1000) * 1000),
    });
    if (Object.keys(update).length) tx.update(recipientRef, update);
    if (Object.keys(counts).length) tx.update(campaignRef, counts);
  });
};

/** Bounces, spam reports and unsubscribes apply to every email we send, campaign or not. */
const applyEventToSuppression = async (item) => {
  if (!item.uid || !item.email) return;
  if (item.event === "bounce" && item.type !== "blocked") {
    await addSuppression(db(), item.email, SUPPRESSION_REASONS.BOUNCE, { uid: item.uid, source: "sendgrid" });
    await flagBouncedUser(db(), item.uid, item.email, item.reason, "webhook");
  } else if (item.event === "spamreport") {
    await addSuppression(db(), item.email, SUPPRESSION_REASONS.SPAM_REPORT, { uid: item.uid, source: "sendgrid" });
    await optOutIfNeeded(item.uid, item.email);
  } else if (item.event === "unsubscribe") {
    await optOutIfNeeded(item.uid, item.email);
  }
};

const optOutIfNeeded = async (uid, email) => {
  const snap = await db().collection("users").doc(uid).get();
  if (snap.exists && snap.data().marketingConsent?.status !== CONSENT_STATUS.OPTED_OUT) {
    await optOut(db(), uid, email, "sendgrid-event");
  }
};

exports.sendgridWebhook = onRequest({ region: "europe-west2", cors: false }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST only");
    return;
  }
  if (!process.env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
    // Not configured yet: refuse (SendGrid retries), never accept unsigned events.
    res.status(503).send("Webhook not configured");
    return;
  }
  if (!verifySignature(req)) {
    res.status(401).send("Invalid signature");
    return;
  }

  const events = Array.isArray(req.body) ? req.body : [];
  for (const item of events) {
    try {
      if (item.campaignId && item.uid) await recordCampaignEvent(item);
      await applyEventToSuppression(item);
    } catch (error) {
      console.error("sendgridWebhook: event failed:", item.event, error.message);
    }
  }
  res.status(200).send("ok");
});
