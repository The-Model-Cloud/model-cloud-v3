/**
 * API utility functions for making requests to backend services
 * Uses Firebase Callable Functions for authenticated requests
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app, auth } from "config/firebase";

// Lazy initialization - get functions instance when needed
// Must pass app explicitly to ensure functions use the authenticated Firebase instance
let functionsInstance = null;
const getFirebaseFunctions = () => {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, "us-central1");
  }
  return functionsInstance;
};

/**
 * Call a Firebase Cloud Function
 * @param {string} functionName - The name of the Cloud Function
 * @param {object} data - The data to send
 * @returns {Promise<any>} - The response data
 */
export const callCloudFunction = async (functionName, data) => {
  try {
    // Debug: Log auth state
    const currentUser = auth.currentUser;
    console.log(`📡 Calling ${functionName}:`);
    console.log(`   - Auth user UID: ${currentUser?.uid || "NOT LOGGED IN"}`);
    console.log(`   - Auth user email: ${currentUser?.email || "N/A"}`);

    if (!currentUser) {
      console.error(`❌ No authenticated user when calling ${functionName}`);
      throw new Error("User not authenticated");
    }

    // Get a fresh ID token to ensure it's valid
    const idToken = await currentUser.getIdToken(true);
    console.log(`   - ID token obtained: ${idToken ? "Yes (length: " + idToken.length + ")" : "No"}`);

    const functions = getFirebaseFunctions();
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    console.log(`✅ ${functionName} succeeded:`, result.data);
    return result.data;
  } catch (error) {
    console.error(`❌ Cloud Function ${functionName} failed:`, error.code, error.message);
    // Return a response that allows the app to continue
    return { success: false, error: error.message, skipped: true };
  }
};

/**
 * Send job application email to client via Cloud Function
 * @param {string} to - Client's email address
 * @param {string} modelName - Model's full name
 * @param {string} jobTitle - Job title
 * @param {string} jobReference - Job reference number
 * @returns {Promise<any>} - The response data
 */
export const sendApplicationEmail = async (to, modelName, jobTitle, jobReference) => {
  try {
    const result = await callCloudFunction("sendApplicationEmail", {
      to,
      modelName,
      jobTitle,
      jobReference,
    });

    if (result.skipped) {
      console.log("📧 Email skipped - SendGrid not configured");
    }

    return result;
  } catch (error) {
    console.warn("Email sending failed, but continuing:", error);
    return { success: false, skipped: true };
  }
};

/**
 * Send a job application confirmation email to a model
 * @param {string} to - Model's email address
 * @param {string} modelName - Model's full name
 * @param {string} jobTitle - Job title
 * @param {string} jobReference - Job reference number
 * @returns {Promise<any>} - The response data
 */
export const sendModelApplicationConfirmation = async (to, modelName, jobTitle, jobReference) => {
  try {
    const result = await callCloudFunction("sendModelApplicationConfirmation", {
      to,
      modelName,
      jobTitle,
      jobReference,
    });

    if (result.skipped) {
      console.log("📧 Confirmation email skipped - SendGrid not configured");
    }

    return result;
  } catch (error) {
    console.warn("Confirmation email failed, but continuing:", error);
    return { success: false, skipped: true };
  }
};


// ============================================================================
// FAVOURITES SHARING API FUNCTIONS
// ============================================================================

/**
 * Send a share list email via Cloud Function
 * @param {string} to - Recipient's email address
 * @param {string} listTitle - Title of the list being shared
 * @param {string} listDescription - Optional description
 * @param {string} shareUrl - The shareable URL
 * @param {number} modelCount - Number of models in the list
 * @param {string} senderName - Name of the person sharing
 * @returns {Promise<any>} - The response data
 */
export const sendShareListEmail = async (to, listTitle, listDescription, shareUrl, modelCount, senderName) => {
  try {
    const result = await callCloudFunction("sendShareListEmail", {
      to,
      listTitle,
      listDescription,
      shareUrl,
      modelCount,
      senderName,
    });

    if (result.skipped) {
      console.log("📧 Share email skipped - SendGrid not configured");
    }

    return result;
  } catch (error) {
    console.warn("Share email sending failed:", error);
    return { success: false, skipped: true };
  }
};


// ============================================================================
// MESSAGING API FUNCTIONS
// ============================================================================

/**
 * Create a new message thread
 * @param {string} participantUid - The other participant's UID
 * @param {string} type - Thread type: "job" | "direct" | "support"
 * @param {string|null} jobId - Job ID if type is "job"
 * @returns {Promise<{threadId: string, existing: boolean}>}
 */
export const createThread = async (participantUid, type = "job", jobId = null) => {
  try {
    const result = await callCloudFunction("createThread", {
      participantUid,
      type,
      jobId,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to create thread:", error);
    throw error;
  }
};

/**
 * Mark a thread as read for the current user
 * @param {string} threadId - The thread ID to mark as read
 * @returns {Promise<{success: boolean}>}
 */
export const markThreadAsRead = async (threadId) => {
  try {
    const result = await callCloudFunction("markThreadAsRead", { threadId });

    if (result.error) {
      console.warn("Failed to mark thread as read:", result.error);
    }

    return result;
  } catch (error) {
    console.warn("markThreadAsRead failed:", error);
    return { success: false };
  }
};


// ============================================================================
// ADMIN API FUNCTIONS
// ============================================================================

/**
 * Delete a model account (Admin/Super Admin only)
 * Deletes Firestore user, Cloudinary images, and Firebase Auth account
 * Also cleans up related data: favourites, threads, job applications
 * @param {string} modelUid - The model's UID to delete
 * @returns {Promise<{success: boolean, modelName?: string, modelEmail?: string, cleanup?: object, errors?: array}>}
 */
export const deleteModel = async (modelUid) => {
  try {
    const result = await callCloudFunction("deleteModel", { modelUid });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to delete model:", error);
    throw error;
  }
};

/**
 * Delete a user from Firebase Authentication (Super Admin only)
 * Used by bulk delete operations after Firestore document deletion
 * @param {string} userUid - The user's UID to delete from Auth
 * @returns {Promise<{success: boolean, userUid?: string, notFound?: boolean, error?: string}>}
 */
export const deleteUserAuth = async (userUid) => {
  try {
    const result = await callCloudFunction("deleteUserAuth", { userUid });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to delete user auth:", error);
    // Return error info but don't throw - allow bulk operations to continue
    return { success: false, error: error.message };
  }
};

/**
 * Get orphaned Firebase Authentication accounts (Super Admin only)
 * Returns accounts that exist in Firebase Auth but not in Firestore
 * @returns {Promise<{success: boolean, orphanedAccounts: Array, totalFirestoreUsers: number, totalOrphaned: number}>}
 */
export const getOrphanedAuthAccounts = async () => {
  try {
    const result = await callCloudFunction("getOrphanedAuthAccounts", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get orphaned auth accounts:", error);
    throw error;
  }
};

/**
 * Delete orphaned Firebase Authentication accounts (Super Admin only)
 * @param {string[]} uids - Array of UIDs to delete
 * @returns {Promise<{success: boolean, deletedCount: number, failedCount: number, results: Array}>}
 */
export const deleteOrphanedAuthAccounts = async (uids) => {
  try {
    const result = await callCloudFunction("deleteOrphanedAuthAccounts", { uids });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to delete orphaned auth accounts:", error);
    throw error;
  }
};

/**
 * Get orphaned Cloudinary folders (Super Admin only)
 * Returns folders in users/models/ and users/clients/ that don't have corresponding Firestore users
 * @returns {Promise<{success: boolean, orphanedFolders: Array, totalOrphaned: number, totalValidUsers: number}>}
 */
export const getOrphanedCloudinaryFolders = async () => {
  try {
    const result = await callCloudFunction("getOrphanedCloudinaryFolders", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get orphaned Cloudinary folders:", error);
    throw error;
  }
};

/**
 * Delete orphaned Cloudinary folders (Super Admin only)
 * @param {string[]} folders - Array of folder paths to delete
 * @returns {Promise<{success: boolean, deletedResourcesCount: number, deletedFoldersCount: number, failedCount: number, results: Array}>}
 */
export const deleteOrphanedCloudinaryFolders = async (folders) => {
  try {
    const result = await callCloudFunction("deleteOrphanedCloudinaryFolders", { folders });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to delete orphaned Cloudinary folders:", error);
    throw error;
  }
};


// ============================================================================
// ADMIN USER MANAGEMENT API FUNCTIONS
// ============================================================================

/**
 * Reset a user's password (Admin only)
 * @param {string} userUid - The user's UID
 * @param {string} newPassword - The new password to set
 * @param {boolean} sendEmail - Whether to send the new password to the user via email
 * @returns {Promise<{success: boolean, emailSent?: boolean}>}
 */
export const adminResetUserPassword = async (userUid, newPassword, sendEmail = false) => {
  try {
    const result = await callCloudFunction("adminResetUserPassword", {
      userUid,
      newPassword,
      sendEmail,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to reset user password:", error);
    throw error;
  }
};

/**
 * Update a user's email address (Admin only)
 * @param {string} userUid - The user's UID
 * @param {string} newEmail - The new email address
 * @returns {Promise<{success: boolean, oldEmail?: string, newEmail?: string}>}
 */
export const adminUpdateUserEmail = async (userUid, newEmail) => {
  try {
    const result = await callCloudFunction("adminUpdateUserEmail", {
      userUid,
      newEmail,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to update user email:", error);
    throw error;
  }
};

/**
 * Send verification email to a model when their account is verified
 * @param {string} to - Model's email address
 * @param {string} modelName - Model's full name
 * @returns {Promise<{success: boolean}>}
 */
export const sendVerificationEmail = async (to, modelName) => {
  try {
    const result = await callCloudFunction("sendVerificationEmail", {
      to,
      modelName,
    });

    if (result.skipped) {
      console.log("📧 Verification email skipped - SendGrid not configured");
    }

    return result;
  } catch (error) {
    console.warn("Verification email failed, but continuing:", error);
    return { success: false, skipped: true };
  }
};

/**
 * Send unverification email to a model when their account is unverified
 * @param {string} to - Model's email address
 * @param {string} modelName - Model's full name
 * @returns {Promise<{success: boolean}>}
 */
export const sendUnverificationEmail = async (to, modelName) => {
  try {
    const result = await callCloudFunction("sendUnverificationEmail", {
      to,
      modelName,
    });

    if (result.skipped) {
      console.log("📧 Unverification email skipped - SendGrid not configured");
    }

    return result;
  } catch (error) {
    console.warn("Unverification email failed, but continuing:", error);
    return { success: false, skipped: true };
  }
};


// ============================================================================
// SYSTEM SETTINGS API FUNCTIONS
// ============================================================================

/**
 * Get system settings (Super Admin only)
 * @returns {Promise<{success: boolean, settings: Object}>}
 */
export const getSystemSettings = async () => {
  try {
    const result = await callCloudFunction("getSystemSettings", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get system settings:", error);
    throw error;
  }
};

/**
 * Update system settings (Super Admin only)
 * @param {Object} settings - The settings to update
 * @returns {Promise<{success: boolean}>}
 */
export const updateSystemSettings = async (settings) => {
  try {
    const result = await callCloudFunction("updateSystemSettings", { settings });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to update system settings:", error);
    throw error;
  }
};


// ============================================================================
// IMAGE OPTIMIZATION API FUNCTIONS
// ============================================================================

/**
 * Get models with their image statistics for optimization (Admin only)
 * Returns models with profile, portfolio, and digital images along with file sizes
 * @param {string[]} modelUids - Optional array of specific model UIDs to check
 * @returns {Promise<{success: boolean, models: Array, summary: Object}>}
 */
export const getModelsImageStats = async (modelUids = null) => {
  try {
    const result = await callCloudFunction("getModelsImageStats", { modelUids });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get models image stats:", error);
    throw error;
  }
};

/**
 * Optimize images for specified models (Admin only)
 * Applies Cloudinary transformations to reduce file size while maintaining quality
 * @param {Object} options - Optimization options
 * @param {string[]} options.modelUids - Model UIDs to optimize
 * @param {boolean} options.optimizeProfile - Optimize profile avatars (default: true)
 * @param {boolean} options.optimizePortfolio - Optimize portfolio images (default: true)
 * @param {boolean} options.optimizeDigitals - Optimize digital images (default: true)
 * @param {string} options.quality - Quality setting (default: "auto:good")
 * @param {number} options.maxProfileWidth - Max profile image width (default: 800)
 * @param {number} options.maxProfileHeight - Max profile image height (default: 800)
 * @param {number} options.maxPortfolioWidth - Max portfolio image width (default: 2000)
 * @param {number} options.maxPortfolioHeight - Max portfolio image height (default: 2000)
 * @param {number} options.maxDigitalWidth - Max digital image width (default: 1600)
 * @param {number} options.maxDigitalHeight - Max digital image height (default: 1600)
 * @returns {Promise<{success: boolean, modelsProcessed: number, totalSavedBytes: number, ...}>}
 */
export const optimizeModelImages = async (options) => {
  try {
    const result = await callCloudFunction("optimizeModelImages", options);

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to optimize model images:", error);
    throw error;
  }
};


// ============================================================================
// ANALYTICS API FUNCTIONS
// ============================================================================

/**
 * Get GA4 analytics data (Admin/Super Admin only)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string[]} metrics - Array of metric names to fetch
 * @param {string[]} dimensions - Array of dimension names to fetch
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getGA4Analytics = async (startDate, endDate, metrics, dimensions) => {
  try {
    const result = await callCloudFunction("getGA4Analytics", {
      startDate,
      endDate,
      metrics,
      dimensions,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get GA4 analytics:", error);
    throw error;
  }
};

/**
 * Get daily GA4 analytics data for charts (Admin/Super Admin only)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getGA4DailyData = async (startDate, endDate) => {
  try {
    const result = await callCloudFunction("getGA4DailyData", {
      startDate,
      endDate,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get GA4 daily data:", error);
    throw error;
  }
};

/**
 * Get model profile page views from GA4 (Admin/Super Admin only)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {number} limit - Max number of results (default: 10)
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getModelProfileViews = async (startDate, endDate, limit = 10) => {
  try {
    const result = await callCloudFunction("getModelProfileViews", {
      startDate,
      endDate,
      limit,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get model profile views:", error);
    throw error;
  }
};

/**
 * Get traffic sources from GA4 (Admin/Super Admin only)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getTrafficSources = async (startDate, endDate) => {
  try {
    const result = await callCloudFunction("getTrafficSources", {
      startDate,
      endDate,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get traffic sources:", error);
    throw error;
  }
};

/**
 * Get geographic data from GA4 (Admin/Super Admin only)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getGeographicData = async (startDate, endDate) => {
  try {
    const result = await callCloudFunction("getGeographicData", {
      startDate,
      endDate,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get geographic data:", error);
    throw error;
  }
};

/**
 * Get job count (Admin/Super Admin only)
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getJobCount = async () => {
  try {
    const result = await callCloudFunction("getJobCount", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get job count:", error);
    throw error;
  }
};

/**
 * Get user count (Admin/Super Admin only)
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getUserCount = async () => {
  try {
    const result = await callCloudFunction("getUserCount", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get user count:", error);
    throw error;
  }
};

/**
 * Get Instagram follower count for a specific account (Admin/Super Admin only)
 * @param {string} username - Instagram username
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export const getInstagramFollowers = async (username) => {
  try {
    const result = await callCloudFunction("getInstagramFollowers", {
      username,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get Instagram followers:", error);
    throw error;
  }
};


// ============================================================================
// STRIPE CONNECT - MODEL ONBOARDING
// ============================================================================

/**
 * Create Stripe Connected Account for model
 * @returns {Promise<{success: boolean, accountId: string, onboardingUrl: string}>}
 */
export const createStripeConnectedAccount = async () => {
  try {
    const result = await callCloudFunction("createStripeConnectedAccount", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to create Stripe connected account:", error);
    throw error;
  }
};

/**
 * Get Stripe onboarding link for model
 * @returns {Promise<{success: boolean, onboardingUrl: string}>}
 */
export const createStripeOnboardingLink = async () => {
  try {
    const result = await callCloudFunction("createStripeOnboardingLink", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to create Stripe onboarding link:", error);
    throw error;
  }
};

/**
 * Get Stripe Express Dashboard link for model
 * @returns {Promise<{success: boolean, dashboardUrl: string}>}
 */
export const createStripeDashboardLink = async () => {
  try {
    const result = await callCloudFunction("createStripeDashboardLink", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to create Stripe dashboard link:", error);
    throw error;
  }
};

/**
 * Get Stripe account status for model
 * @returns {Promise<{success: boolean, hasAccount: boolean, status: string, payoutsEnabled: boolean}>}
 */
export const getStripeAccountStatus = async () => {
  try {
    const result = await callCloudFunction("getStripeAccountStatus", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get Stripe account status:", error);
    throw error;
  }
};


// ============================================================================
// STRIPE - CLIENT PAYMENT METHODS
// ============================================================================

/**
 * Create or get Stripe Customer for client
 * @returns {Promise<{success: boolean, customerId: string, isNew: boolean}>}
 */
export const createStripeCustomer = async () => {
  try {
    const result = await callCloudFunction("createStripeCustomer", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to create Stripe customer:", error);
    throw error;
  }
};

/**
 * Create SetupIntent for saving payment method
 * @returns {Promise<{success: boolean, clientSecret: string}>}
 */
export const createSetupIntent = async () => {
  try {
    const result = await callCloudFunction("createSetupIntent", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to create setup intent:", error);
    throw error;
  }
};

/**
 * Get saved payment methods for client
 * @returns {Promise<{success: boolean, paymentMethods: Array}>}
 */
export const getSavedPaymentMethods = async () => {
  try {
    const result = await callCloudFunction("getSavedPaymentMethods", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get saved payment methods:", error);
    throw error;
  }
};

/**
 * Delete a saved payment method
 * @param {string} paymentMethodId - Payment method ID to delete
 * @returns {Promise<{success: boolean}>}
 */
export const deletePaymentMethod = async (paymentMethodId) => {
  try {
    const result = await callCloudFunction("deletePaymentMethod", {
      paymentMethodId,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to delete payment method:", error);
    throw error;
  }
};

/**
 * Set default payment method for client
 * @param {string} paymentMethodId - Payment method ID to set as default
 * @returns {Promise<{success: boolean}>}
 */
export const setDefaultPaymentMethod = async (paymentMethodId) => {
  try {
    const result = await callCloudFunction("setDefaultPaymentMethod", {
      paymentMethodId,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to set default payment method:", error);
    throw error;
  }
};


// ============================================================================
// JOB AWARD & PAYMENT
// ============================================================================

/**
 * Award job to a model
 * @param {string} jobId - Job ID
 * @param {string} modelId - Model user ID
 * @param {number} agreedAmount - Agreed payment amount
 * @param {string} currency - Currency code (GBP, EUR, USD)
 * @returns {Promise<{success: boolean, modelHasStripeAccount: boolean}>}
 */
export const awardJobToModel = async (jobId, modelId, agreedAmount, currency = "GBP") => {
  try {
    const result = await callCloudFunction("awardJobToModel", {
      jobId,
      modelId,
      agreedAmount,
      currency,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to award job to model:", error);
    throw error;
  }
};

/**
 * Create PaymentIntent for job payment (holds funds)
 * @param {string} jobId - Job ID
 * @param {string} paymentMethodId - Optional payment method ID
 * @returns {Promise<{success: boolean, paymentIntentId: string, clientSecret: string}>}
 */
export const createJobPaymentIntent = async (jobId, paymentMethodId = null) => {
  try {
    const result = await callCloudFunction("createJobPaymentIntent", {
      jobId,
      paymentMethodId,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to create job payment intent:", error);
    throw error;
  }
};

/**
 * Confirm job payment was authorized
 * @param {string} jobId - Job ID
 * @param {string} paymentIntentId - Payment Intent ID
 * @returns {Promise<{success: boolean}>}
 */
export const confirmJobPaymentAuthorized = async (jobId, paymentIntentId) => {
  try {
    const result = await callCloudFunction("confirmJobPaymentAuthorized", {
      jobId,
      paymentIntentId,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to confirm job payment authorization:", error);
    throw error;
  }
};


// ============================================================================
// JOB COMPLETION & FUND RELEASE
// ============================================================================

/**
 * Model marks job as complete
 * @param {string} jobId - Job ID
 * @returns {Promise<{success: boolean}>}
 */
export const modelMarkJobComplete = async (jobId) => {
  try {
    const result = await callCloudFunction("modelMarkJobComplete", {
      jobId,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to mark job as complete:", error);
    throw error;
  }
};

/**
 * Client confirms job completion and releases funds
 * @param {string} jobId - Job ID
 * @returns {Promise<{success: boolean}>}
 */
export const clientConfirmJobComplete = async (jobId) => {
  try {
    const result = await callCloudFunction("clientConfirmJobComplete", {
      jobId,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to confirm job completion:", error);
    throw error;
  }
};

/**
 * Admin manage job payment (release, cancel, or partial refund)
 * @param {string} jobId - Job ID
 * @param {string} action - Action to take: 'release', 'cancel', or 'partial_refund'
 * @param {number} refundPercentage - For partial refund, percentage to capture (1-100)
 * @returns {Promise<{success: boolean}>}
 */
export const adminManageJobPayment = async (jobId, action, refundPercentage = 100) => {
  try {
    const result = await callCloudFunction("adminManageJobPayment", {
      jobId,
      action,
      refundPercentage,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to manage job payment:", error);
    throw error;
  }
};


// ============================================================================
// WITHDRAWALS
// ============================================================================

/**
 * Get model's balance
 * @returns {Promise<{success: boolean, balance: {available: number, pending: number, currency: string}}>}
 */
export const getModelBalance = async () => {
  try {
    const result = await callCloudFunction("getModelBalance", {});

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get model balance:", error);
    throw error;
  }
};

/**
 * Request withdrawal to bank account
 * @param {number} amount - Amount to withdraw (in main currency units, e.g., pounds)
 * @returns {Promise<{success: boolean, withdrawalId: string, fee: number, netAmount: number}>}
 */
export const requestWithdrawal = async (amount) => {
  try {
    const result = await callCloudFunction("requestWithdrawal", {
      amount,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to request withdrawal:", error);
    throw error;
  }
};

/**
 * Get withdrawal history for model
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<{success: boolean, withdrawals: Array}>}
 */
export const getWithdrawalHistory = async (limit = 50) => {
  try {
    const result = await callCloudFunction("getWithdrawalHistory", {
      limit,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get withdrawal history:", error);
    throw error;
  }
};

/**
 * Get transaction history
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<{success: boolean, transactions: Array}>}
 */
export const getTransactionHistory = async (limit = 50) => {
  try {
    const result = await callCloudFunction("getTransactionHistory", {
      limit,
    });

    if (result.error && !result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Failed to get transaction history:", error);
    throw error;
  }
};
