/**
 * Verification utility functions for model account verification system
 */

/**
 * Check if user is a verified model (or non-model role)
 * Non-model users are considered verified by default
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean} - True if user is verified or not a model
 */
export const isVerifiedUser = (user) => {
  if (!user) return false;
  if (user.role !== "model") return true; // Non-models don't need verification
  return user.verified === true;
};

/**
 * Check if user can access verified-only features
 * Admins always have access, models need to be verified
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean} - True if user can access verified-only features
 */
export const canAccessVerifiedFeatures = (user) => {
  if (!user) return false;
  const adminRoles = ["admin", "super admin"];
  if (adminRoles.includes(user.role)) return true;
  return isVerifiedUser(user);
};

/**
 * Check if user is an unverified model
 * @param {Object} user - The user object from AuthContext
 * @returns {boolean} - True if user is a model and not verified
 */
export const isUnverifiedModel = (user) => {
  if (!user) return false;
  return user.role === "model" && user.verified !== true;
};
