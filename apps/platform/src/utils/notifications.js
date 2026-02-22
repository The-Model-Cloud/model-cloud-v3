import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "config/firebase";

/**
 * Create a notification for a user
 * @param {string} userId - The user ID to send the notification to
 * @param {string} type - Type of notification (e.g., 'job_application', 'job_invite', etc.)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Additional data to store with the notification
 * @returns {Promise<string>} - The notification document ID
 */
export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notificationRef = collection(db, "users", userId, "notifications");

    const notification = {
      type,
      title,
      message,
      data,
      read: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(notificationRef, notification);
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Create a job application notification for a client
 * @param {string} clientId - The client's user ID
 * @param {object} model - The model who applied
 * @param {object} job - The job details
 * @returns {Promise<string>} - The notification document ID
 */
export const createJobApplicationNotification = async (clientId, model, job) => {
  const title = "New Job Application";
  const message = `${model.firstName} ${model.lastName || ""} has applied for your job "${job.title}"`;

  const data = {
    jobId: job.id,
    jobReference: job.reference,
    jobTitle: job.title,
    modelId: model.uid,
    modelName: `${model.firstName} ${model.lastName || ""}`,
    link: `/jobs/${job.reference}`,
  };

  return createNotification(clientId, "job_application", title, message, data);
};

/**
 * Create a job application confirmation notification for a model
 * @param {string} modelId - The model's user ID
 * @param {object} job - The job details
 * @returns {Promise<string>} - The notification document ID
 */
export const createJobApplicationConfirmationNotification = async (modelId, job) => {
  const title = "Application Submitted";
  const message = `You have successfully applied for "${job.title}"`;

  const data = {
    jobId: job.id,
    jobReference: job.reference,
    jobTitle: job.title,
    link: `/jobs/${job.reference}`,
  };

  return createNotification(modelId, "job_application_confirmation", title, message, data);
};

/**
 * Create a job application cancellation notification for a client
 * @param {string} clientId - The client's user ID
 * @param {object} model - The model who cancelled
 * @param {object} job - The job details
 * @returns {Promise<string>} - The notification document ID
 */
export const createJobApplicationCancellationNotification = async (clientId, model, job) => {
  const title = "Application Cancelled";
  const message = `${model.firstName} ${model.lastName || ""} has cancelled their application for "${job.title}"`;

  const data = {
    jobId: job.id,
    jobReference: job.reference,
    jobTitle: job.title,
    modelId: model.uid,
    modelName: `${model.firstName} ${model.lastName || ""}`,
    link: `/jobs/${job.reference}`,
  };

  return createNotification(clientId, "job_application_cancelled", title, message, data);
};

/**
 * Create a notification when an invited model accepts the invitation and applies
 * @param {string} clientId - The client's user ID
 * @param {object} model - The model who accepted
 * @param {object} job - The job details
 * @returns {Promise<string>} - The notification document ID
 */
export const createInvitationAcceptedNotification = async (clientId, model, job) => {
  const modelName = `${model.firstName} ${model.lastName || ""}`.trim();
  const title = "Invitation Accepted!";
  const message = `${modelName} has accepted your invitation and applied for "${job.title}"`;

  const data = {
    jobId: job.id,
    jobReference: job.reference,
    jobTitle: job.title,
    modelId: model.uid,
    modelName,
    link: `/jobs/${job.reference}`,
  };

  return createNotification(clientId, "invitation_accepted", title, message, data);
};
