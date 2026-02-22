/**
 * Activity Logging Utility
 * Logs all job-related activities for admin visibility
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "config/firebase";

/**
 * Activity types for job workflow
 */
export const ACTIVITY_TYPES = {
  JOB_CREATED: "job_created",
  JOB_UPDATED: "job_updated",
  JOB_CANCELLED: "job_cancelled",
  MODEL_INVITED: "model_invited",
  MODEL_APPLIED: "model_applied",
  MODEL_ACCEPTED_INVITATION: "model_accepted_invitation",
  APPLICATION_CANCELLED: "application_cancelled",
  JOB_AWARDED: "job_awarded",
  PAYMENT_AUTHORIZED: "payment_authorized",
  PAYMENT_CAPTURED: "payment_captured",
  PAYMENT_CANCELLED: "payment_cancelled",
  JOB_COMPLETED_BY_MODEL: "job_completed_by_model",
  JOB_COMPLETED_BY_CLIENT: "job_completed_by_client",
  MESSAGE_SENT: "message_sent",
};

/**
 * Log an activity for a job
 * @param {string} jobId - The job ID
 * @param {string} jobReference - The job reference number
 * @param {string} activityType - One of ACTIVITY_TYPES
 * @param {object} actor - The user who performed the action { uid, name, role }
 * @param {object} details - Additional details about the activity
 * @returns {Promise<string>} - The activity document ID
 */
export const logActivity = async (jobId, jobReference, activityType, actor, details = {}) => {
  try {
    const activityRef = collection(db, "jobs", jobId, "activityLog");

    const activity = {
      type: activityType,
      actorId: actor.uid,
      actorName: actor.name || "Unknown",
      actorRole: actor.role || "unknown",
      details,
      jobReference,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(activityRef, activity);
    console.log(`📝 Activity logged: ${activityType} for job ${jobReference}`);
    return docRef.id;
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - activity logging should not break the main flow
    return null;
  }
};

/**
 * Log when a job is created
 */
export const logJobCreated = async (job, client) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.JOB_CREATED,
    { uid: client.uid, name: `${client.firstName} ${client.lastName || ""}`.trim(), role: "client" },
    { jobTitle: job.title }
  );
};

/**
 * Log when a model is invited to a job
 */
export const logModelInvited = async (job, model, client) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.MODEL_INVITED,
    { uid: client.uid, name: `${client.firstName} ${client.lastName || ""}`.trim(), role: "client" },
    {
      modelId: model.uid,
      modelName: `${model.firstName} ${model.lastName || ""}`.trim(),
    }
  );
};

/**
 * Log when a model applies for a job
 */
export const logModelApplied = async (job, model, wasInvited = false) => {
  return logActivity(
    job.id,
    job.reference,
    wasInvited ? ACTIVITY_TYPES.MODEL_ACCEPTED_INVITATION : ACTIVITY_TYPES.MODEL_APPLIED,
    { uid: model.uid, name: `${model.firstName} ${model.lastName || ""}`.trim(), role: "model" },
    { wasInvited }
  );
};

/**
 * Log when an application is cancelled
 */
export const logApplicationCancelled = async (job, model) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.APPLICATION_CANCELLED,
    { uid: model.uid, name: `${model.firstName} ${model.lastName || ""}`.trim(), role: "model" },
    {}
  );
};

/**
 * Log when a job is awarded to a model
 */
export const logJobAwarded = async (job, model, client, agreedAmount, currency) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.JOB_AWARDED,
    { uid: client.uid, name: `${client.firstName} ${client.lastName || ""}`.trim(), role: "client" },
    {
      modelId: model.uid,
      modelName: `${model.firstName} ${model.lastName || ""}`.trim(),
      agreedAmount,
      currency,
    }
  );
};

/**
 * Log when payment is authorized (funds held)
 */
export const logPaymentAuthorized = async (job, client, amount, currency) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.PAYMENT_AUTHORIZED,
    { uid: client.uid, name: `${client.firstName} ${client.lastName || ""}`.trim(), role: "client" },
    { amount, currency }
  );
};

/**
 * Log when payment is captured (funds transferred)
 */
export const logPaymentCaptured = async (job, actor, amount, currency) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.PAYMENT_CAPTURED,
    { uid: actor.uid, name: actor.name || "System", role: actor.role || "system" },
    { amount, currency }
  );
};

/**
 * Log when model marks job as complete
 */
export const logJobCompletedByModel = async (job, model) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.JOB_COMPLETED_BY_MODEL,
    { uid: model.uid, name: `${model.firstName} ${model.lastName || ""}`.trim(), role: "model" },
    {}
  );
};

/**
 * Log when client confirms job completion
 */
export const logJobCompletedByClient = async (job, client) => {
  return logActivity(
    job.id,
    job.reference,
    ACTIVITY_TYPES.JOB_COMPLETED_BY_CLIENT,
    { uid: client.uid, name: `${client.firstName} ${client.lastName || ""}`.trim(), role: "client" },
    {}
  );
};
