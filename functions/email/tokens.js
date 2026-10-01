const crypto = require("crypto");

/**
 * Signed, non-expiring tokens for email links (unsubscribe / opt-in / preferences).
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * Unsubscribe links must keep working indefinitely, so there is deliberately no expiry.
 */

const getSecret = () => {
  const secret = process.env.EMAIL_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("EMAIL_TOKEN_SECRET is not configured (minimum 32 characters)");
  }
  return secret;
};

const sign = (body) =>
  crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");

const signToken = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
};

/**
 * @returns {Object|null} the payload, or null if the token is malformed or tampered with
 */
const verifyToken = (token) => {
  if (typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const signUserToken = (uid) => signToken({ u: uid });

module.exports = { signToken, verifyToken, signUserToken };
