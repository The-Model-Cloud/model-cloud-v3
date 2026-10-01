const admin = require("firebase-admin");
const { normaliseEmail } = require("./consent");

const bounceFlag = (email, reason, source) => ({
  email: normaliseEmail(email),
  reason: String(reason || "").slice(0, 300),
  source,
  at: admin.firestore.FieldValue.serverTimestamp(),
});

/**
 * Mark a user as having an undeliverable email address: users/{uid}.emailBounced = { email, reason, at, source }.
 *
 * The platform shows these users a banner asking them to update their address. The flag only counts while
 * `emailBounced.email` equals the user's current email, so changing the address clears it without any cleanup.
 *
 * @returns {Promise<boolean>} true if the user was newly flagged
 */
const flagBouncedUser = async (db, uid, email, reason, source) => {
  if (!uid || !email) return false;
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const user = snap.data();
  const bounced = normaliseEmail(email);
  // The bounce is for an address they no longer use
  if (normaliseEmail(user.email) !== bounced) return false;
  // Already flagged for this address
  if (normaliseEmail(user.emailBounced?.email) === bounced) return false;

  await ref.update({ emailBounced: bounceFlag(bounced, reason, source) });
  return true;
};

/** Blocks that mean the recipient's domain can never receive mail (not a temporary refusal). */
const isDeadDomainBlock = (reason) => /unable to get mx info|no such host|nxdomain|domain (does not|doesn't) exist/i.test(String(reason || ""));

module.exports = { flagBouncedUser, bounceFlag, isDeadDomainBlock };
