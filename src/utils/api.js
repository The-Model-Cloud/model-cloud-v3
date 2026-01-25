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
