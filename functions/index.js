require("dotenv").config();

const functions = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFollowerCount, getIgSessionIg } = require("follower-count");
const sgMail = require("@sendgrid/mail");
const cloudinary = require("cloudinary").v2;

admin.initializeApp();
const db = admin.firestore();

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("Cloudinary configured successfully");
} else {
  console.warn("Cloudinary not configured. Image deletion will be skipped.");
}

// Configure SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@themodel.cloud";

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
  console.log("✅ SendGrid configured successfully");
} else {
  console.warn("⚠️ SendGrid API key not configured. Email functionality disabled.");
}


exports.updateInstagramFollowerCount = onCall(async (request) => {
  const { uid, instagramUsername } = request.data;

  if (!uid || !instagramUsername) {
    throw new HttpsError("invalid-argument", "Missing uid or username.");
  }

  try {
    // Get session ID using Instagram credentials from environment variables
    const sessionId = await getIgSessionIg(
      process.env.INSTAGRAM_USERNAME,
      process.env.INSTAGRAM_PASSWORD
    );

    // Fetch the Instagram follower count
    const count = await getFollowerCount({
      type: "instagram",
      username: instagramUsername,
      sessionId: sessionId,
    });

    if (typeof count !== "number") {
      throw new Error("Follower count not found.");
    }

    // Update the user's Instagram follower count in Firestore
    await db.collection("users").doc(uid).update({
      instagramFollowerCount: count,
      instagramLastChecked: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, count };
  } catch (error) {
    console.error("Error fetching Instagram follower count:", error.message);
    throw new HttpsError("internal", error.message);
  }
});

// HTTP endpoint for sending job application email to client
exports.sendApplicationEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured");
    return { success: false, skipped: true };
  }

  const { to, modelName, jobTitle, jobReference } = request.data;

  if (!to || !modelName || !jobTitle || !jobReference) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const msg = {
    to,
    from: sendgridFromEmail,
    subject: `New Application – ${jobTitle}`,
    text: `New application from ${modelName}\n\nReference: ${jobReference}`,
    html: `
      <h2>New Job Application</h2>
      <p><strong>Model:</strong> ${modelName}</p>
      <p><strong>Job:</strong> ${jobTitle}</p>
      <p><strong>Reference:</strong> ${jobReference}</p>
    `
  };

  await sgMail.send(msg);

  return { success: true };
});


// HTTP endpoint for sending job application confirmation email to model
exports.sendModelApplicationConfirmation = onCall(async (request) => {
  if (!sendgridApiKey) {
    return { success: false, skipped: true };
  }

  const { to, modelName, jobTitle, jobReference } = request.data;

  if (!to || !modelName || !jobTitle || !jobReference) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const msg = {
    to,
    from: sendgridFromEmail,
    subject: `Application Submitted – ${jobTitle}`,
    text: `Hi ${modelName}, your application for ${jobTitle} has been submitted.`,
    html: `
      <h2>Application Submitted</h2>
      <p>Hi ${modelName},</p>
      <p>Your application for <strong>${jobTitle}</strong> has been submitted.</p>
      <p>Reference: ${jobReference}</p>
      <p><a href="https://themodel.cloud/jobs/${jobReference}">View job</a></p>
    `
  };

  await sgMail.send(msg);

  return { success: true };
});


// Admin notification emails - add more recipients here as needed
const ADMIN_NOTIFICATION_EMAILS = [
  "russell@themodel.cloud"
];

// Firestore trigger: Send admin notification when a new user signs up
exports.onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
    if (!sendgridApiKey) {
      console.warn("SendGrid not configured - skipping admin notification");
      return null;
    }

    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return null;
    }

    const userData = snap.data();

    // Skip email notifications for users imported via CSV
    if (userData.importedViaCSV) {
      console.log(`Skipping admin notification for imported user: ${userData.email}`);
      return null;
    }

    const { firstName, lastName, email, role, companyName, createdAt } = userData;

    const msg = {
      to: ADMIN_NOTIFICATION_EMAILS,
      from: sendgridFromEmail,
      subject: `New ${role === "client" ? "Client" : "Model"} Sign Up - ${firstName} ${lastName}`,
      text: `A new ${role} has signed up on The Model Cloud.\n\nName: ${firstName} ${lastName}\nEmail: ${email}${role === "client" && companyName ? `\nCompany: ${companyName}` : ""}\nRegistered: ${createdAt}`,
      html: `
        <h2>New ${role === "client" ? "Client" : "Model"} Registration</h2>
        <p>A new ${role} has signed up on The Model Cloud.</p>
        <table style="border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${firstName} ${lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Role</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${role === "client" ? "Client" : "Model"}</td>
          </tr>
          ${role === "client" && companyName ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${companyName}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Registered</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${createdAt}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <a href="https://themodel.cloud/admin/users" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin</a>
        </p>
      `
    };

    try {
      await sgMail.send(msg);
      console.log(`Admin notification sent for new user: ${email}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      return { success: false, error: error.message };
    }
  });


// ============================================================================
// MESSAGING FUNCTIONS
// ============================================================================

/**
 * Create a new message thread between participants
 * Called when user clicks "Message" button on job details
 * Uses v2 callable functions API for proper auth handling
 */
exports.createThread = onCall(async (request) => {
  // 1. Validate authentication (v2 API: auth is on request object)
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { participantUid, type, jobId } = request.data;
  const creatorUid = request.auth.uid;

  // 2. Validate inputs
  if (!participantUid) {
    throw new HttpsError("invalid-argument", "Participant UID is required");
  }

  if (participantUid === creatorUid) {
    throw new HttpsError("invalid-argument", "Cannot create thread with yourself");
  }

  // 3. For job threads, generate deterministic ID to ensure uniqueness
  let threadId = null;
  if (type === "job" && jobId) {
    const sortedUids = [creatorUid, participantUid].sort().join("_");
    threadId = `job_${jobId}_${sortedUids}`;

    // Check if thread already exists
    const existingThread = await db.collection("threads").doc(threadId).get();
    if (existingThread.exists) {
      console.log(`Thread already exists: ${threadId}`);
      return { threadId, existing: true };
    }
  }

  // 4. Fetch participant details for denormalization
  const [creatorDoc, participantDoc] = await Promise.all([
    db.collection("users").doc(creatorUid).get(),
    db.collection("users").doc(participantUid).get()
  ]);

  if (!creatorDoc.exists) {
    throw new HttpsError("not-found", "Creator user not found");
  }

  if (!participantDoc.exists) {
    throw new HttpsError("not-found", "Participant user not found");
  }

  const creatorData = creatorDoc.data();
  const participantData = participantDoc.data();

  // 5. If job thread, validate job access and get job details
  let jobDetails = null;
  if (type === "job" && jobId) {
    const jobDoc = await db.collection("jobs").doc(jobId).get();
    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "Job not found");
    }

    const jobData = jobDoc.data();

    // Validate: creator is either job owner or an applicant
    // Note: jobs use "userId" field for the owner
    const creatorIsOwner = jobData.userId === creatorUid;
    const creatorIsApplicant = (jobData.applicants || []).includes(creatorUid);
    const participantIsOwner = jobData.userId === participantUid;
    const participantIsApplicant = (jobData.applicants || []).includes(participantUid);

    // At least one must be the owner and the other must be an applicant
    const validCombination =
      (creatorIsOwner && participantIsApplicant) ||
      (participantIsOwner && creatorIsApplicant);

    if (!validCombination) {
      throw new HttpsError(
        "permission-denied",
        "Not authorized to message about this job"
      );
    }

    jobDetails = {
      title: jobData.title || "Untitled Job",
      reference: jobData.reference || jobId
    };
  }

  // 6. Build thread document
  const threadDoc = {
    participants: [creatorUid, participantUid],
    participantDetails: {
      [creatorUid]: {
        firstName: creatorData.firstName || "",
        lastName: creatorData.lastName || "",
        profileAvatar: creatorData.profileAvatar || null,
        role: creatorData.role || "user"
      },
      [participantUid]: {
        firstName: participantData.firstName || "",
        lastName: participantData.lastName || "",
        profileAvatar: participantData.profileAvatar || null,
        role: participantData.role || "user"
      }
    },
    participantRoles: {
      [creatorUid]: creatorData.role || "user",
      [participantUid]: participantData.role || "user"
    },
    type: type || "job",
    jobId: jobId || null,
    jobDetails: jobDetails,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: creatorUid,
    lastMessage: null,
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessageSenderId: null,
    unread: {
      [creatorUid]: 0,
      [participantUid]: 0
    },
    muted: {
      [creatorUid]: false,
      [participantUid]: false
    }
  };

  // 7. Create thread
  if (threadId) {
    await db.collection("threads").doc(threadId).set(threadDoc);
  } else {
    const ref = await db.collection("threads").add(threadDoc);
    threadId = ref.id;
  }

  console.log(`Thread created: ${threadId}`);
  return { threadId, existing: false };
});


/**
 * Firestore trigger: When a message is created, update thread summary and send notifications
 */
exports.onMessageCreated = onDocumentCreated(
  "threads/{threadId}/messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return null;
    }

    const messageData = snap.data();
    const { threadId } = event.params;
    const senderId = messageData.senderId;

    // 1. Get thread document
    const threadRef = db.collection("threads").doc(threadId);
    const threadDoc = await threadRef.get();

    if (!threadDoc.exists) {
      console.error("Thread not found:", threadId);
      return null;
    }

    const threadData = threadDoc.data();
    const participants = threadData.participants || [];

    // 2. Build unread increment for all participants except sender
    const unreadUpdates = {};
    participants.forEach(uid => {
      if (uid !== senderId) {
        unreadUpdates[`unread.${uid}`] = admin.firestore.FieldValue.increment(1);
      }
    });

    // 3. Update thread summary fields
    const messagePreview = (messageData.body || "").substring(0, 100);
    await threadRef.update({
      lastMessage: messagePreview,
      lastMessageAt: messageData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      lastMessageSenderId: senderId,
      ...unreadUpdates
    });

    console.log(`Thread ${threadId} updated with new message`);

    // 4. Send email notifications to non-muted participants
    if (!sendgridApiKey) {
      console.warn("SendGrid not configured - skipping email notifications");
      return { success: true, emailsSent: 0 };
    }

    const senderDetails = threadData.participantDetails?.[senderId] || {};
    const senderName = `${senderDetails.firstName || ""} ${senderDetails.lastName || ""}`.trim() || "Someone";

    let emailsSent = 0;

    for (const recipientUid of participants) {
      // Skip sender
      if (recipientUid === senderId) continue;

      // Check if muted
      if (threadData.muted && threadData.muted[recipientUid]) {
        console.log(`Skipping muted recipient: ${recipientUid}`);
        continue;
      }

      // Get recipient email
      const recipientDoc = await db.collection("users").doc(recipientUid).get();
      if (!recipientDoc.exists) continue;

      const recipientData = recipientDoc.data();
      const recipientEmail = recipientData.email;
      const recipientName = recipientData.firstName || "there";

      if (!recipientEmail) {
        console.warn(`No email for recipient: ${recipientUid}`);
        continue;
      }

      // Build email subject based on thread type
      let subject = `New message from ${senderName}`;
      let jobInfo = "";
      if (threadData.type === "job" && threadData.jobDetails) {
        subject = `New message about "${threadData.jobDetails.title}"`;
        jobInfo = `<p><strong>Job:</strong> ${threadData.jobDetails.title}</p>`;
      }

      // Sanitize message preview
      const safePreview = (messageData.body || "")
        .substring(0, 500)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const msg = {
        to: recipientEmail,
        from: sendgridFromEmail,
        subject: subject,
        html: `
          <h2>New Message</h2>
          <p>Hi ${recipientName},</p>
          <p><strong>From:</strong> ${senderName}</p>
          ${jobInfo}
          <p><strong>Message:</strong></p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            ${safePreview}${messageData.body && messageData.body.length > 500 ? "..." : ""}
          </div>
          <p>
            <a href="https://themodel.cloud/messages/${threadId}"
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Conversation
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">
            You received this email because you have a conversation on The Model Cloud.
          </p>
        `
      };

      try {
        await sgMail.send(msg);
        emailsSent++;
        console.log(`Email notification sent to ${recipientEmail}`);
      } catch (error) {
        console.error(`Failed to send email to ${recipientEmail}:`, error.message);
      }
    }

    return { success: true, emailsSent };
  }
);


// ============================================================================
// FAVOURITES SHARING FUNCTIONS
// ============================================================================

/**
 * Send a favourite list share email
 * Called when user shares a list via email from the ShareListModal
 */
exports.sendShareListEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured");
    return { success: false, skipped: true };
  }

  const { to, listTitle, listDescription, shareUrl, modelCount, senderName } = request.data;

  if (!to || !listTitle || !shareUrl) {
    throw new HttpsError("invalid-argument", "Missing required fields: to, listTitle, shareUrl");
  }

  const msg = {
    to,
    from: sendgridFromEmail,
    subject: `${senderName || "Someone"} shared a model list with you: ${listTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${listTitle}</h2>
        ${listDescription ? `<p style="color: #666;">${listDescription}</p>` : ""}
        <p style="color: #666;">${modelCount || 0} models in this list</p>

        <div style="margin: 24px 0;">
          <a href="${shareUrl}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Model List
          </a>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          This list was shared with you via The Model Cloud.
          <br>
          <a href="https://themodel.cloud" style="color: #1976d2;">Visit The Model Cloud</a>
        </p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Share list email sent to ${to} for list: ${listTitle}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send share list email:", error.message);
    throw new HttpsError("internal", "Failed to send email");
  }
});


/**
 * Mark a thread as read for the current user
 * Called when user opens a thread conversation
 * Uses v2 callable functions API for proper auth handling
 */
exports.markThreadAsRead = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { threadId } = request.data;
  const uid = request.auth.uid;

  if (!threadId) {
    throw new HttpsError("invalid-argument", "Thread ID is required");
  }

  const threadRef = db.collection("threads").doc(threadId);
  const threadDoc = await threadRef.get();

  if (!threadDoc.exists) {
    throw new HttpsError("not-found", "Thread not found");
  }

  const threadData = threadDoc.data();

  // Verify user is a participant
  if (!threadData.participants || !threadData.participants.includes(uid)) {
    throw new HttpsError("permission-denied", "Not a participant of this thread");
  }

  // Reset unread count for this user
  await threadRef.update({
    [`unread.${uid}`]: 0
  });

  console.log(`Thread ${threadId} marked as read for user ${uid}`);
  return { success: true };
});


// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Delete a model account (Admin/Super Admin only)
 * Deletes: Firestore user document, Cloudinary images, Firebase Auth user
 * Also cleans up related data: favourites, threads, job applications
 */
exports.deleteModel = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { modelUid } = request.data;

  if (!modelUid) {
    throw new HttpsError("invalid-argument", "Model UID is required");
  }

  // 2. Verify caller is an admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can delete models");
  }

  // 3. Verify target user exists and is a model
  const modelDoc = await db.collection("users").doc(modelUid).get();
  if (!modelDoc.exists) {
    throw new HttpsError("not-found", "Model not found");
  }

  const modelData = modelDoc.data();
  if (modelData.role !== "model") {
    throw new HttpsError("invalid-argument", "Can only delete model accounts");
  }

  const modelName = `${modelData.firstName || ""} ${modelData.lastName || ""}`.trim();
  const modelEmail = modelData.email || "";

  console.log(`Admin ${callerData.email} deleting model: ${modelEmail} (${modelUid})`);

  // Track cleanup results
  const cleanup = {
    favouriteLists: 0,
    quickFavourites: 0,
    threads: 0,
    threadMessages: 0,
    jobApplications: 0,
  };
  const deletedImages = [];
  const errors = [];

  // 4. Delete Cloudinary images
  if (process.env.CLOUDINARY_API_KEY) {
    try {
      // Try standard profile image location
      const profileResult = await cloudinary.uploader.destroy(`user_${modelUid}_profile`);
      deletedImages.push({ publicId: `user_${modelUid}_profile`, result: profileResult.result });

      // Try imported profile image location
      const importedResult = await cloudinary.uploader.destroy(`users/imported/user_${modelUid}_profile`);
      deletedImages.push({ publicId: `users/imported/user_${modelUid}_profile`, result: importedResult.result });

      console.log(`Cloudinary images deleted for model ${modelUid}`);
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError.message);
      errors.push({ type: "cloudinary", message: cloudinaryError.message });
      // Continue with deletion even if Cloudinary fails
    }
  }

  // 5. Clean up related data

  // 5a. Remove from favourite lists (modelIds array)
  try {
    const listsWithModel = await db.collection("favouriteLists")
      .where("modelIds", "array-contains", modelUid)
      .get();

    for (const listDoc of listsWithModel.docs) {
      const listData = listDoc.data();
      const updateData = {
        modelIds: admin.firestore.FieldValue.arrayRemove(modelUid),
      };

      // Also remove from models array if it exists
      if (listData.models && Array.isArray(listData.models)) {
        const filteredModels = listData.models.filter(m => m.uid !== modelUid);
        updateData.models = filteredModels;
      }

      await listDoc.ref.update(updateData);
      cleanup.favouriteLists++;
    }
    console.log(`Removed model from ${cleanup.favouriteLists} favourite lists`);
  } catch (err) {
    console.error("Error cleaning favourite lists:", err.message);
    errors.push({ type: "favouriteLists", message: err.message });
  }

  // 5b. Remove from users' favouriteModelIds arrays
  try {
    const usersWithFavourite = await db.collection("users")
      .where("favouriteModelIds", "array-contains", modelUid)
      .get();

    for (const userDoc of usersWithFavourite.docs) {
      await userDoc.ref.update({
        favouriteModelIds: admin.firestore.FieldValue.arrayRemove(modelUid),
      });
      cleanup.quickFavourites++;
    }
    console.log(`Removed model from ${cleanup.quickFavourites} users' quick favourites`);
  } catch (err) {
    console.error("Error cleaning quick favourites:", err.message);
    errors.push({ type: "quickFavourites", message: err.message });
  }

  // 5c. Remove from job applicants arrays
  try {
    const jobsWithApplicant = await db.collection("jobs")
      .where("applicants", "array-contains", modelUid)
      .get();

    for (const jobDoc of jobsWithApplicant.docs) {
      await jobDoc.ref.update({
        applicants: admin.firestore.FieldValue.arrayRemove(modelUid),
      });
      cleanup.jobApplications++;
    }
    console.log(`Removed model from ${cleanup.jobApplications} job applications`);
  } catch (err) {
    console.error("Error cleaning job applications:", err.message);
    errors.push({ type: "jobApplications", message: err.message });
  }

  // 5d. Delete threads where model is a participant
  try {
    const threadsWithModel = await db.collection("threads")
      .where("participants", "array-contains", modelUid)
      .get();

    for (const threadDoc of threadsWithModel.docs) {
      // Delete all messages in thread
      const messagesSnapshot = await threadDoc.ref.collection("messages").get();
      for (const msgDoc of messagesSnapshot.docs) {
        await msgDoc.ref.delete();
        cleanup.threadMessages++;
      }
      // Delete the thread
      await threadDoc.ref.delete();
      cleanup.threads++;
    }
    console.log(`Deleted ${cleanup.threads} threads with ${cleanup.threadMessages} messages`);
  } catch (err) {
    console.error("Error cleaning threads:", err.message);
    errors.push({ type: "threads", message: err.message });
  }

  // 6. Delete Firestore user document
  try {
    await db.collection("users").doc(modelUid).delete();
    console.log(`Deleted Firestore document for model ${modelUid}`);
  } catch (err) {
    console.error("Error deleting Firestore document:", err.message);
    throw new HttpsError("internal", "Failed to delete model document");
  }

  // 7. Delete Firebase Auth user
  try {
    await admin.auth().deleteUser(modelUid);
    console.log(`Deleted Firebase Auth user for model ${modelUid}`);
  } catch (authError) {
    // User might not exist in Auth (e.g., imported model without auth account)
    console.warn("Auth deletion warning:", authError.message);
    if (authError.code !== "auth/user-not-found") {
      errors.push({ type: "auth", message: authError.message });
    }
  }

  console.log(`Model ${modelEmail} (${modelUid}) deleted successfully by ${callerData.email}`);

  return {
    success: true,
    modelUid,
    modelName,
    modelEmail,
    cleanup,
    deletedImages,
    errors: errors.length > 0 ? errors : null,
  };
});


/**
 * Delete a user from Firebase Authentication (Admin/Super Admin only)
 * Used by bulk delete operations to remove Auth accounts after Firestore deletion
 * @param {string} userUid - The UID of the user to delete from Auth
 * @returns {Object} - Success status and any errors
 */
exports.deleteUserAuth = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { userUid } = request.data;

  if (!userUid) {
    throw new HttpsError("invalid-argument", "User UID is required");
  }

  // 2. Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;

  if (callerRole !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can delete auth users");
  }

  // 3. Delete Firebase Auth user
  try {
    await admin.auth().deleteUser(userUid);
    console.log(`Firebase Auth user ${userUid} deleted by ${callerData.email}`);
    return { success: true, userUid };
  } catch (authError) {
    // User might not exist in Auth (e.g., imported user without auth account)
    if (authError.code === "auth/user-not-found") {
      console.warn(`Auth user not found: ${userUid}`);
      return { success: true, userUid, notFound: true };
    }
    console.error("Auth deletion error:", authError.message);
    throw new HttpsError("internal", `Failed to delete auth user: ${authError.message}`);
  }
});


// ============================================================================
// MODEL IMPORT FUNCTIONS
// ============================================================================

/**
 * Import models from CSV data (Admin/Super Admin only)
 * Uses Admin SDK to avoid rate limits and handle existing Auth users
 * @param {Array} models - Array of model objects with email, firstName, lastName, etc.
 * @returns {Object} - Results for each model (created, updated, or error)
 */
exports.importModels = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { models } = request.data;

  if (!models || !Array.isArray(models) || models.length === 0) {
    throw new HttpsError("invalid-argument", "Models array is required");
  }

  // 2. Verify caller is an admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can import models");
  }

  console.log(`Admin ${callerData.email} starting import of ${models.length} models`);

  const results = [];
  const defaultPassword = "Model123!";

  // 3. Process each model
  for (const model of models) {
    const email = model.email?.toLowerCase()?.trim();

    if (!email) {
      results.push({ email: "(missing)", status: "error", message: "Missing email address" });
      continue;
    }

    // Generate public slug
    const firstName = (model.firstName || "").trim();
    const lastName = (model.lastName || "").trim();
    const firstNameLower = firstName.toLowerCase();
    const lastInitial = lastName.charAt(0).toLowerCase();
    const publicSlug = `${firstNameLower}.${lastInitial}`;

    const modelData = {
      firstName,
      lastName,
      email,
      instagram: model.instagram || "",
      gender: model.gender || "",
      phone: model.phone || "",
      height: model.height || "",
      chest: model.chest || "",
      waist: model.waist || "",
      hips: model.hips || "",
      shoeSize: model.shoeSize || "",
      aboutMe: model.aboutMe || "",
      location: model.location || "",
      role: "model",
      publicSlug,
      updatedAt: new Date().toISOString(),
      importedViaCSV: true, // Flag to skip welcome emails
    };

    try {
      // Check if user exists in Firestore first
      const firestoreQuery = await db.collection("users").where("email", "==", email).get();

      if (!firestoreQuery.empty) {
        // User exists in Firestore - update them
        const existingDoc = firestoreQuery.docs[0];
        try {
          await existingDoc.ref.update({
            ...modelData,
            status: "imported",
          });
          console.log(`Updated existing Firestore user: ${email}`);
          results.push({ email, status: "updated", message: "Existing Firestore user updated" });
        } catch (updateError) {
          console.error(`Failed to update ${email}:`, updateError);
          results.push({ email, status: "error", message: `Update failed: ${updateError.message}` });
        }
        continue;
      }

      // User doesn't exist in Firestore - check if they exist in Auth
      let uid;
      let authUserExisted = false;

      try {
        // Try to get existing Auth user by email
        const existingAuthUser = await admin.auth().getUserByEmail(email);
        uid = existingAuthUser.uid;
        authUserExisted = true;
        console.log(`Found existing Auth user for ${email}: ${uid}`);
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          // User doesn't exist in Auth - create them
          try {
            const newAuthUser = await admin.auth().createUser({
              email,
              password: defaultPassword,
              displayName: `${firstName} ${lastName}`.trim(),
            });
            uid = newAuthUser.uid;
            console.log(`Created new Auth user for ${email}: ${uid}`);
          } catch (createError) {
            results.push({ email, status: "error", message: `Auth creation failed: ${createError.message}` });
            continue;
          }
        } else {
          results.push({ email, status: "error", message: `Auth lookup failed: ${authError.message}` });
          continue;
        }
      }

      // Create Firestore document
      await db.collection("users").doc(uid).set({
        ...modelData,
        uid,
        createdAt: new Date().toISOString(),
        status: "activated",
      });

      if (authUserExisted) {
        results.push({ email, status: "linked", message: "Linked to existing Auth user" });
      } else {
        results.push({ email, status: "created", message: "New user created" });
      }

    } catch (err) {
      console.error(`Error processing ${email}:`, err);
      results.push({ email, status: "error", message: err.message });
    }
  }

  // 4. Summary
  const summary = {
    total: models.length,
    created: results.filter(r => r.status === "created").length,
    updated: results.filter(r => r.status === "updated").length,
    linked: results.filter(r => r.status === "linked").length,
    errors: results.filter(r => r.status === "error").length,
  };

  console.log(`Import complete:`, summary);

  // 5. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "IMPORT_MODELS",
      description: `Imported ${summary.total} models via CSV`,
      details: {
        summary,
        importedEmails: results.filter(r => r.status !== "error").map(r => r.email),
        errorEmails: results.filter(r => r.status === "error").map(r => ({ email: r.email, error: r.message })),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
    console.log(`Admin action logged: IMPORT_MODELS by ${callerData.email}`);
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
    // Don't fail the import just because logging failed
  }

  return { success: true, results, summary };
});
