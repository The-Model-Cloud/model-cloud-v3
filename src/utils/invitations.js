import { doc, setDoc, getDoc, collection, getDocs, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "config/firebase";
import { createNotification } from "./notifications";
import { callCloudFunction, createThread } from "./api";
import { logModelInvited } from "./activityLog";

/**
 * Send a job invitation to a model
 * @param {object} job - The job object
 * @param {object} model - The model to invite
 * @param {object} client - The client sending the invitation
 * @returns {Promise<{success: boolean}>}
 */
export const sendJobInvitation = async (job, model, client) => {
  if (!job || !model || !client) {
    throw new Error("Missing required parameters");
  }

  try {
    console.log("📨 Sending job invitation...");

    // Step 1: Create invitation record in job subcollection
    const invitationRef = doc(db, "jobs", job.id, "invitations", model.uid);
    await setDoc(invitationRef, {
      modelId: model.uid,
      modelName: `${model.firstName} ${model.lastName || ""}`.trim(),
      modelEmail: model.email,
      invitedBy: client.uid,
      invitedByName: `${client.firstName} ${client.lastName || ""}`.trim(),
      invitedAt: serverTimestamp(),
      status: "pending", // pending, applied, expired
    });

    console.log("✅ Invitation record created");

    // Step 1b: Add invitation reference to model's user document for easy lookup
    // This is wrapped in try-catch as security rules may prevent cross-user writes
    try {
      const modelRef = doc(db, "users", model.uid);
      await setDoc(modelRef, {
        invitedJobs: arrayUnion({
          jobId: job.id,
          jobReference: job.reference,
          jobTitle: job.title,
          invitedBy: client.uid,
          invitedByName: client.companyName || `${client.firstName} ${client.lastName || ""}`.trim(),
          invitedAt: new Date().toISOString(),
          status: "pending",
        }),
      }, { merge: true });
      console.log("✅ Invitation added to model's user document");
    } catch (userDocError) {
      console.warn("⚠️ Could not add invitation to model's user document (security rules may prevent this):", userDocError.message);
      // Continue - the invitation record in the job subcollection is the source of truth
    }

    // Step 2: Create notification for the model
    await createJobInvitationNotification(model.uid, client, job)
      .catch((err) => console.warn("⚠️ Notification creation failed:", err.message));

    // Step 3: Send internal message to the model
    await sendInvitationMessage(model, client, job)
      .catch((err) => console.warn("⚠️ Internal message failed:", err.message));

    // Step 4: Send invitation email
    await sendInvitationEmail(
      model.email,
      `${model.firstName} ${model.lastName || ""}`.trim(),
      `${client.firstName} ${client.lastName || ""}`.trim(),
      client.companyName || "",
      job.title,
      job.reference
    ).catch((err) => console.warn("⚠️ Invitation email failed:", err.message));

    // Step 5: Log activity for admins
    await logModelInvited(job, model, client)
      .catch((err) => console.warn("⚠️ Activity logging failed:", err.message));

    console.log("✅ Job invitation sent successfully");

    return { success: true };
  } catch (error) {
    console.error("❌ Error sending job invitation:", error);
    throw error;
  }
};

/**
 * Send an internal message to the model about the job invitation
 * @param {object} model - The model being invited
 * @param {object} client - The client sending the invitation
 * @param {object} job - The job details
 * @returns {Promise<void>}
 */
export const sendInvitationMessage = async (model, client, job) => {
  try {
    console.log("💬 Sending invitation message...");

    // Create or get existing thread for this job
    const threadResult = await createThread(model.uid, "job", job.id);

    if (!threadResult.threadId) {
      throw new Error("Failed to create message thread");
    }

    const clientName = client.companyName || `${client.firstName} ${client.lastName || ""}`.trim();

    // Add the invitation message to the thread
    const messagesRef = collection(db, "threads", threadResult.threadId, "messages");
    await addDoc(messagesRef, {
      senderId: client.uid,
      senderName: clientName,
      senderAvatar: client.profileAvatar || "",
      body: `Hi ${model.firstName || "there"}! I'd like to invite you to apply for my job "${job.title}". I think you'd be a great fit!\n\n[View the job and apply here](/jobs/${job.reference})`,
      createdAt: serverTimestamp(),
      system: false,
    });

    // Update the thread's lastMessageAt and increment unread count for model
    const threadRef = doc(db, "threads", threadResult.threadId);
    await setDoc(threadRef, {
      lastMessageAt: serverTimestamp(),
      lastMessage: `I'd like to invite you to apply for my job "${job.title}"...`,
      [`unread.${model.uid}`]: (threadResult.existing ? 1 : 1), // Increment unread for model
    }, { merge: true });

    console.log("✅ Invitation message sent");
  } catch (error) {
    console.error("Error sending invitation message:", error);
    throw error;
  }
};

/**
 * Create a job invitation notification for a model
 * @param {string} modelId - The model's user ID
 * @param {object} client - The client who sent the invitation
 * @param {object} job - The job details
 * @returns {Promise<string>} - The notification document ID
 */
export const createJobInvitationNotification = async (modelId, client, job) => {
  const title = "Job Invitation";
  const clientName = client.companyName || `${client.firstName} ${client.lastName || ""}`.trim();
  const message = `${clientName} has invited you to apply for "${job.title}"`;

  const data = {
    jobId: job.id,
    jobReference: job.reference,
    jobTitle: job.title,
    clientId: client.uid,
    clientName: clientName,
    link: `/jobs/${job.reference}`,
  };

  return createNotification(modelId, "job_invitation", title, message, data);
};

/**
 * Send job invitation email via Cloud Function
 * @param {string} to - Model's email address
 * @param {string} modelName - Model's full name
 * @param {string} clientName - Client's full name
 * @param {string} companyName - Client's company name (if any)
 * @param {string} jobTitle - Job title
 * @param {string} jobReference - Job reference number
 * @returns {Promise<any>} - The response data
 */
export const sendInvitationEmail = async (to, modelName, clientName, companyName, jobTitle, jobReference) => {
  try {
    const result = await callCloudFunction("sendJobInvitationEmail", {
      to,
      modelName,
      clientName,
      companyName,
      jobTitle,
      jobReference,
    });

    if (result.skipped) {
      console.log("📧 Invitation email skipped - SendGrid not configured");
    }

    return result;
  } catch (error) {
    console.warn("Invitation email failed, but continuing:", error);
    return { success: false, skipped: true };
  }
};

/**
 * Check if a model has been invited to a job
 * @param {string} jobId - The job ID
 * @param {string} modelId - The model's UID
 * @returns {Promise<boolean>}
 */
export const hasBeenInvited = async (jobId, modelId) => {
  try {
    const invitationRef = doc(db, "jobs", jobId, "invitations", modelId);
    const invitationSnap = await getDoc(invitationRef);
    return invitationSnap.exists();
  } catch (error) {
    console.error("Error checking invitation status:", error);
    return false;
  }
};

/**
 * Get all invitations for a job
 * @param {string} jobId - The job ID
 * @returns {Promise<array>} - Array of invitation objects
 */
export const getJobInvitations = async (jobId) => {
  try {
    const invitationsRef = collection(db, "jobs", jobId, "invitations");
    const invitationsSnap = await getDocs(invitationsRef);
    return invitationsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching job invitations:", error);
    return [];
  }
};

/**
 * Send a message to the client when a model accepts an invitation
 * @param {object} model - The model who accepted
 * @param {object} client - The client who sent the invitation
 * @param {object} job - The job details
 * @returns {Promise<void>}
 */
export const sendInvitationAcceptedMessage = async (model, client, job) => {
  try {
    console.log("💬 Sending invitation accepted message to client...");

    // Create or get existing thread for this job
    const threadResult = await createThread(client.uid, "job", job.id);

    if (!threadResult.threadId) {
      throw new Error("Failed to create message thread");
    }

    const modelName = `${model.firstName} ${model.lastName || ""}`.trim();

    // Add the acceptance message to the thread
    const messagesRef = collection(db, "threads", threadResult.threadId, "messages");
    await addDoc(messagesRef, {
      senderId: model.uid,
      senderName: modelName,
      senderAvatar: model.profileAvatar || "",
      body: `Hi! Thank you for inviting me to apply for "${job.title}". I've accepted your invitation and submitted my application. I'd love to discuss this opportunity further!\n\n[View my application](/jobs/${job.reference})`,
      createdAt: serverTimestamp(),
      system: false,
    });

    // Update the thread's lastMessageAt and increment unread count for client
    const threadRef = doc(db, "threads", threadResult.threadId);
    await setDoc(threadRef, {
      lastMessageAt: serverTimestamp(),
      lastMessage: `I've accepted your invitation and submitted my application...`,
      [`unread.${client.uid}`]: 1,
    }, { merge: true });

    console.log("✅ Invitation accepted message sent to client");
  } catch (error) {
    console.error("Error sending invitation accepted message:", error);
    throw error;
  }
};

/**
 * Update invitation status when model applies
 * @param {string} jobId - The job ID
 * @param {string} modelId - The model's UID
 * @returns {Promise<void>}
 */
export const markInvitationAsApplied = async (jobId, modelId) => {
  try {
    const invitationRef = doc(db, "jobs", jobId, "invitations", modelId);
    const invitationSnap = await getDoc(invitationRef);

    if (invitationSnap.exists()) {
      await setDoc(invitationRef, {
        status: "applied",
        appliedAt: serverTimestamp(),
      }, { merge: true });
      console.log("✅ Invitation marked as applied");
    }
  } catch (error) {
    console.error("Error updating invitation status:", error);
  }
};
