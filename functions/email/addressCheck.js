const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const dns = require("dns").promises;
const { SUPPRESSION_REASONS, getSuppression, normaliseEmail } = require("./consent");

/**
 * Checks a new email address before a user changes to it, so we don't swap one dead address for another:
 * syntax, a domain that can actually receive mail (MX or A record), common typos, and previous bounces.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMMON_TYPOS = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gamil.com": "gmail.com",
  "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.con": "hotmail.com", "hotmail.co": "hotmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com", "outlook.con": "outlook.com", "iclod.com": "icloud.com", "icloud.con": "icloud.com",
};

const canReceiveMail = async (domain) => {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return true;
  } catch (error) {
    if (!["ENODATA", "ENOTFOUND", "ESERVFAIL", "ENODOMAIN"].includes(error.code)) throw error;
  }
  // No MX: mail can still be delivered to the domain's A record (RFC 5321 fallback)
  try {
    const a = await dns.resolve4(domain);
    return a.length > 0;
  } catch {
    return false;
  }
};

exports.checkEmailAddress = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

  const email = normaliseEmail((request.data || {}).email);
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, reason: "That doesn't look like a valid email address." };
  }

  const domain = email.split("@")[1];
  if (COMMON_TYPOS[domain]) {
    return { ok: false, reason: "That domain looks like a typo.", suggestion: `${email.split("@")[0]}@${COMMON_TYPOS[domain]}` };
  }

  let deliverable;
  try {
    deliverable = await canReceiveMail(domain);
  } catch (error) {
    // DNS trouble on our side: don't block the user over it
    console.warn("checkEmailAddress: DNS lookup failed:", error.code || error.message);
    deliverable = true;
  }
  if (!deliverable) {
    return { ok: false, reason: `We can't find a mail server for ${domain}. Please check the spelling.` };
  }

  const suppression = await getSuppression(admin.firestore(), email);
  if (suppression && suppression.reason !== SUPPRESSION_REASONS.UNSUBSCRIBE) {
    return { ok: false, reason: "Emails to that address have failed before. Please use a different address." };
  }

  return { ok: true, email };
});
