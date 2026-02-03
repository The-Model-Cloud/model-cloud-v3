require("dotenv").config();

const functions = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");

// Simple Instagram follower count fetcher using public web data
const getInstagramFollowerCount = async (username) => {
  try {
    // Try the public Instagram API endpoint
    const response = await axios.get(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "X-IG-App-ID": "936619743392459",
        },
      }
    );

    const followerCount = response.data?.data?.user?.edge_followed_by?.count;
    if (typeof followerCount === "number") {
      return followerCount;
    }
    throw new Error("Could not parse follower count from response");
  } catch (error) {
    // Fallback: try scraping the HTML page
    try {
      const htmlResponse = await axios.get(`https://www.instagram.com/${username}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      // Try to extract from meta tags or JSON in the page
      const html = htmlResponse.data;

      // Look for follower count in meta description or JSON data
      const followerMatch = html.match(/"edge_followed_by":\s*{\s*"count":\s*(\d+)/);
      if (followerMatch) {
        return parseInt(followerMatch[1], 10);
      }

      // Alternative pattern
      const altMatch = html.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/);
      if (altMatch) {
        let count = altMatch[1].replace(/,/g, "");
        if (count.endsWith("K")) {
          return Math.round(parseFloat(count) * 1000);
        } else if (count.endsWith("M")) {
          return Math.round(parseFloat(count) * 1000000);
        } else if (count.endsWith("B")) {
          return Math.round(parseFloat(count) * 1000000000);
        }
        return parseInt(count, 10);
      }

      throw new Error("Could not find follower count in page");
    } catch (fallbackError) {
      throw new Error(`Instagram API unavailable: ${error.message}`);
    }
  }
};
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


// ============================================================================
// SYSTEM SETTINGS HELPERS
// ============================================================================

/**
 * Check if emails are enabled in system settings
 * @returns {Promise<boolean>} - Whether emails are enabled
 */
const isEmailEnabled = async () => {
  try {
    const settingsDoc = await db.collection("settings").doc("system").get();
    if (!settingsDoc.exists) {
      // If no settings document exists, emails are enabled by default
      return true;
    }
    const settings = settingsDoc.data();
    // Default to true if emailEnabled is not set
    return settings.emailEnabled !== false;
  } catch (error) {
    console.error("Error checking email settings:", error);
    // Default to true on error
    return true;
  }
};

/**
 * Get system settings (Super Admin only)
 */
exports.getSystemSettings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  // Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can access system settings");
  }

  try {
    const settingsDoc = await db.collection("settings").doc("system").get();

    if (!settingsDoc.exists) {
      // Return default settings if none exist
      return {
        success: true,
        settings: {
          emailEnabled: true,
        },
      };
    }

    return {
      success: true,
      settings: settingsDoc.data(),
    };
  } catch (error) {
    console.error("Error getting system settings:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Update system settings (Super Admin only)
 */
exports.updateSystemSettings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  // Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can update system settings");
  }

  const { settings } = request.data;

  if (!settings || typeof settings !== "object") {
    throw new HttpsError("invalid-argument", "Settings object is required");
  }

  try {
    await db.collection("settings").doc("system").set(
      {
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      },
      { merge: true }
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating system settings:", error);
    throw new HttpsError("internal", error.message);
  }
});


exports.updateInstagramFollowerCount = onCall(async (request) => {
  const { uid, instagramUsername } = request.data;

  if (!uid || !instagramUsername) {
    throw new HttpsError("invalid-argument", "Missing uid or username.");
  }

  try {
    // Fetch the Instagram follower count using the public web scraper
    const count = await getInstagramFollowerCount(instagramUsername);

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

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Email disabled by system settings");
    return { success: false, skipped: true, reason: "disabled" };
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

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Email disabled by system settings");
    return { success: false, skipped: true, reason: "disabled" };
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


// HTTP endpoint for sending job invitation email to model
exports.sendJobInvitationEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured");
    return { success: false, skipped: true };
  }

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Email disabled by system settings");
    return { success: false, skipped: true, reason: "disabled" };
  }

  const { to, modelName, clientName, companyName, jobTitle, jobReference } = request.data;

  if (!to || !modelName || !jobTitle || !jobReference) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const senderName = companyName || clientName || "A client";

  const msg = {
    to,
    from: sendgridFromEmail,
    subject: `You've Been Invited to Apply – ${jobTitle}`,
    text: `Hi ${modelName},\n\n${senderName} has invited you to apply for the job "${jobTitle}".\n\nView the job and apply here: https://themodel.cloud/jobs/${jobReference}\n\nGood luck!\n\nThe Model Cloud Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">You've Been Invited!</h2>
        <p>Hi ${modelName},</p>
        <p><strong>${senderName}</strong> has invited you to apply for the following job:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${jobTitle}</h3>
          <p style="margin: 0; color: #666;">Reference: ${jobReference}</p>
        </div>
        <p>This invitation means the client thinks you'd be a great fit for this job. Don't miss this opportunity!</p>
        <p style="margin: 30px 0;">
          <a href="https://themodel.cloud/jobs/${jobReference}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Job & Apply</a>
        </p>
        <p style="color: #666; font-size: 14px;">Good luck!</p>
        <p style="color: #666; font-size: 14px;">The Model Cloud Team</p>
      </div>
    `
  };

  await sgMail.send(msg);

  return { success: true };
});


// HTTP endpoint for sending account verification email to model
exports.sendVerificationEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured");
    return { success: false, skipped: true };
  }

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Email disabled by system settings");
    return { success: false, skipped: true, reason: "disabled" };
  }

  const { to, modelName } = request.data;

  if (!to || !modelName) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const msg = {
    to,
    from: sendgridFromEmail,
    subject: "Your Account Has Been Verified - The Model Cloud",
    text: `Hi ${modelName},\n\nGreat news! Your account on The Model Cloud has been verified.\n\nYou can now:\n- Apply for jobs\n- Create your own Z-Card\n- Appear in search listings\n- Be matched to relevant jobs\n\nLog in now to explore opportunities: https://themodel.cloud/dashboard\n\nWelcome to The Model Cloud!\n\nThe Model Cloud Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Your Account Has Been Verified!</h2>
        <p>Hi ${modelName},</p>
        <p>Great news! Your account on <strong>The Model Cloud</strong> has been verified.</p>
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
          <h3 style="margin: 0 0 15px 0; color: #2e7d32;">You can now:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333;">
            <li style="margin-bottom: 8px;">Apply for jobs</li>
            <li style="margin-bottom: 8px;">Create your own Z-Card</li>
            <li style="margin-bottom: 8px;">Appear in search listings</li>
            <li style="margin-bottom: 8px;">Be matched to relevant jobs</li>
          </ul>
        </div>
        <p style="margin: 30px 0;">
          <a href="https://themodel.cloud/dashboard" style="background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </p>
        <p style="color: #666; font-size: 14px;">Welcome to The Model Cloud!</p>
        <p style="color: #666; font-size: 14px;">The Model Cloud Team</p>
      </div>
    `
  };

  await sgMail.send(msg);

  return { success: true };
});


// HTTP endpoint for sending account unverification email to model
exports.sendUnverificationEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured");
    return { success: false, skipped: true };
  }

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Email disabled by system settings");
    return { success: false, skipped: true, reason: "disabled" };
  }

  const { to, modelName } = request.data;

  if (!to || !modelName) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const msg = {
    to,
    from: sendgridFromEmail,
    subject: "Account Update Required - The Model Cloud",
    text: `Hi ${modelName},\n\nYour account on The Model Cloud has been marked as requiring updates.\n\nWhat this means:\n- Your profile won't appear in search results for clients\n- You won't be matched to new jobs\n- You can still access your account and update your profile\n\nTo restore full access, please log in and update the content on your account. Once your profile is complete, an admin will review and verify your account.\n\nUpdate your profile here: https://themodel.cloud/edit-profile\n\nIf you have any questions, please contact our support team.\n\nThe Model Cloud Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ed6c02;">Account Update Required</h2>
        <p>Hi ${modelName},</p>
        <p>Your account on <strong>The Model Cloud</strong> has been marked as requiring updates.</p>
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ed6c02;">
          <h3 style="margin: 0 0 15px 0; color: #ed6c02;">What this means:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333;">
            <li style="margin-bottom: 8px;">Your profile won't appear in search results for clients</li>
            <li style="margin-bottom: 8px;">You won't be matched to new jobs</li>
            <li style="margin-bottom: 8px;">You can still access your account and update your profile</li>
          </ul>
        </div>
        <p>To restore full access, please log in and update the content on your account. Once your profile is complete, an admin will review and verify your account.</p>
        <p style="margin: 30px 0;">
          <a href="https://themodel.cloud/edit-profile" style="background-color: #ed6c02; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Update Your Profile</a>
        </p>
        <p style="color: #666; font-size: 14px;">If you have any questions, please contact our support team.</p>
        <p style="color: #666; font-size: 14px;">The Model Cloud Team</p>
      </div>
    `
  };

  await sgMail.send(msg);

  return { success: true };
});


// HTTP endpoint for sending welcome email to new users created by admin
exports.sendWelcomeEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured");
    return { success: false, skipped: true };
  }

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Email disabled by system settings");
    return { success: false, skipped: true, reason: "disabled" };
  }

  const { email, firstName, lastName, role, password } = request.data;

  if (!email || !firstName || !lastName || !role || !password) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  // Format role for display
  const formattedRole = role
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const loginUrl = "https://themodel.cloud/sign-in";
  const supportEmail = "support@themodel.cloud";

  const msg = {
    to: email,
    from: sendgridFromEmail,
    subject: `Welcome to The Model Cloud - Your Account Details`,
    text: `Welcome to The Model Cloud, ${firstName}!\n\nYour account has been created with the following details:\n\nEmail: ${email}\nPassword: ${password}\nRole: ${formattedRole}\n\nYou can log in at: ${loginUrl}\n\nFor security reasons, we recommend changing your password after your first login.\n\nIf you have any questions, please contact us at ${supportEmail}.\n\nBest regards,\nThe Model Cloud Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to The Model Cloud</h1>
        </div>
        <div style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Hi ${firstName},</p>
          <p style="font-size: 16px;">Your account has been created and you're ready to get started!</p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Your Login Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 100px;">Email:</td>
                <td style="padding: 8px 0; font-weight: bold;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Password:</td>
                <td style="padding: 8px 0; font-weight: bold; font-family: monospace; background-color: #f8f9fa; padding-left: 10px;">${password}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Role:</td>
                <td style="padding: 8px 0; font-weight: bold;">${formattedRole}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 30px 0; text-align: center;">
            <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In Now</a>
          </p>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Security Tip:</strong> For your security, we recommend changing your password after your first login.
            </p>
          </div>

          <p style="color: #666; font-size: 14px;">If you have any questions or need assistance, please contact us at <a href="mailto:${supportEmail}" style="color: #667eea;">${supportEmail}</a>.</p>

          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 25px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            The Model Cloud Team<br>
            <a href="https://themodel.cloud" style="color: #667eea;">themodel.cloud</a>
          </p>
        </div>
      </div>
    `
  };

  await sgMail.send(msg);
  console.log(`✅ Welcome email sent to ${email}`);

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

    // Check if emails are enabled in system settings
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      console.log("📧 Admin notification email disabled by system settings");
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

    // Check if emails are enabled in system settings
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      console.log("📧 Message notification emails disabled by system settings");
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

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Share list email disabled by system settings");
    return { success: false, skipped: true, reason: "disabled" };
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
 * Send a Z-Card share email
 * Called when user shares a Z-Card via the ShareZCardModal
 * Uses v2 callable functions API for proper auth handling
 */
exports.sendZCardEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured");
    return { success: false, skipped: true };
  }

  const { to, modelName, shareUrl, senderName, senderContact } = request.data;

  if (!to || !modelName || !shareUrl) {
    throw new HttpsError("invalid-argument", "Missing required fields: to, modelName, shareUrl");
  }

  const msg = {
    to,
    from: sendgridFromEmail,
    subject: `${senderName || "Someone"} shared a Z-Card for ${modelName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Z-Card for ${modelName}</h2>
        <p style="color: #666;">A professional comp card has been shared with you.</p>

        <div style="margin: 24px 0;">
          <a href="${shareUrl}"
             style="background-color: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Z-Card
          </a>
        </div>

        ${senderContact ? `
        <p style="color: #666;">
          <strong>Contact:</strong> ${senderContact}
        </p>
        ` : ""}

        <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          This Z-Card was shared via The Model Cloud.
          <br>
          <a href="https://themodel.cloud" style="color: #E91E63;">Visit The Model Cloud</a>
        </p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Z-Card email sent to ${to} for model: ${modelName}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send Z-Card email:", error.message);
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
// ADMIN USER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Reset a user's password (Admin only)
 * Sets a new password for the user in Firebase Authentication
 * @param {string} userUid - The user's UID
 * @param {string} newPassword - The new password to set
 * @param {boolean} sendEmail - Whether to send the new password to the user via email
 * @returns {Object} - Success status
 */
exports.adminResetUserPassword = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { userUid, newPassword, sendEmail } = request.data;

  if (!userUid || !newPassword) {
    throw new HttpsError("invalid-argument", "User UID and new password are required");
  }

  if (newPassword.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters");
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
    throw new HttpsError("permission-denied", "Only admins can reset user passwords");
  }

  // 3. Get target user info
  const userDoc = await db.collection("users").doc(userUid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  const userEmail = userData.email;

  console.log(`Admin ${callerData.email} resetting password for user: ${userEmail}`);

  // 4. Update password in Firebase Auth
  try {
    await admin.auth().updateUser(userUid, { password: newPassword });
    console.log(`Password updated for user ${userUid}`);
  } catch (authError) {
    console.error("Error updating password:", authError);
    throw new HttpsError("internal", `Failed to update password: ${authError.message}`);
  }

  // 5. Send email with new password if requested
  const emailEnabled = await isEmailEnabled();
  if (sendEmail && userEmail && sendgridApiKey && emailEnabled) {
    try {
      const msg = {
        to: userEmail,
        from: sendgridFromEmail,
        subject: "Your Password Has Been Reset - The Model Cloud",
        html: `
          <h2>Password Reset</h2>
          <p>Hi ${userName || "there"},</p>
          <p>Your password for The Model Cloud has been reset by an administrator.</p>
          <p>Your new password is: <strong>${newPassword}</strong></p>
          <p>Please log in and change your password as soon as possible.</p>
          <p>
            <a href="https://themodel.cloud/sign-in"
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Log In Now
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">
            If you did not expect this password reset, please contact support immediately.
          </p>
        `
      };
      await sgMail.send(msg);
      console.log(`Password reset email sent to ${userEmail}`);
    } catch (emailError) {
      console.error("Error sending password email:", emailError);
      // Don't fail the operation if email fails
    }
  }

  // 6. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "RESET_USER_PASSWORD",
      description: `Reset password for user: ${userEmail}`,
      details: {
        userUid,
        userEmail,
        userName,
        userRole: userData.role,
        emailSent: sendEmail && !!userEmail && emailEnabled,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
  }

  return {
    success: true,
    userUid,
    userEmail,
    emailSent: sendEmail && !!userEmail && !!sendgridApiKey && emailEnabled,
  };
});


/**
 * Update a user's email address (Admin only)
 * Updates email in Firebase Auth and all Firestore locations
 * @param {string} userUid - The user's UID
 * @param {string} newEmail - The new email address
 * @returns {Object} - Success status
 */
exports.adminUpdateUserEmail = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { userUid, newEmail } = request.data;

  if (!userUid || !newEmail) {
    throw new HttpsError("invalid-argument", "User UID and new email are required");
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    throw new HttpsError("invalid-argument", "Invalid email format");
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
    throw new HttpsError("permission-denied", "Only admins can update user emails");
  }

  // 3. Get target user info
  const userDoc = await db.collection("users").doc(userUid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  const oldEmail = userData.email;
  const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();

  if (oldEmail === newEmail) {
    return { success: true, message: "Email is the same, no changes made" };
  }

  console.log(`Admin ${callerData.email} updating email for user: ${oldEmail} -> ${newEmail}`);

  // 4. Update email in Firebase Auth
  try {
    await admin.auth().updateUser(userUid, { email: newEmail });
    console.log(`Auth email updated for user ${userUid}`);
  } catch (authError) {
    console.error("Error updating auth email:", authError);
    if (authError.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "This email is already in use by another account");
    }
    throw new HttpsError("internal", `Failed to update email: ${authError.message}`);
  }

  // 5. Update email in Firestore user document
  try {
    await db.collection("users").doc(userUid).update({
      email: newEmail,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Firestore email updated for user ${userUid}`);
  } catch (firestoreError) {
    console.error("Error updating Firestore email:", firestoreError);
    // Try to rollback Auth change
    try {
      await admin.auth().updateUser(userUid, { email: oldEmail });
    } catch (rollbackError) {
      console.error("Failed to rollback auth email:", rollbackError);
    }
    throw new HttpsError("internal", "Failed to update email in database");
  }

  // 6. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "UPDATE_USER_EMAIL",
      description: `Updated email for user: ${oldEmail} -> ${newEmail}`,
      details: {
        userUid,
        oldEmail,
        newEmail,
        userName,
        userRole: userData.role,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
  }

  return {
    success: true,
    userUid,
    oldEmail,
    newEmail,
  };
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
exports.importModels = onCall({ timeoutSeconds: 540 }, async (request) => {
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

  const defaultPassword = "Model123!";
  const BATCH_SIZE = 10; // Process 10 models in parallel at a time

  // Helper function to process a single model
  const processModel = async (model) => {
    const email = model.email?.toLowerCase()?.trim();

    if (!email) {
      return { email: "(missing)", status: "error", message: "Missing email address" };
    }

    // Generate public slug
    const firstName = (model.firstName || "").trim();
    const lastName = (model.lastName || "").trim();
    const firstNameLower = firstName.toLowerCase();
    const lastInitial = lastName.charAt(0).toLowerCase();
    const publicSlug = `${firstNameLower}.${lastInitial}`;

    // Convert height from feet/inches to cm (e.g., "5'6''" or "5'3"" -> "168")
    let heightCm = "";
    const heightValue = (model.height || "").trim();
    if (heightValue) {
      // Match patterns like: 5'6'', 5'6", 5' 6", 5ft 6in, 5'6, etc.
      const feetInchesPattern = /(\d+)\s*[''′ft]*\s*(\d+)?\s*["''″in]*/i;
      const match = heightValue.match(feetInchesPattern);
      if (match) {
        const feet = parseInt(match[1], 10) || 0;
        const inches = parseInt(match[2], 10) || 0;
        // Convert to cm: 1 foot = 30.48 cm, 1 inch = 2.54 cm
        const totalCm = Math.round((feet * 30.48) + (inches * 2.54));
        heightCm = String(totalCm);
      } else if (/^\d+$/.test(heightValue)) {
        // Already a number (could be cm), keep as-is
        heightCm = heightValue;
      }
    }

    // Combine bust and cup into braSize (e.g., "32" + "DD" = "32DD")
    // If bust is an odd number, round up to the next even number
    let braSize = "";
    const bustValue = (model.bust || "").trim();
    const cupValue = (model.cup || "").trim();
    if (bustValue && cupValue) {
      let bustNumber = parseInt(bustValue, 10);
      if (!isNaN(bustNumber)) {
        // Round odd numbers up to the next even number
        if (bustNumber % 2 !== 0) {
          bustNumber += 1;
        }
        braSize = `${bustNumber}${cupValue}`;
      }
    }

    // Convert waist from inches to cm (1 inch = 2.54 cm)
    let waistCm = "";
    const waistValue = (model.waist || "").trim();
    if (waistValue) {
      const waistNumber = parseFloat(waistValue);
      if (!isNaN(waistNumber)) {
        waistCm = String(Math.round(waistNumber * 2.54));
      }
    }

    // Convert chest from inches to cm (1 inch = 2.54 cm)
    let chestCm = "";
    const chestValue = (model.chest || "").trim();
    if (chestValue) {
      const chestNumber = parseFloat(chestValue);
      if (!isNaN(chestNumber)) {
        chestCm = String(Math.round(chestNumber * 2.54));
      }
    }

    // Convert hips from inches to cm (1 inch = 2.54 cm)
    let hipsCm = "";
    const hipsValue = (model.hips || "").trim();
    if (hipsValue) {
      const hipsNumber = parseFloat(hipsValue);
      if (!isNaN(hipsNumber)) {
        hipsCm = String(Math.round(hipsNumber * 2.54));
      }
    }

    const modelData = {
      firstName,
      lastName,
      email,
      instagram: model.instagram || "",
      gender: model.gender || "",
      phone: model.phone || "",
      height: heightCm, // Converted to cm from feet/inches
      heightOriginal: heightValue, // Original value from CSV (e.g., "5'6''") for imperial display
      chest: chestCm, // Converted to cm from inches
      chestOriginal: chestValue, // Original value in inches
      bust: model.bust || "",
      cup: model.cup || "",
      braSize, // Combined bra size (e.g., "32DD")
      waist: waistCm, // Converted to cm from inches
      waistOriginal: waistValue, // Original value in inches
      hips: hipsCm, // Converted to cm from inches
      hipsOriginal: hipsValue, // Original value in inches
      shoeSize: model.shoeSize || "",
      ukDress: model.ukDress || "",
      aboutMe: model.aboutMe || "",
      // Location fields - stored separately for filtering
      country: model.country || "",
      county: model.county || "",
      city: model.city || "",
      location: model.location || "", // Combined display string
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
          return { email, status: "updated", message: "Existing Firestore user updated" };
        } catch (updateError) {
          console.error(`Failed to update ${email}:`, updateError);
          return { email, status: "error", message: `Update failed: ${updateError.message}` };
        }
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
            return { email, status: "error", message: `Auth creation failed: ${createError.message}` };
          }
        } else {
          return { email, status: "error", message: `Auth lookup failed: ${authError.message}` };
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
        return { email, status: "linked", message: "Linked to existing Auth user" };
      } else {
        return { email, status: "created", message: "New user created" };
      }

    } catch (err) {
      console.error(`Error processing ${email}:`, err);
      return { email, status: "error", message: err.message };
    }
  };

  // 3. Process models in parallel batches
  const results = [];
  for (let i = 0; i < models.length; i += BATCH_SIZE) {
    const batch = models.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processModel));
    results.push(...batchResults);
    console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(models.length / BATCH_SIZE)}`);
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


/**
 * Get orphaned Firebase Authentication accounts (Super Admin only)
 * Returns accounts that exist in Firebase Auth but not in Firestore
 * @returns {Object} - List of orphaned auth accounts
 */
exports.getOrphanedAuthAccounts = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  if (callerData.role !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can access this function");
  }

  console.log(`Super admin ${callerData.email} checking for orphaned auth accounts`);

  try {
    // 3. Get all users from Firestore
    const firestoreUsers = new Set();
    const usersSnapshot = await db.collection("users").get();
    usersSnapshot.docs.forEach(doc => {
      firestoreUsers.add(doc.id);
    });

    console.log(`Found ${firestoreUsers.size} users in Firestore`);

    // 4. Get all users from Firebase Auth
    const orphanedAccounts = [];
    let nextPageToken;

    do {
      const listResult = await admin.auth().listUsers(1000, nextPageToken);

      for (const authUser of listResult.users) {
        // Check if this auth user exists in Firestore
        if (!firestoreUsers.has(authUser.uid)) {
          orphanedAccounts.push({
            uid: authUser.uid,
            email: authUser.email || "No email",
            displayName: authUser.displayName || "",
            createdAt: authUser.metadata.creationTime,
            lastSignIn: authUser.metadata.lastSignInTime,
            disabled: authUser.disabled,
          });
        }
      }

      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    console.log(`Found ${orphanedAccounts.length} orphaned auth accounts`);

    return {
      success: true,
      orphanedAccounts,
      totalFirestoreUsers: firestoreUsers.size,
      totalOrphaned: orphanedAccounts.length,
    };
  } catch (error) {
    console.error("Error getting orphaned accounts:", error);
    throw new HttpsError("internal", `Failed to get orphaned accounts: ${error.message}`);
  }
});


/**
 * Delete orphaned Firebase Authentication accounts (Super Admin only)
 * Deletes auth accounts that don't have corresponding Firestore documents
 * @param {Array} uids - Array of UIDs to delete
 * @returns {Object} - Results of deletion
 */
exports.deleteOrphanedAuthAccounts = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { uids } = request.data;

  if (!uids || !Array.isArray(uids) || uids.length === 0) {
    throw new HttpsError("invalid-argument", "UIDs array is required");
  }

  // 2. Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  if (callerData.role !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can delete auth accounts");
  }

  console.log(`Super admin ${callerData.email} deleting ${uids.length} orphaned auth accounts`);

  const results = [];
  let deletedCount = 0;
  let failedCount = 0;

  // 3. Delete each auth account
  for (const uid of uids) {
    try {
      // Double-check that this user doesn't exist in Firestore
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        results.push({
          uid,
          status: "skipped",
          message: "User exists in Firestore - not orphaned",
        });
        continue;
      }

      // Get user info before deleting
      let userInfo = { email: "Unknown", displayName: "" };
      try {
        const authUser = await admin.auth().getUser(uid);
        userInfo = {
          email: authUser.email || "No email",
          displayName: authUser.displayName || "",
        };
      } catch (getUserErr) {
        // User might already be deleted, continue anyway
      }

      // Delete the auth account
      await admin.auth().deleteUser(uid);
      deletedCount++;
      results.push({
        uid,
        email: userInfo.email,
        displayName: userInfo.displayName,
        status: "deleted",
      });
    } catch (error) {
      failedCount++;
      if (error.code === "auth/user-not-found") {
        results.push({
          uid,
          status: "not_found",
          message: "User not found in Auth",
        });
      } else {
        results.push({
          uid,
          status: "failed",
          message: error.message,
        });
      }
    }
  }

  // 4. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "DELETE_ORPHANED_AUTH_ACCOUNTS",
      description: `Deleted ${deletedCount} orphaned auth accounts`,
      details: {
        totalRequested: uids.length,
        deletedCount,
        failedCount,
        results,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
  }

  console.log(`Orphaned auth deletion complete: ${deletedCount} deleted, ${failedCount} failed`);

  return {
    success: true,
    deletedCount,
    failedCount,
    results,
  };
});


// ============================================================================
// CLOUDINARY CLEANUP FUNCTIONS
// ============================================================================

/**
 * Get orphaned Cloudinary folders (Super Admin only)
 * Returns folders in users/models/ and users/clients/ that don't have corresponding Firestore users
 * @returns {Object} - List of orphaned folders with resource counts
 */
exports.getOrphanedCloudinaryFolders = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  if (callerData.role !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can access this function");
  }

  // 3. Verify Cloudinary is configured
  if (!process.env.CLOUDINARY_API_KEY) {
    throw new HttpsError("failed-precondition", "Cloudinary is not configured");
  }

  console.log(`Super admin ${callerData.email} checking for orphaned Cloudinary folders`);

  try {
    // 4. Get all usernames/publicSlugs from Firestore
    const validUsernames = new Set();
    const usersSnapshot = await db.collection("users").get();
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Add all possible identifiers that could be used as folder names
      if (data.publicSlug) validUsernames.add(data.publicSlug.toLowerCase());
      if (data.username) validUsernames.add(data.username.toLowerCase());
      validUsernames.add(doc.id); // UID as fallback
      // Also add firstName_lastName pattern used during signup
      if (data.firstName && data.lastName) {
        const signupPattern = `${data.firstName}_${data.lastName}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        validUsernames.add(signupPattern);
      }
    });

    console.log(`Found ${validUsernames.size} valid usernames in Firestore`);

    // 5. Get all valid job references from Firestore
    const validJobRefs = new Set();
    const jobsSnapshot = await db.collection("jobs").get();
    jobsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.reference) validJobRefs.add(data.reference);
      validJobRefs.add(doc.id); // Also add doc ID as fallback
    });

    console.log(`Found ${validJobRefs.size} valid job references in Firestore`);

    // 6. Get all folders from Cloudinary
    const orphanedFolders = [];
    const foldersToCheck = ["users/models", "users/clients"];

    for (const parentFolder of foldersToCheck) {
      try {
        const subFoldersResult = await cloudinary.api.sub_folders(parentFolder);
        const subFolders = subFoldersResult.folders || [];

        for (const folder of subFolders) {
          const folderName = folder.name.toLowerCase();
          const fullPath = folder.path;

          // Check if this folder corresponds to a valid user
          if (!validUsernames.has(folderName)) {
            // Get resource count for this folder
            let resourceCount = 0;
            try {
              const resources = await cloudinary.api.resources({
                type: "upload",
                prefix: fullPath,
                max_results: 500,
              });
              resourceCount = resources.resources?.length || 0;
            } catch (countErr) {
              console.warn(`Could not count resources in ${fullPath}:`, countErr.message);
            }

            orphanedFolders.push({
              folderName: folder.name,
              fullPath,
              parentFolder,
              resourceCount,
              type: "user",
            });
          } else if (parentFolder === "users/clients") {
            // For valid client folders, check their jobs subfolders
            try {
              const jobsFolderPath = `${fullPath}/jobs`;
              const jobSubFolders = await cloudinary.api.sub_folders(jobsFolderPath);

              for (const jobFolder of (jobSubFolders.folders || [])) {
                const jobRef = jobFolder.name;
                // Check if this job reference exists in Firestore
                if (!validJobRefs.has(jobRef)) {
                  let resourceCount = 0;
                  try {
                    const resources = await cloudinary.api.resources({
                      type: "upload",
                      prefix: jobFolder.path,
                      max_results: 500,
                    });
                    resourceCount = resources.resources?.length || 0;
                  } catch (countErr) {
                    console.warn(`Could not count resources in ${jobFolder.path}:`, countErr.message);
                  }

                  orphanedFolders.push({
                    folderName: jobRef,
                    fullPath: jobFolder.path,
                    parentFolder: jobsFolderPath,
                    resourceCount,
                    type: "job",
                    ownerFolder: folder.name,
                  });
                }
              }
            } catch (jobsErr) {
              // No jobs folder or error accessing it - that's fine
            }
          }
        }
      } catch (folderErr) {
        console.warn(`Could not list folders in ${parentFolder}:`, folderErr.message);
        // Continue with other folders
      }
    }

    // Also check the legacy "users/imported" folder
    try {
      const importedResources = await cloudinary.api.resources({
        type: "upload",
        prefix: "users/imported",
        max_results: 500,
      });

      if (importedResources.resources?.length > 0) {
        // Check each resource to see if its user still exists
        const orphanedImported = [];
        for (const resource of importedResources.resources) {
          // Extract UID from public_id like "users/imported/user_ABC123_profile"
          const match = resource.public_id.match(/user_([^_]+)_/);
          if (match) {
            const uid = match[1];
            const userDoc = await db.collection("users").doc(uid).get();
            if (!userDoc.exists) {
              orphanedImported.push({
                publicId: resource.public_id,
                url: resource.secure_url,
                createdAt: resource.created_at,
              });
            }
          }
        }

        if (orphanedImported.length > 0) {
          orphanedFolders.push({
            folderName: "imported (legacy)",
            fullPath: "users/imported",
            parentFolder: "users",
            resourceCount: orphanedImported.length,
            orphanedResources: orphanedImported,
            type: "legacy",
          });
        }
      }
    } catch (importedErr) {
      console.warn("Could not check users/imported folder:", importedErr.message);
    }

    console.log(`Found ${orphanedFolders.length} orphaned Cloudinary folders`);

    // Count by type for summary
    const userFolders = orphanedFolders.filter(f => f.type === "user").length;
    const jobFolders = orphanedFolders.filter(f => f.type === "job").length;
    const legacyFolders = orphanedFolders.filter(f => f.type === "legacy").length;

    return {
      success: true,
      orphanedFolders,
      totalOrphaned: orphanedFolders.length,
      totalValidUsers: validUsernames.size,
      totalValidJobs: validJobRefs.size,
      summary: {
        orphanedUserFolders: userFolders,
        orphanedJobFolders: jobFolders,
        legacyFolders: legacyFolders,
      },
    };
  } catch (error) {
    console.error("Error getting orphaned Cloudinary folders:", error);
    throw new HttpsError("internal", `Failed to get orphaned folders: ${error.message}`);
  }
});


/**
 * Delete orphaned Cloudinary folders (Super Admin only)
 * Deletes all resources in the specified folders and then the folders themselves
 * @param {Array} folders - Array of folder paths to delete
 * @returns {Object} - Results of deletion
 */
exports.deleteOrphanedCloudinaryFolders = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { folders } = request.data;

  if (!folders || !Array.isArray(folders) || folders.length === 0) {
    throw new HttpsError("invalid-argument", "Folders array is required");
  }

  // 2. Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  if (callerData.role !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can delete Cloudinary folders");
  }

  // 3. Verify Cloudinary is configured
  if (!process.env.CLOUDINARY_API_KEY) {
    throw new HttpsError("failed-precondition", "Cloudinary is not configured");
  }

  console.log(`Super admin ${callerData.email} deleting ${folders.length} orphaned Cloudinary folders`);

  const results = [];
  let deletedResourcesCount = 0;
  let deletedFoldersCount = 0;
  let failedCount = 0;

  // 4. Delete each folder
  for (const folderPath of folders) {
    try {
      // Delete all resources in the folder (and subfolders)
      const deleteResult = await cloudinary.api.delete_resources_by_prefix(folderPath);
      const deletedCount = Object.keys(deleteResult.deleted || {}).length;
      deletedResourcesCount += deletedCount;

      // Try to delete the folder itself (will only work if empty)
      try {
        await cloudinary.api.delete_folder(folderPath);
        deletedFoldersCount++;
      } catch (folderErr) {
        // Folder might have subfolders, try to delete them recursively
        try {
          const subFolders = await cloudinary.api.sub_folders(folderPath);
          for (const sub of (subFolders.folders || [])) {
            await cloudinary.api.delete_resources_by_prefix(sub.path);
            await cloudinary.api.delete_folder(sub.path);
          }
          // Try again to delete the parent folder
          await cloudinary.api.delete_folder(folderPath);
          deletedFoldersCount++;
        } catch (subErr) {
          console.warn(`Could not fully delete folder ${folderPath}:`, subErr.message);
        }
      }

      results.push({
        folderPath,
        status: "deleted",
        resourcesDeleted: deletedCount,
      });
    } catch (error) {
      failedCount++;
      results.push({
        folderPath,
        status: "failed",
        message: error.message,
      });
      console.error(`Failed to delete folder ${folderPath}:`, error.message);
    }
  }

  // 5. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "CLEANUP_CLOUDINARY",
      description: `Deleted ${deletedResourcesCount} Cloudinary resources from ${deletedFoldersCount} folders`,
      details: {
        totalFoldersRequested: folders.length,
        deletedFoldersCount,
        deletedResourcesCount,
        failedCount,
        results,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
  }

  console.log(`Cloudinary cleanup complete: ${deletedResourcesCount} resources, ${deletedFoldersCount} folders deleted`);

  return {
    success: true,
    deletedResourcesCount,
    deletedFoldersCount,
    failedCount,
    results,
  };
});


// ============================================================================
// IMAGE OPTIMIZATION FUNCTIONS
// ============================================================================

/**
 * Helper function to extract Cloudinary public_id from URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null
 */
function extractPublicIdFromUrl(url) {
  if (!url) return null;

  try {
    // Handle Cloudinary URLs like:
    // https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{format}
    // https://res.cloudinary.com/{cloud}/image/upload/{transformations}/v{version}/{public_id}.{format}

    const cloudinaryPattern = /cloudinary\.com\/[^/]+\/image\/upload(?:\/[^/]+)*\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i;
    const match = url.match(cloudinaryPattern);

    if (match && match[1]) {
      // Remove file extension if present
      let publicId = match[1];
      return publicId;
    }

    return null;
  } catch (error) {
    console.warn("Error extracting public_id from URL:", url, error);
    return null;
  }
}


/**
 * Helper function to optimize a single image
 * @param {string} imageUrl - Original image URL
 * @param {string} quality - Quality setting
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Object} - Optimization result
 */
async function optimizeImage(imageUrl, quality, maxWidth, maxHeight) {
  try {
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (!publicId) {
      return { success: false, error: "Could not extract public_id from URL" };
    }

    // Get original image info
    let originalInfo;
    try {
      originalInfo = await cloudinary.api.resource(publicId);
    } catch (err) {
      return { success: false, error: `Image not found: ${err.message}` };
    }

    const originalSize = originalInfo.bytes || 0;
    const originalWidth = originalInfo.width || 0;
    const originalHeight = originalInfo.height || 0;

    // Check if optimization is needed
    const needsResize = originalWidth > maxWidth || originalHeight > maxHeight;
    const needsQualityOptimization = originalSize > 500000; // > 500KB

    if (!needsResize && !needsQualityOptimization) {
      // Image is already optimized
      return {
        success: true,
        optimizedUrl: imageUrl,
        originalSize,
        newSize: originalSize,
        savedBytes: 0,
        skipped: true,
      };
    }

    // Build transformation string
    const transformations = [];

    // Add quality optimization
    transformations.push(`q_${quality}`);

    // Add format optimization (auto-select best format)
    transformations.push("f_auto");

    // Add resize if needed (maintain aspect ratio)
    if (needsResize) {
      transformations.push(`c_limit,w_${maxWidth},h_${maxHeight}`);
    }

    // Use explicit to apply eager transformation and create derived version
    const result = await cloudinary.uploader.explicit(publicId, {
      type: "upload",
      eager: [{ transformation: transformations.join(",") }],
      eager_async: false,
    });

    if (result.eager && result.eager[0]) {
      const optimizedVersion = result.eager[0];
      const newSize = optimizedVersion.bytes || originalSize;
      const savedBytes = Math.max(0, originalSize - newSize);

      return {
        success: true,
        optimizedUrl: optimizedVersion.secure_url,
        originalSize,
        newSize,
        savedBytes,
        width: optimizedVersion.width,
        height: optimizedVersion.height,
      };
    }

    return { success: false, error: "Optimization did not produce a result" };
  } catch (error) {
    console.error("Error optimizing image:", error);
    return { success: false, error: error.message };
  }
}


/**
 * Get models with their image statistics for optimization
 * Returns models with their profile, portfolio, and digital images
 * Fast mode (default): Only reads from Firestore, no Cloudinary API calls
 * Detailed mode: Fetches actual file sizes from Cloudinary (slower, use for specific models)
 * @param {Object} options - Filter options
 * @param {string[]} options.modelUids - Optional array of specific model UIDs to check
 * @param {boolean} options.fetchCloudinaryDetails - Whether to fetch actual sizes from Cloudinary (slower)
 * @returns {Object} - Models with image statistics
 */
exports.getModelsImageStats = onCall({ timeoutSeconds: 300 }, async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { modelUids, fetchCloudinaryDetails = false } = request.data || {};

  // 2. Verify caller is an admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerData.role)) {
    throw new HttpsError("permission-denied", "Only admins can access image stats");
  }

  console.log(`Admin ${callerData.email} fetching image stats (detailed: ${fetchCloudinaryDetails})`);

  try {
    // 3. Get models from Firestore
    let modelsQuery;
    if (modelUids && modelUids.length > 0) {
      // Get specific models
      const modelDocs = await Promise.all(
        modelUids.map(uid => db.collection("users").doc(uid).get())
      );
      modelsQuery = { docs: modelDocs.filter(doc => doc.exists) };
    } else {
      // Get all models
      modelsQuery = await db.collection("users")
        .where("role", "==", "model")
        .get();
    }

    const modelsWithStats = [];
    let totalProfileCount = 0;
    let totalPortfolioCount = 0;
    let totalDigitalCount = 0;

    // 4. Process each model (fast mode - just read from Firestore)
    for (const doc of modelsQuery.docs) {
      const modelData = doc.data();

      const portfolioImages = modelData.portfolioImages || modelData.portfolio || [];
      const digitalImages = modelData.digitalImages || [];
      const hasProfileAvatar = !!modelData.profileAvatar;
      const portfolioCount = Array.isArray(portfolioImages) ? portfolioImages.length : 0;
      const digitalCount = Array.isArray(digitalImages) ? digitalImages.length : 0;

      // Skip models with no images
      if (!hasProfileAvatar && portfolioCount === 0 && digitalCount === 0) {
        continue;
      }

      const modelStats = {
        uid: doc.id,
        firstName: modelData.firstName || "",
        lastName: modelData.lastName || "",
        email: modelData.email || "",
        publicSlug: modelData.publicSlug || "",
        profileAvatar: {
          url: modelData.profileAvatar || null,
          hasImage: hasProfileAvatar,
        },
        portfolioImages: {
          count: portfolioCount,
          urls: portfolioImages,
        },
        digitalImages: {
          count: digitalCount,
          urls: digitalImages,
        },
      };

      if (hasProfileAvatar) totalProfileCount++;
      totalPortfolioCount += portfolioCount;
      totalDigitalCount += digitalCount;

      // If detailed mode requested and we have specific models, fetch Cloudinary info
      if (fetchCloudinaryDetails && modelUids && modelUids.length > 0 && process.env.CLOUDINARY_API_KEY) {
        // Fetch profile image details
        if (modelData.profileAvatar) {
          try {
            const publicId = extractPublicIdFromUrl(modelData.profileAvatar);
            if (publicId) {
              const resourceInfo = await cloudinary.api.resource(publicId);
              modelStats.profileAvatar.size = resourceInfo.bytes || 0;
              modelStats.profileAvatar.width = resourceInfo.width;
              modelStats.profileAvatar.height = resourceInfo.height;
              modelStats.profileAvatar.format = resourceInfo.format;
              modelStats.profileAvatar.needsOptimization =
                resourceInfo.bytes > 500000 ||
                resourceInfo.width > 1200 ||
                resourceInfo.height > 1200;
            }
          } catch (err) {
            console.warn(`Could not get profile image info for ${doc.id}:`, err.message);
          }
        }

        // Fetch portfolio image details (limit to first 5 for speed)
        modelStats.portfolioImages.totalSize = 0;
        modelStats.portfolioImages.needsOptimization = false;
        const portfolioToCheck = portfolioImages.slice(0, 5);
        for (const imageUrl of portfolioToCheck) {
          try {
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              const resourceInfo = await cloudinary.api.resource(publicId);
              modelStats.portfolioImages.totalSize += resourceInfo.bytes || 0;
              if (resourceInfo.bytes > 1000000 || resourceInfo.width > 2400 || resourceInfo.height > 2400) {
                modelStats.portfolioImages.needsOptimization = true;
              }
            }
          } catch (err) {
            // Skip
          }
        }
        // Estimate total size based on sample
        if (portfolioToCheck.length > 0 && portfolioCount > portfolioToCheck.length) {
          const avgSize = modelStats.portfolioImages.totalSize / portfolioToCheck.length;
          modelStats.portfolioImages.estimatedTotalSize = Math.round(avgSize * portfolioCount);
        }

        // Fetch digital image details (limit to first 5 for speed)
        modelStats.digitalImages.totalSize = 0;
        modelStats.digitalImages.needsOptimization = false;
        const digitalsToCheck = digitalImages.slice(0, 5);
        for (const imageUrl of digitalsToCheck) {
          try {
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              const resourceInfo = await cloudinary.api.resource(publicId);
              modelStats.digitalImages.totalSize += resourceInfo.bytes || 0;
              if (resourceInfo.bytes > 1000000 || resourceInfo.width > 2400 || resourceInfo.height > 2400) {
                modelStats.digitalImages.needsOptimization = true;
              }
            }
          } catch (err) {
            // Skip
          }
        }
        // Estimate total size based on sample
        if (digitalsToCheck.length > 0 && digitalCount > digitalsToCheck.length) {
          const avgSize = modelStats.digitalImages.totalSize / digitalsToCheck.length;
          modelStats.digitalImages.estimatedTotalSize = Math.round(avgSize * digitalCount);
        }
      }

      modelsWithStats.push(modelStats);
    }

    // Sort by total image count descending (most images first)
    modelsWithStats.sort((a, b) => {
      const countA = (a.profileAvatar.hasImage ? 1 : 0) + a.portfolioImages.count + a.digitalImages.count;
      const countB = (b.profileAvatar.hasImage ? 1 : 0) + b.portfolioImages.count + b.digitalImages.count;
      return countB - countA;
    });

    return {
      success: true,
      models: modelsWithStats,
      summary: {
        totalModels: modelsWithStats.length,
        totalProfileImages: totalProfileCount,
        totalPortfolioImages: totalPortfolioCount,
        totalDigitalImages: totalDigitalCount,
        totalImages: totalProfileCount + totalPortfolioCount + totalDigitalCount,
      },
    };
  } catch (error) {
    console.error("Error getting image stats:", error);
    throw new HttpsError("internal", `Failed to get image stats: ${error.message}`);
  }
});


/**
 * Optimize images for specified models
 * Applies Cloudinary transformations to reduce file size while maintaining quality
 * @param {Object} options - Optimization options
 * @param {string[]} options.modelUids - Model UIDs to optimize
 * @param {boolean} options.optimizeProfile - Optimize profile avatars
 * @param {boolean} options.optimizePortfolio - Optimize portfolio images
 * @param {boolean} options.optimizeDigitals - Optimize digital images
 * @param {string} options.quality - Quality setting: "auto", "auto:good", "auto:best", "auto:low"
 * @param {number} options.maxWidth - Maximum width for images
 * @param {number} options.maxHeight - Maximum height for images
 * @returns {Object} - Optimization results
 */
exports.optimizeModelImages = onCall({ timeoutSeconds: 540 }, async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const {
    modelUids,
    optimizeProfile = true,
    optimizePortfolio = true,
    optimizeDigitals = true,
    quality = "auto:good",
    maxProfileWidth = 800,
    maxProfileHeight = 800,
    maxPortfolioWidth = 2000,
    maxPortfolioHeight = 2000,
    maxDigitalWidth = 1600,
    maxDigitalHeight = 1600,
  } = request.data || {};

  if (!modelUids || !Array.isArray(modelUids) || modelUids.length === 0) {
    throw new HttpsError("invalid-argument", "Model UIDs array is required");
  }

  // 2. Verify caller is an admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerData.role)) {
    throw new HttpsError("permission-denied", "Only admins can optimize images");
  }

  // 3. Verify Cloudinary is configured
  if (!process.env.CLOUDINARY_API_KEY) {
    throw new HttpsError("failed-precondition", "Cloudinary is not configured");
  }

  console.log(`Admin ${callerData.email} optimizing images for ${modelUids.length} models`);

  const results = {
    modelsProcessed: 0,
    profileImages: { optimized: 0, failed: 0, savedBytes: 0 },
    portfolioImages: { optimized: 0, failed: 0, savedBytes: 0 },
    digitalImages: { optimized: 0, failed: 0, savedBytes: 0 },
    errors: [],
    details: [],
  };

  // 4. Process each model
  for (const modelUid of modelUids) {
    try {
      const modelDoc = await db.collection("users").doc(modelUid).get();
      if (!modelDoc.exists) {
        results.errors.push({ modelUid, error: "Model not found" });
        continue;
      }

      const modelData = modelDoc.data();
      const modelDetail = {
        uid: modelUid,
        name: `${modelData.firstName || ""} ${modelData.lastName || ""}`.trim(),
        profile: null,
        portfolio: [],
        digitals: [],
      };

      // Optimize profile avatar
      if (optimizeProfile && modelData.profileAvatar) {
        const result = await optimizeImage(
          modelData.profileAvatar,
          quality,
          maxProfileWidth,
          maxProfileHeight
        );
        if (result.success) {
          // Update Firestore with optimized URL
          await modelDoc.ref.update({ profileAvatar: result.optimizedUrl });
          results.profileImages.optimized++;
          results.profileImages.savedBytes += result.savedBytes;
          modelDetail.profile = {
            originalSize: result.originalSize,
            newSize: result.newSize,
            savedBytes: result.savedBytes,
          };
        } else {
          results.profileImages.failed++;
          results.errors.push({ modelUid, type: "profile", error: result.error });
        }
      }

      // Optimize portfolio images
      if (optimizePortfolio) {
        const portfolioImages = modelData.portfolioImages || modelData.portfolio || [];
        if (Array.isArray(portfolioImages) && portfolioImages.length > 0) {
          const optimizedUrls = [];
          for (const imageUrl of portfolioImages) {
            const result = await optimizeImage(
              imageUrl,
              quality,
              maxPortfolioWidth,
              maxPortfolioHeight
            );
            if (result.success) {
              optimizedUrls.push(result.optimizedUrl);
              results.portfolioImages.optimized++;
              results.portfolioImages.savedBytes += result.savedBytes;
              modelDetail.portfolio.push({
                originalSize: result.originalSize,
                newSize: result.newSize,
                savedBytes: result.savedBytes,
              });
            } else {
              optimizedUrls.push(imageUrl); // Keep original if optimization fails
              results.portfolioImages.failed++;
            }
          }
          // Update Firestore with optimized URLs
          const updateField = modelData.portfolioImages ? "portfolioImages" : "portfolio";
          await modelDoc.ref.update({ [updateField]: optimizedUrls });
        }
      }

      // Optimize digital images
      if (optimizeDigitals && modelData.digitalImages) {
        const digitalImages = modelData.digitalImages || [];
        if (Array.isArray(digitalImages) && digitalImages.length > 0) {
          const optimizedUrls = [];
          for (const imageUrl of digitalImages) {
            const result = await optimizeImage(
              imageUrl,
              quality,
              maxDigitalWidth,
              maxDigitalHeight
            );
            if (result.success) {
              optimizedUrls.push(result.optimizedUrl);
              results.digitalImages.optimized++;
              results.digitalImages.savedBytes += result.savedBytes;
              modelDetail.digitals.push({
                originalSize: result.originalSize,
                newSize: result.newSize,
                savedBytes: result.savedBytes,
              });
            } else {
              optimizedUrls.push(imageUrl); // Keep original if optimization fails
              results.digitalImages.failed++;
            }
          }
          // Update Firestore with optimized URLs
          await modelDoc.ref.update({ digitalImages: optimizedUrls });
        }
      }

      results.modelsProcessed++;
      results.details.push(modelDetail);
    } catch (error) {
      console.error(`Error optimizing images for model ${modelUid}:`, error);
      results.errors.push({ modelUid, error: error.message });
    }
  }

  // 5. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "OPTIMIZE_IMAGES",
      description: `Optimized images for ${results.modelsProcessed} models`,
      details: {
        modelsRequested: modelUids.length,
        modelsProcessed: results.modelsProcessed,
        profileImages: results.profileImages,
        portfolioImages: results.portfolioImages,
        digitalImages: results.digitalImages,
        totalSavedBytes: results.profileImages.savedBytes + results.portfolioImages.savedBytes + results.digitalImages.savedBytes,
        quality,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
  }

  results.totalSavedBytes = results.profileImages.savedBytes + results.portfolioImages.savedBytes + results.digitalImages.savedBytes;

  console.log(`Image optimization complete: ${results.modelsProcessed} models, ${results.totalSavedBytes} bytes saved`);

  return {
    success: true,
    ...results,
  };
});


// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

const { BetaAnalyticsDataClient } = require("@google-analytics/data");

// Initialize GA4 client
// Uses Application Default Credentials (ADC) from the Firebase environment
let analyticsClient = null;
const getAnalyticsClient = () => {
  if (!analyticsClient) {
    analyticsClient = new BetaAnalyticsDataClient();
  }
  return analyticsClient;
};

// GA4 Property ID (Measurement ID: G-YCYM83P40H corresponds to a property ID)
// You'll need to get the property ID from GA4 Admin > Property Settings
// It's in the format: properties/XXXXXXXXX
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || "properties/488925969";

/**
 * Get analytics data from GA4 (Admin/Super Admin only)
 * Returns page views, sessions, users, and other metrics
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string[]} metrics - Array of metric names to fetch
 * @param {string[]} dimensions - Array of dimension names to fetch
 * @returns {Object} - Analytics data
 */
exports.getGA4Analytics = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { startDate, endDate, metrics, dimensions } = request.data;

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access analytics");
  }

  try {
    const client = getAnalyticsClient();

    // Run the report
    const [response] = await client.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [
        {
          startDate: startDate || "30daysAgo",
          endDate: endDate || "today",
        },
      ],
      metrics: (metrics || ["screenPageViews", "sessions", "activeUsers"]).map(m => ({ name: m })),
      dimensions: (dimensions || []).map(d => ({ name: d })),
    });

    return {
      success: true,
      data: {
        rows: response.rows?.map(row => ({
          dimensions: row.dimensionValues?.map(d => d.value) || [],
          metrics: row.metricValues?.map(m => m.value) || [],
        })) || [],
        totals: response.totals?.[0]?.metricValues?.map(m => m.value) || [],
        rowCount: response.rowCount || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching GA4 analytics:", error);
    throw new HttpsError("internal", `Failed to fetch analytics: ${error.message}`);
  }
});

/**
 * Get daily analytics data from GA4 for charts (Admin/Super Admin only)
 * Returns daily breakdown of page views, sessions, and users
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Object} - Daily analytics data
 */
exports.getGA4DailyData = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { startDate, endDate } = request.data;

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access analytics");
  }

  try {
    const client = getAnalyticsClient();

    // Run the report with date dimension for time-series data
    const [response] = await client.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [
        {
          startDate: startDate || "30daysAgo",
          endDate: endDate || "today",
        },
      ],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "activeUsers" },
      ],
      dimensions: [{ name: "date" }],
      orderBys: [
        {
          dimension: {
            dimensionName: "date",
          },
          desc: false,
        },
      ],
    });

    // Transform the data into a more usable format
    const dailyData = response.rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value || "",
      pageViews: parseInt(row.metricValues?.[0]?.value || "0", 10),
      sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
      users: parseInt(row.metricValues?.[2]?.value || "0", 10),
    })) || [];

    return {
      success: true,
      data: {
        daily: dailyData,
        totals: response.totals?.[0]?.metricValues ? {
          pageViews: parseInt(response.totals[0].metricValues[0].value || "0", 10),
          sessions: parseInt(response.totals[0].metricValues[1].value || "0", 10),
          users: parseInt(response.totals[0].metricValues[2].value || "0", 10),
        } : { pageViews: 0, sessions: 0, users: 0 },
      },
    };
  } catch (error) {
    console.error("Error fetching GA4 daily data:", error);
    throw new HttpsError("internal", `Failed to fetch daily analytics: ${error.message}`);
  }
});

/**
 * Get model profile page views from GA4 (Admin/Super Admin only)
 * Returns the most viewed model profiles
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {number} limit - Max number of results (default: 10)
 * @returns {Object} - Model profile views data
 */
exports.getModelProfileViews = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { startDate, endDate, limit } = request.data;

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access analytics");
  }

  try {
    const client = getAnalyticsClient();

    // Run the report filtering for model profile pages
    const [response] = await client.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [
        {
          startDate: startDate || "30daysAgo",
          endDate: endDate || "today",
        },
      ],
      metrics: [{ name: "screenPageViews" }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "CONTAINS",
            value: "/profile/",
          },
        },
      },
      orderBys: [
        {
          metric: {
            metricName: "screenPageViews",
          },
          desc: true,
        },
      ],
      limit: limit || 10,
    });

    return {
      success: true,
      data: {
        profiles: response.rows?.map(row => ({
          path: row.dimensionValues?.[0]?.value || "",
          title: row.dimensionValues?.[1]?.value || "",
          views: parseInt(row.metricValues?.[0]?.value || "0", 10),
        })) || [],
        rowCount: response.rowCount || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching model profile views:", error);
    throw new HttpsError("internal", `Failed to fetch profile views: ${error.message}`);
  }
});

/**
 * Get traffic sources from GA4 (Admin/Super Admin only)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Object} - Traffic sources data
 */
exports.getTrafficSources = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { startDate, endDate } = request.data;

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access analytics");
  }

  try {
    const client = getAnalyticsClient();

    // Run the report for traffic sources
    const [response] = await client.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [
        {
          startDate: startDate || "30daysAgo",
          endDate: endDate || "today",
        },
      ],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      orderBys: [
        {
          metric: {
            metricName: "sessions",
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    return {
      success: true,
      data: {
        sources: response.rows?.map(row => ({
          source: row.dimensionValues?.[0]?.value || "",
          medium: row.dimensionValues?.[1]?.value || "",
          sessions: parseInt(row.metricValues?.[0]?.value || "0", 10),
          users: parseInt(row.metricValues?.[1]?.value || "0", 10),
        })) || [],
      },
    };
  } catch (error) {
    console.error("Error fetching traffic sources:", error);
    throw new HttpsError("internal", `Failed to fetch traffic sources: ${error.message}`);
  }
});

/**
 * Get geographic data from GA4 (Admin/Super Admin only)
 * Returns visits by country and city
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Object} - Geographic data
 */
exports.getGeographicData = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { startDate, endDate } = request.data;

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access analytics");
  }

  try {
    const client = getAnalyticsClient();

    // Get country data
    const [countryResponse] = await client.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [
        {
          startDate: startDate || "30daysAgo",
          endDate: endDate || "today",
        },
      ],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensions: [{ name: "country" }],
      orderBys: [
        {
          metric: {
            metricName: "sessions",
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    // Get city data
    const [cityResponse] = await client.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [
        {
          startDate: startDate || "30daysAgo",
          endDate: endDate || "today",
        },
      ],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensions: [{ name: "city" }, { name: "country" }],
      orderBys: [
        {
          metric: {
            metricName: "sessions",
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    return {
      success: true,
      data: {
        countries: countryResponse.rows?.map(row => ({
          country: row.dimensionValues?.[0]?.value || "",
          sessions: parseInt(row.metricValues?.[0]?.value || "0", 10),
          users: parseInt(row.metricValues?.[1]?.value || "0", 10),
        })) || [],
        cities: cityResponse.rows?.map(row => ({
          city: row.dimensionValues?.[0]?.value || "",
          country: row.dimensionValues?.[1]?.value || "",
          sessions: parseInt(row.metricValues?.[0]?.value || "0", 10),
          users: parseInt(row.metricValues?.[1]?.value || "0", 10),
        })) || [],
      },
    };
  } catch (error) {
    console.error("Error fetching geographic data:", error);
    throw new HttpsError("internal", `Failed to fetch geographic data: ${error.message}`);
  }
});

/**
 * Get job count (Admin/Super Admin only)
 * @returns {Object} - Job count data
 */
exports.getJobCount = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access job count");
  }

  try {
    // Get total count of jobs
    const jobsSnapshot = await db.collection("jobs").count().get();
    const totalJobs = jobsSnapshot.data().count;

    // Get count of active jobs (optional - depends on your data structure)
    // Assuming you have a 'status' field
    const activeJobsSnapshot = await db.collection("jobs")
      .where("status", "==", "active")
      .count()
      .get();
    const activeJobs = activeJobsSnapshot.data().count;

    return {
      success: true,
      data: {
        totalJobs,
        activeJobs,
      },
    };
  } catch (error) {
    console.error("Error fetching job count:", error);
    throw new HttpsError("internal", `Failed to fetch job count: ${error.message}`);
  }
});

/**
 * Get user count (Admin/Super Admin only)
 * @returns {Object} - User count data
 */
exports.getUserCount = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access user count");
  }

  try {
    // Get total count of users
    const usersSnapshot = await db.collection("users").count().get();
    const totalUsers = usersSnapshot.data().count;

    // Get count by role (optional)
    const modelsSnapshot = await db.collection("users")
      .where("role", "==", "model")
      .count()
      .get();
    const clientsSnapshot = await db.collection("users")
      .where("role", "==", "client")
      .count()
      .get();

    return {
      success: true,
      data: {
        totalUsers,
        models: modelsSnapshot.data().count,
        clients: clientsSnapshot.data().count,
      },
    };
  } catch (error) {
    console.error("Error fetching user count:", error);
    throw new HttpsError("internal", `Failed to fetch user count: ${error.message}`);
  }
});

/**
 * Get Instagram follower count for a specific account (Admin/Super Admin only)
 * @param {string} username - Instagram username
 * @returns {Object} - Instagram follower count
 */
exports.getInstagramFollowers = onCall(async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { username } = request.data;

  if (!username) {
    throw new HttpsError("invalid-argument", "Username is required");
  }

  // 2. Verify caller is admin or super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;
  const ADMIN_ROLES = ["admin", "super admin"];

  if (!ADMIN_ROLES.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can access Instagram data");
  }

  try {
    const count = await getInstagramFollowerCount(username);

    if (typeof count !== "number") {
      throw new Error("Follower count not found.");
    }

    return {
      success: true,
      data: {
        username,
        followers: count,
        lastChecked: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error fetching Instagram followers:", error);
    throw new HttpsError("internal", `Failed to fetch Instagram followers: ${error.message}`);
  }
});
