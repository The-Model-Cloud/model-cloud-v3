/**
 * Verification utility functions for model/client account verification system
 *
 * PLATFORM VERIFICATION vs EMAIL VERIFICATION:
 * - user.verified (Firestore field) = admin has approved the account for full platform access
 * - Firebase emailVerified = user clicked the verification link in their welcome email
 * These are separate concerns. Full platform access requires admin verification.
 */

// Roles that bypass verification and always have full access
const STAFF_ROLES = ["admin", "super admin", "account manager"];

/**
 * Check if a user's role requires platform verification before full access.
 * Models and clients must be verified by an admin. Staff roles are exempt.
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean}
 */
export const requiresVerification = (user) => {
  if (!user) return false;
  return !STAFF_ROLES.includes(user.role);
};

/**
 * Check if user is fully verified for platform access.
 * Staff roles (admin, super admin, account manager) are always verified.
 * Models and clients must have verified: true set by an admin.
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean}
 */
export const isVerifiedUser = (user) => {
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  return user.verified === true;
};

/**
 * Check if user can access verified-only features
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean}
 */
export const canAccessVerifiedFeatures = (user) => {
  return isVerifiedUser(user);
};

/**
 * Check if user is an unverified model (legacy - kept for backwards compat)
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean}
 */
export const isUnverifiedModel = (user) => {
  if (!user) return false;
  return user.role === "model" && user.verified !== true;
};

/**
 * Check if user is an unverified client or model awaiting admin approval.
 * This is the primary check used to restrict access until admin verifies the account.
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean}
 */
export const isUnverifiedUser = (user) => {
  if (!user) return false;
  return requiresVerification(user) && user.verified !== true;
};
