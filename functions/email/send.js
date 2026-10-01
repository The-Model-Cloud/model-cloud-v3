const sgMail = require("@sendgrid/mail");
const { signUserToken } = require("./tokens");
const {
  SUPPRESSION_REASONS,
  canReceiveMarketing,
  getSuppression,
} = require("./consent");

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const APP_URL = process.env.APP_URL || "https://app.themodel.cloud";
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@themodel.cloud";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "The Model Cloud";
// Public URL of the emailOneClickUnsubscribe function (RFC 8058). Optional until deployed.
const ONE_CLICK_URL = process.env.EMAIL_ONECLICK_URL || null;
// Legal requirement for marketing email: a postal address for the sender.
const POSTAL_ADDRESS = process.env.EMAIL_POSTAL_ADDRESS || "";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const preferencesUrl = (uid, extra = "") =>
  `${APP_URL}/email-preferences?t=${encodeURIComponent(signUserToken(uid))}${extra}`;

const isEmailEnabled = async (db) => {
  try {
    const snap = await db.collection("settings").doc("system").get();
    return !snap.exists || snap.data().emailEnabled !== false;
  } catch (error) {
    console.error("Error checking email settings:", error);
    return true;
  }
};

const footerHtml = (uid, kind) => {
  const prefs = preferencesUrl(uid);
  const address = POSTAL_ADDRESS
    ? `<br>${escapeHtml(POSTAL_ADDRESS)}`
    : "";
  const reason =
    kind === "marketing"
      ? "You are receiving this email because you opted in to updates from The Model Cloud."
      : "You are receiving this service email because you have an account with The Model Cloud.";
  const unsubscribe =
    kind === "marketing"
      ? `<a href="${prefs}&a=unsubscribe" style="color:#888;">Unsubscribe</a> &middot; `
      : "";
  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;line-height:1.5;color:#888;text-align:center;">
      ${reason}<br>
      ${unsubscribe}<a href="${prefs}" style="color:#888;">Manage email preferences</a>${address}
    </div>`;
};

/**
 * Single choke point for outbound email to a platform user.
 *
 * kind "service"   - account/transition notices. Sent unless the system toggle is off or the
 *                    address hard-bounced / reported spam.
 * kind "marketing" - promotional email. Additionally requires marketingConsent.status === "opted_in"
 *                    and no unsubscribe suppression. Adds unsubscribe link and List-Unsubscribe headers.
 *
 * Options for campaigns:
 *   campaignId - recorded as a SendGrid custom arg so webhook events can be tied back to the campaign
 *   wrap       - (html) => html, puts content + footer inside the branded template
 *   test       - admin test send: skips the consent and unsubscribe checks, prefixes the subject
 *
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
const sendToUser = async (
  db,
  { uid, userData, subject, html, text, kind = "service", categories = [], campaignId, wrap, test = false }
) => {
  if (!process.env.SENDGRID_API_KEY) return { sent: false, reason: "sendgrid_not_configured" };
  if (!(await isEmailEnabled(db))) return { sent: false, reason: "emails_disabled" };

  const email = userData?.email;
  if (!email) return { sent: false, reason: "no_email" };

  if (kind === "marketing" && !test && !canReceiveMarketing(userData)) {
    return { sent: false, reason: "no_marketing_consent" };
  }

  const suppression = await getSuppression(db, email);
  if (suppression && !(test && suppression.reason === SUPPRESSION_REASONS.UNSUBSCRIBE)) {
    const blocksAll = suppression.reason !== SUPPRESSION_REASONS.UNSUBSCRIBE;
    if (blocksAll || kind === "marketing") {
      return { sent: false, reason: `suppressed_${suppression.reason}` };
    }
  }

  const msg = {
    to: email,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: test ? `[TEST] ${subject}` : subject,
    html: wrap ? wrap(`${html}${footerHtml(uid, kind)}`) : `${html}${footerHtml(uid, kind)}`,
    text: text
      ? `${text}\n\n${kind === "marketing" ? `Unsubscribe: ${preferencesUrl(uid, "&a=unsubscribe")}\n` : ""}Manage your email preferences: ${preferencesUrl(uid)}`
      : undefined,
    categories: ["platform-email", kind, ...categories],
    customArgs: { uid, kind, ...(campaignId ? { campaignId } : {}) },
    trackingSettings: {
      clickTracking: { enable: kind === "marketing", enableText: false },
      openTracking: { enable: kind === "marketing" },
    },
  };

  if (kind === "marketing" && ONE_CLICK_URL) {
    const token = encodeURIComponent(signUserToken(uid));
    msg.headers = {
      "List-Unsubscribe": `<${ONE_CLICK_URL}?t=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error) {
    console.error(`SendGrid error sending to ${email}:`, error.response?.body || error.message);
    return { sent: false, reason: "sendgrid_error" };
  }
};

module.exports = { sendToUser, preferencesUrl, escapeHtml, isEmailEnabled, APP_URL };
