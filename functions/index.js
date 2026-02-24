require("dotenv").config();

const functions = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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
const Stripe = require("stripe");

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null;

if (stripe) {
  console.log("✅ Stripe configured successfully");
} else {
  console.warn("⚠️ Stripe not configured. Payment functionality disabled.");
}

// Stripe fee configuration
const PLATFORM_FEE_PERCENT = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "0.05"); // 5%
const WITHDRAWAL_FEE_PERCENT = parseFloat(process.env.STRIPE_WITHDRAWAL_FEE_PERCENT || "0.015"); // 1.5%

// ============================================================================
// SUBSCRIPTION TIER CONFIGURATION
// ============================================================================

const SUBSCRIPTION_TIERS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "gbp",
    stripePriceId: null,
    includesSeats: 0,
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 4999, // £49.99 in pence
    currency: "gbp",
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    includesSeats: 0,
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 9999, // £99.99 in pence
    currency: "gbp",
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || null,
    includesSeats: 0,
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: 14999, // £149.99 in pence
    currency: "gbp",
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID || null,
    includesSeats: 6,
  },
};

const ADDITIONAL_SEAT_PRICE_ID = process.env.STRIPE_ADDITIONAL_SEAT_PRICE_ID || null;

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

// ============================================================================
// SUBSCRIPTION HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a user's subscription is active and not expired
 * @param {Object} userData - User document data
 * @returns {boolean} - Whether subscription is active
 */
const isSubscriptionActive = (userData) => {
  if (!userData.subscription) {
    // Default to free tier for users without subscription data
    return true;
  }

  const { tier, status, currentPeriodEnd } = userData.subscription;

  // Free tier is always active
  if (tier === "free") {
    return true;
  }

  // Check status
  if (status !== "active" && status !== "trialing") {
    return false;
  }

  // Check expiry (immediate lockout)
  if (currentPeriodEnd) {
    const endDate = currentPeriodEnd.toDate ? currentPeriodEnd.toDate() : new Date(currentPeriodEnd);
    if (endDate < new Date()) {
      return false;
    }
  }

  return true;
};

/**
 * Get user's effective subscription tier
 * @param {Object} userData - User document data
 * @returns {string} - Tier ID
 */
const getEffectiveTier = (userData) => {
  if (!userData.subscription || !isSubscriptionActive(userData)) {
    return "free";
  }
  return userData.subscription.tier || "free";
};

/**
 * Ensure user has Stripe customer, create if not exists
 * @param {string} uid - User ID
 * @param {Object} userData - User document data
 * @returns {Promise<string>} - Stripe customer ID
 */
const ensureStripeCustomer = async (uid, userData) => {
  if (userData.stripeCustomerId) {
    return userData.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: userData.email,
    name: userData.companyName || `${userData.firstName} ${userData.lastName}`,
    metadata: {
      firebaseUid: uid,
      role: userData.role,
      platform: "model-cloud",
    },
  });

  await db.collection("users").doc(uid).update({
    stripeCustomerId: customer.id,
  });

  return customer.id;
};

/**
 * Check subscription access for a feature
 * @param {string} uid - User ID
 * @param {Array<string>} requiredTiers - Tiers that can access this feature
 * @returns {Promise<Object>} - { allowed: boolean, tier: string, reason?: string }
 */
const checkSubscriptionAccess = async (uid, requiredTiers = ["starter", "premium", "agency"]) => {
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    return { allowed: false, tier: null, reason: "User not found" };
  }

  const userData = userDoc.data();
  const isActive = isSubscriptionActive(userData);
  const tier = getEffectiveTier(userData);

  if (!isActive) {
    return {
      allowed: false,
      tier,
      reason: "Subscription expired or inactive",
    };
  }

  if (!requiredTiers.includes(tier)) {
    return {
      allowed: false,
      tier,
      reason: `This feature requires one of: ${requiredTiers.join(", ")}`,
    };
  }

  return { allowed: true, tier };
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

// ============================================================================
// SUBSCRIPTION FUNCTIONS
// ============================================================================

/**
 * Initialize a user with free tier subscription
 */
exports.initializeFreeTier = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  // Don't overwrite existing paid subscription
  if (userData.subscription?.tier && userData.subscription.tier !== "free" && userData.subscription.status === "active") {
    return {
      success: true,
      message: "User already has an active subscription",
      tier: userData.subscription.tier,
    };
  }

  await db.collection("users").doc(uid).update({
    subscription: {
      tier: "free",
      status: "active",
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      managedSeat: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  return {
    success: true,
    message: "Free tier initialized",
    tier: "free",
  };
});

/**
 * Get current user's subscription status
 */
exports.getSubscriptionStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  const isActive = isSubscriptionActive(userData);
  const effectiveTier = getEffectiveTier(userData);

  const response = {
    success: true,
    isActive,
    tier: effectiveTier,
    tierDetails: SUBSCRIPTION_TIERS[effectiveTier],
  };

  if (userData.subscription) {
    response.subscription = {
      status: userData.subscription.status,
      currentPeriodEnd: userData.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: userData.subscription.cancelAtPeriodEnd || false,
      managedSeat: userData.subscription.managedSeat || false,
    };
  }

  // Include agency seat info if applicable
  if (effectiveTier === "agency" && userData.agency) {
    response.agency = {
      totalSeats: userData.agency.totalSeats || 6,
      usedSeats: userData.agency.usedSeats || 0,
      availableSeats: (userData.agency.totalSeats || 6) - (userData.agency.usedSeats || 0),
      managedUserIds: userData.agency.managedUserIds || [],
    };
  }

  // Include managed by info if applicable
  if (userData.managedBy) {
    response.managedBy = userData.managedBy;
  }

  return response;
});

/**
 * Create a Stripe Checkout session for subscription
 */
exports.createSubscriptionCheckoutSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { tierId, successUrl, cancelUrl } = request.data;

  if (!tierId || !successUrl || !cancelUrl) {
    throw new HttpsError("invalid-argument", "tierId, successUrl, and cancelUrl are required");
  }

  const tier = SUBSCRIPTION_TIERS[tierId];
  if (!tier || tierId === "free") {
    throw new HttpsError("invalid-argument", "Invalid subscription tier");
  }

  if (!tier.stripePriceId) {
    throw new HttpsError("unavailable", `Stripe price not configured for ${tierId} tier`);
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  // Check if user already has an active subscription
  if (
    userData.subscription?.stripeSubscriptionId &&
    userData.subscription?.status === "active"
  ) {
    throw new HttpsError(
      "already-exists",
      "User already has an active subscription. Use the customer portal to change plans."
    );
  }

  try {
    // Ensure customer exists
    const customerId = await ensureStripeCustomer(uid, userData);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: tier.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          firebaseUid: uid,
          tier: tierId,
        },
      },
      metadata: {
        firebaseUid: uid,
        tier: tierId,
      },
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Create a Stripe Customer Portal session for subscription management
 */
exports.createCustomerPortalSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { returnUrl } = request.data;

  if (!returnUrl) {
    throw new HttpsError("invalid-argument", "returnUrl is required");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  if (!userData.stripeCustomerId) {
    throw new HttpsError("failed-precondition", "No Stripe customer found for this user");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl,
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Upgrade subscription to a higher tier (for existing subscribers)
 */
exports.upgradeSubscription = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { newTierId } = request.data;

  if (!newTierId || !SUBSCRIPTION_TIERS[newTierId] || newTierId === "free") {
    throw new HttpsError("invalid-argument", "Invalid tier");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  if (!userData.subscription?.stripeSubscriptionId) {
    throw new HttpsError(
      "failed-precondition",
      "No active subscription to upgrade. Use checkout instead."
    );
  }

  const newTier = SUBSCRIPTION_TIERS[newTierId];

  if (!newTier.stripePriceId) {
    throw new HttpsError("unavailable", `Stripe price not configured for ${newTierId} tier`);
  }

  try {
    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(
      userData.subscription.stripeSubscriptionId
    );

    // Update subscription with new price
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newTier.stripePriceId,
        },
      ],
      proration_behavior: "always_invoice", // Charge difference immediately
      metadata: {
        firebaseUid: uid,
        tier: newTierId,
      },
    });

    // Update local record (webhook will also update, but this gives immediate feedback)
    const updateData = {
      "subscription.tier": newTierId,
      "subscription.stripePriceId": newTier.stripePriceId,
      "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    };

    // Initialize agency fields if upgrading to agency
    if (newTierId === "agency" && !userData.agency) {
      updateData.agency = {
        totalSeats: 6,
        usedSeats: 0,
        additionalSeatsPurchased: 0,
        managedUserIds: [],
      };
    }

    await db.collection("users").doc(uid).update(updateData);

    return {
      success: true,
      message: "Subscription upgraded successfully",
      newTier: newTierId,
    };
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ============================================================================
// AGENCY SEAT FUNCTIONS
// ============================================================================

/**
 * Purchase additional seats for agency accounts
 */
exports.purchaseAdditionalSeats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { quantity, successUrl, cancelUrl } = request.data;

  if (!quantity || quantity < 1) {
    throw new HttpsError("invalid-argument", "quantity must be at least 1");
  }

  if (!successUrl || !cancelUrl) {
    throw new HttpsError("invalid-argument", "successUrl and cancelUrl are required");
  }

  if (!ADDITIONAL_SEAT_PRICE_ID) {
    throw new HttpsError("unavailable", "Additional seat pricing not configured");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  // Verify user has agency subscription
  if (userData.subscription?.tier !== "agency" || !isSubscriptionActive(userData)) {
    throw new HttpsError("permission-denied", "Only active agency subscribers can purchase additional seats");
  }

  try {
    const customerId = userData.stripeCustomerId;

    if (!customerId) {
      throw new HttpsError("failed-precondition", "No Stripe customer found");
    }

    // Create checkout session for additional seats (one-time purchase that adds to subscription)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: ADDITIONAL_SEAT_PRICE_ID,
          quantity: quantity,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        firebaseUid: uid,
        type: "additional_seats",
        quantity: quantity.toString(),
      },
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("Error creating seats checkout:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Assign an agency seat to a client user
 */
exports.assignSeatToClient = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { clientUserId } = request.data;

  if (!clientUserId) {
    throw new HttpsError("invalid-argument", "clientUserId is required");
  }

  const agencyUid = request.auth.uid;

  // Get agency user
  const agencyDoc = await db.collection("users").doc(agencyUid).get();
  if (!agencyDoc.exists) {
    throw new HttpsError("not-found", "Agency user not found");
  }

  const agencyData = agencyDoc.data();

  // Verify agency subscription
  if (agencyData.subscription?.tier !== "agency" || !isSubscriptionActive(agencyData)) {
    throw new HttpsError("permission-denied", "Only active agency subscribers can assign seats");
  }

  // Check available seats
  const totalSeats = agencyData.agency?.totalSeats || 6;
  const usedSeats = agencyData.agency?.usedSeats || 0;

  if (usedSeats >= totalSeats) {
    throw new HttpsError("resource-exhausted", "No available seats. Purchase additional seats.");
  }

  // Get client user
  const clientDoc = await db.collection("users").doc(clientUserId).get();
  if (!clientDoc.exists) {
    throw new HttpsError("not-found", "Client user not found");
  }

  const clientData = clientDoc.data();

  // Verify client is in same organisation
  if (clientData.organisationId !== agencyData.organisationId) {
    throw new HttpsError("permission-denied", "Client must be in the same organisation");
  }

  // Verify client role
  if (clientData.role !== "client") {
    throw new HttpsError("invalid-argument", "Can only assign seats to client accounts");
  }

  // Check if client already has a managed subscription or paid subscription
  if (clientData.managedBy) {
    throw new HttpsError("already-exists", "Client already has an assigned seat");
  }

  if (clientData.subscription?.stripeSubscriptionId && clientData.subscription?.status === "active") {
    throw new HttpsError("already-exists", "Client already has their own active subscription");
  }

  // Transaction to update both documents
  const batch = db.batch();

  // Update agency user
  const managedUserIds = agencyData.agency?.managedUserIds || [];
  batch.update(db.collection("users").doc(agencyUid), {
    "agency.usedSeats": admin.firestore.FieldValue.increment(1),
    "agency.managedUserIds": [...managedUserIds, clientUserId],
  });

  // Update client user - give them premium-equivalent access
  batch.update(db.collection("users").doc(clientUserId), {
    managedBy: {
      agencyUserId: agencyUid,
      agencyOrganisationId: agencyData.organisationId,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    subscription: {
      tier: "premium", // Agency seats give premium access
      status: "active",
      stripeSubscriptionId: null, // Managed, not direct subscription
      stripePriceId: null,
      currentPeriodStart: agencyData.subscription.currentPeriodStart,
      currentPeriodEnd: agencyData.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      managedSeat: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  await batch.commit();

  // Log event
  await db.collection("subscriptionEvents").add({
    userId: clientUserId,
    eventType: "seat_assigned",
    agencyUserId: agencyUid,
    metadata: {
      organisationId: agencyData.organisationId,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "Seat assigned successfully",
    remainingSeats: totalSeats - usedSeats - 1,
  };
});

/**
 * Remove an agency seat from a client user
 */
exports.removeSeatFromClient = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { clientUserId } = request.data;

  if (!clientUserId) {
    throw new HttpsError("invalid-argument", "clientUserId is required");
  }

  const agencyUid = request.auth.uid;

  // Get agency user
  const agencyDoc = await db.collection("users").doc(agencyUid).get();
  if (!agencyDoc.exists) {
    throw new HttpsError("not-found", "Agency user not found");
  }

  const agencyData = agencyDoc.data();

  // Verify agency subscription (allow removal even if expired, for cleanup)
  if (agencyData.subscription?.tier !== "agency") {
    throw new HttpsError("permission-denied", "Only agency account holders can remove seats");
  }

  // Verify this client is managed by this agency
  const managedUserIds = agencyData.agency?.managedUserIds || [];
  if (!managedUserIds.includes(clientUserId)) {
    throw new HttpsError("not-found", "Client is not managed by this agency");
  }

  // Get client user
  const clientDoc = await db.collection("users").doc(clientUserId).get();
  if (!clientDoc.exists) {
    throw new HttpsError("not-found", "Client user not found");
  }

  // Transaction to update both documents
  const batch = db.batch();

  // Update agency user
  batch.update(db.collection("users").doc(agencyUid), {
    "agency.usedSeats": admin.firestore.FieldValue.increment(-1),
    "agency.managedUserIds": managedUserIds.filter((id) => id !== clientUserId),
  });

  // Update client user - revert to free tier
  batch.update(db.collection("users").doc(clientUserId), {
    managedBy: admin.firestore.FieldValue.delete(),
    subscription: {
      tier: "free",
      status: "active",
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      managedSeat: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  await batch.commit();

  // Log event
  await db.collection("subscriptionEvents").add({
    userId: clientUserId,
    eventType: "seat_removed",
    agencyUserId: agencyUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "Seat removed successfully",
  };
});

/**
 * Get list of users managed by an agency account
 */
exports.getAgencyManagedUsers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  if (userData.subscription?.tier !== "agency") {
    throw new HttpsError("permission-denied", "Only agency accounts can access managed users");
  }

  const managedUserIds = userData.agency?.managedUserIds || [];

  if (managedUserIds.length === 0) {
    return {
      success: true,
      users: [],
      seatInfo: {
        total: userData.agency?.totalSeats || 6,
        used: 0,
        available: userData.agency?.totalSeats || 6,
      },
    };
  }

  // Fetch managed user details (Firestore 'in' query limited to 10 items)
  const users = [];
  const chunks = [];
  for (let i = 0; i < managedUserIds.length; i += 10) {
    chunks.push(managedUserIds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const usersSnapshot = await db
      .collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      users.push({
        uid: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        profileAvatar: data.profileAvatar,
        assignedAt: data.managedBy?.assignedAt,
      });
    }
  }

  return {
    success: true,
    users,
    seatInfo: {
      total: userData.agency?.totalSeats || 6,
      used: userData.agency?.usedSeats || 0,
      available: (userData.agency?.totalSeats || 6) - (userData.agency?.usedSeats || 0),
    },
  };
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

  const { to, modelName, jobTitle, jobReference, clientUid } = request.data;

  if (!to || !modelName || !jobTitle || !jobReference) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  // Check if the client has disabled job application email notifications
  if (clientUid) {
    try {
      const clientDoc = await db.collection("users").doc(clientUid).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        const notificationSettings = clientData.notificationSettings || {};
        if (notificationSettings.emailOnJobApplication === false) {
          console.log(`📧 Skipping email - client ${clientUid} has disabled job application notifications`);
          return { success: true, skipped: true, reason: "user_preference" };
        }
      }
    } catch (error) {
      console.warn("Could not check client notification settings:", error.message);
      // Continue anyway - better to send email than not
    }
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
// JOB MATCHING NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Model matching algorithm - checks if a model matches a job's requirements
 * Same logic as apps/platform/src/utils/matching.js
 */
const doesModelMatchJob = (model, job) => {
  if (!model || !job) return false;

  // Gender match - at least one gender must match
  const genderMatch =
    job.gender?.length > 0 &&
    model.gender?.length > 0 &&
    job.gender.some((g) => model.gender.includes(g));

  // Category match - at least one category must match
  const categoryMatch =
    job.categories?.some((cat) => model.categories?.includes(cat));

  return genderMatch && categoryMatch;
};

/**
 * Firestore trigger: When a job is created, notify matching models and the client
 */
exports.onJobCreated = onDocumentCreated("jobs/{jobId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data associated with the event");
    return null;
  }

  const jobData = snap.data();
  const jobId = event.params.jobId;

  // Skip if job is a draft or not active
  if (jobData.status === "draft" || jobData.status === "closed") {
    console.log(`Skipping notifications for job ${jobId} - status: ${jobData.status}`);
    return null;
  }

  console.log(`📧 Processing job matching notifications for job: ${jobData.title || jobId}`);

  // Check if emails are enabled in system settings
  const emailEnabled = await isEmailEnabled();
  if (!emailEnabled) {
    console.log("📧 Job matching emails disabled by system settings");
    return null;
  }

  if (!sendgridApiKey) {
    console.warn("SendGrid not configured - skipping job match notifications");
    return null;
  }

  try {
    // 1. Get the job creator (client)
    const clientDoc = await db.collection("users").doc(jobData.userId).get();
    if (!clientDoc.exists) {
      console.warn(`Job creator not found: ${jobData.userId}`);
      return null;
    }
    const clientData = clientDoc.data();
    const clientNotificationSettings = clientData.notificationSettings || {};

    // 2. Find all verified models
    const modelsSnapshot = await db.collection("users")
      .where("role", "==", "model")
      .where("isVerified", "==", true)
      .get();

    console.log(`Found ${modelsSnapshot.size} verified models to check for matching`);

    // 3. Filter models that match the job
    const matchingModels = [];
    for (const modelDoc of modelsSnapshot.docs) {
      const modelData = modelDoc.data();
      if (doesModelMatchJob(modelData, jobData)) {
        matchingModels.push({ uid: modelDoc.id, ...modelData });
      }
    }

    console.log(`Found ${matchingModels.length} matching models for job: ${jobData.title}`);

    if (matchingModels.length === 0) {
      return { success: true, matchingModels: 0, emailsSent: 0 };
    }

    let modelEmailsSent = 0;
    let clientEmailSent = false;

    // 4. Email each matching model (if they have emailOnJobMatch enabled)
    for (const model of matchingModels) {
      const modelNotificationSettings = model.notificationSettings || {};

      // Check if model has disabled job match notifications (default is enabled)
      if (modelNotificationSettings.emailOnJobMatch === false) {
        console.log(`Skipping model ${model.uid} - job match notifications disabled`);
        continue;
      }

      if (!model.email) {
        console.warn(`No email for model: ${model.uid}`);
        continue;
      }

      const modelName = model.firstName || "there";
      const jobUrl = `https://themodel.cloud/jobs/${jobData.reference || jobId}`;

      const msg = {
        to: model.email,
        from: sendgridFromEmail,
        subject: `New Job Match: ${jobData.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Job Matching Your Profile!</h2>
            <p>Hi ${modelName},</p>
            <p>Great news! A new job has been posted that matches your profile:</p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">${jobData.title}</h3>
              ${jobData.location ? `<p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${jobData.location}</p>` : ""}
              ${jobData.dateFrom ? `<p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${jobData.dateFrom}${jobData.dateTo ? ` - ${jobData.dateTo}` : ""}</p>` : ""}
              ${jobData.rate ? `<p style="margin: 5px 0; color: #666;"><strong>Rate:</strong> ${jobData.currency || "£"}${jobData.rate}</p>` : ""}
            </div>

            <p>
              <a href="${jobUrl}"
                 style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View Job & Apply
              </a>
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
              You received this email because a job matching your profile was posted on The Model Cloud.
              <br>
              <a href="https://themodel.cloud/profile/settings" style="color: #667eea;">Manage your notification preferences</a>
            </p>
          </div>
        `
      };

      try {
        await sgMail.send(msg);
        modelEmailsSent++;
        console.log(`✅ Job match email sent to model: ${model.email}`);
      } catch (error) {
        console.error(`Failed to send job match email to ${model.email}:`, error.message);
      }
    }

    // 5. Email the client with matching models (if they have emailOnModelMatch enabled)
    if (clientNotificationSettings.emailOnModelMatch !== false && matchingModels.length > 0) {
      const clientName = clientData.firstName || "there";
      const jobUrl = `https://themodel.cloud/jobs/${jobData.reference || jobId}`;

      // Build model list HTML (limit to first 10 for email)
      const displayModels = matchingModels.slice(0, 10);
      const modelListHtml = displayModels.map(model => {
        const modelUrl = `https://themodel.cloud/models/${model.publicSlug || model.uid}`;
        const modelName = `${model.firstName || ""} ${model.lastName || ""}`.trim() || "Model";
        const avatarUrl = model.profileAvatar || "https://themodel.cloud/default-avatar.png";

        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <a href="${modelUrl}" style="display: flex; align-items: center; text-decoration: none; color: #333;">
                <img src="${avatarUrl}" alt="${modelName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-right: 12px;">
                <div>
                  <strong>${modelName}</strong>
                  ${model.city ? `<br><span style="color: #666; font-size: 12px;">${model.city}${model.country ? `, ${model.country}` : ""}</span>` : ""}
                </div>
              </a>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
              <a href="${modelUrl}" style="background-color: #28a745; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px;">View Profile</a>
            </td>
          </tr>
        `;
      }).join("");

      const msg = {
        to: clientData.email,
        from: sendgridFromEmail,
        subject: `${matchingModels.length} Models Match Your Job: ${jobData.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Models Matching Your Job Listing</h2>
            <p>Hi ${clientName},</p>
            <p>Great news! We found <strong>${matchingModels.length} models</strong> that match your job posting:</p>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <strong>${jobData.title}</strong>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              ${modelListHtml}
            </table>

            ${matchingModels.length > 10 ? `<p style="color: #666; text-align: center;">...and ${matchingModels.length - 10} more</p>` : ""}

            <p style="text-align: center;">
              <a href="${jobUrl}"
                 style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View All Matching Models
              </a>
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
              You received this email because you posted a job on The Model Cloud.
              <br>
              <a href="https://themodel.cloud/profile/settings" style="color: #667eea;">Manage your notification preferences</a>
            </p>
          </div>
        `
      };

      try {
        await sgMail.send(msg);
        clientEmailSent = true;
        console.log(`✅ Model match summary email sent to client: ${clientData.email}`);
      } catch (error) {
        console.error(`Failed to send model match email to client ${clientData.email}:`, error.message);
      }
    }

    console.log(`📧 Job matching complete: ${modelEmailsSent} model emails, client email: ${clientEmailSent}`);

    return {
      success: true,
      matchingModels: matchingModels.length,
      modelEmailsSent,
      clientEmailSent
    };
  } catch (error) {
    console.error("Error processing job matching notifications:", error);
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

    // Validate: creator is either job owner or an applicant/invited
    // Note: jobs use "userId" field for the owner
    const creatorIsOwner = jobData.userId === creatorUid;
    const creatorIsApplicant = (jobData.applicants || []).includes(creatorUid);
    const participantIsOwner = jobData.userId === participantUid;
    const participantIsApplicant = (jobData.applicants || []).includes(participantUid);

    // Also check if either party has been invited to this job
    const [creatorInvitationDoc, participantInvitationDoc] = await Promise.all([
      db.collection("jobs").doc(jobId).collection("invitations").doc(creatorUid).get(),
      db.collection("jobs").doc(jobId).collection("invitations").doc(participantUid).get()
    ]);
    const creatorIsInvited = creatorInvitationDoc.exists;
    const participantIsInvited = participantInvitationDoc.exists;

    // Validation rules:
    // - Job owner can message anyone about their job (they may be in process of inviting them)
    // - Models can only message job owner if they're an applicant or have been invited
    const validCombination =
      creatorIsOwner || // Job owner can always initiate conversation
      (participantIsOwner && (creatorIsApplicant || creatorIsInvited));

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

      // Get recipient email and notification preferences
      const recipientDoc = await db.collection("users").doc(recipientUid).get();
      if (!recipientDoc.exists) continue;

      const recipientData = recipientDoc.data();
      const recipientEmail = recipientData.email;
      const recipientName = recipientData.firstName || "there";

      if (!recipientEmail) {
        console.warn(`No email for recipient: ${recipientUid}`);
        continue;
      }

      // Check if recipient has disabled message email notifications
      const notificationSettings = recipientData.notificationSettings || {};
      if (notificationSettings.emailOnMessage === false) {
        console.log(`Skipping email - user ${recipientUid} has disabled message notifications`);
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
// ORGANISATION MEMBER MANAGEMENT
// ============================================================================

/**
 * Create a new organisation member (Account Manager / Org Admin / Owner only)
 * Creates a new user account with platform role "client" and assigns to organisation
 * @param {Object} data - Member data
 * @param {string} data.email - Email address (required)
 * @param {string} data.password - Password (required)
 * @param {string} data.firstName - First name (required)
 * @param {string} data.lastName - Last name (required)
 * @param {string} data.organisationRole - Role in organisation: "admin" or "member" (required)
 * @param {string} data.teamId - Optional team ID to assign to
 * @returns {Object} - Created user data
 */
exports.createOrganisationMember = onCall({
  cors: true,
  invoker: "public"  // Allow unauthenticated requests at Cloud Run level (function validates auth internally)
}, async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { email, password, firstName, lastName, organisationRole, teamId } = request.data;

  // 2. Validate required fields
  if (!email || !password || !firstName || !lastName || !organisationRole) {
    throw new HttpsError("invalid-argument", "Missing required fields: email, password, firstName, lastName, organisationRole");
  }

  // 3. Validate organisation role (only admin or member allowed, not owner)
  if (!["admin", "member"].includes(organisationRole)) {
    throw new HttpsError("invalid-argument", "organisationRole must be 'admin' or 'member'");
  }

  // 4. Validate password strength
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters");
  }

  // 5. Get caller's data and verify permissions
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerOrgId = callerData.organisationId;
  const callerOrgRole = callerData.organisationRole;
  const callerPlatformRole = callerData.role;

  // 6. Verify caller can add members
  // Must be: account manager of org, OR org admin/owner, OR platform admin
  const isPlatformAdmin = callerPlatformRole === "admin" || callerPlatformRole === "super admin";
  const isOrgOwnerOrAdmin = callerOrgRole === "owner" || callerOrgRole === "admin";
  const isAccountManager = callerPlatformRole === "account manager";

  if (!isPlatformAdmin && !isOrgOwnerOrAdmin && !isAccountManager) {
    throw new HttpsError("permission-denied", "You do not have permission to add organisation members");
  }

  // 7. Verify caller has an organisation (unless platform admin)
  if (!isPlatformAdmin && !callerOrgId) {
    throw new HttpsError("failed-precondition", "You are not associated with an organisation");
  }

  const orgId = callerOrgId;

  console.log(`User ${callerData.email} creating organisation member: ${email} in org ${orgId}`);

  try {
    // 8. Check if email already exists in Auth
    try {
      await admin.auth().getUserByEmail(email);
      throw new HttpsError("already-exists", "A user with this email address already exists");
    } catch (authError) {
      if (authError.code !== "auth/user-not-found") {
        // If error is not "user not found", re-throw
        if (authError instanceof HttpsError) throw authError;
        throw new HttpsError("internal", `Error checking email: ${authError.message}`);
      }
      // User not found - good, we can create them
    }

    // 9. Generate unique publicSlug
    const baseSlug = `${firstName.trim().toLowerCase()}.${lastName.trim().charAt(0).toLowerCase()}`;
    let slug = baseSlug;
    let slugCount = 1;

    while (true) {
      const slugQuery = await db.collection("users").where("publicSlug", "==", slug).get();
      if (slugQuery.empty) break;
      slug = `${baseSlug}${slugCount}`;
      slugCount++;
    }

    // 10. Create user in Firebase Auth
    const newUser = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
    });

    const uid = newUser.uid;

    // 11. Create user document in Firestore
    const userData = {
      uid,
      email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      publicSlug: slug,
      role: "client", // Platform role is always client for org members
      organisationId: orgId,
      organisationRole,
      teamId: teamId || null,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: callerUid,
    };

    await db.collection("users").doc(uid).set(userData);

    // 12. Increment organisation user count
    const orgRef = db.collection("organisations").doc(orgId);
    const orgDoc = await orgRef.get();
    if (orgDoc.exists) {
      const currentCount = orgDoc.data().userCount || 0;
      await orgRef.update({
        userCount: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 13. Log admin action
    try {
      await db.collection("adminLogs").add({
        adminUid: callerUid,
        adminEmail: callerData.email,
        adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
        action: "CREATE_ORG_MEMBER",
        description: `Created organisation member: ${email}`,
        details: {
          newUserUid: uid,
          newUserEmail: email,
          organisationId: orgId,
          organisationRole,
          teamId: teamId || null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    // 14. Send welcome email
    try {
      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send({
          to: email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || "noreply@themodelcloud.com",
            name: process.env.SENDGRID_FROM_NAME || "The Model Cloud",
          },
          subject: "Welcome to The Model Cloud",
          html: `
            <h2>Welcome to The Model Cloud!</h2>
            <p>Hi ${firstName},</p>
            <p>You have been added to an organisation on The Model Cloud.</p>
            <p>Your login details are:</p>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p>Please log in at <a href="${process.env.APP_URL || 'https://app.themodelcloud.com'}">${process.env.APP_URL || 'https://app.themodelcloud.com'}</a> and change your password.</p>
            <p>Best regards,<br>The Model Cloud Team</p>
          `,
        });
      }
    } catch (emailError) {
      console.warn("Failed to send welcome email:", emailError);
      // Don't fail the operation if email fails
    }

    console.log(`Organisation member created: ${email} (${uid}) in org ${orgId}`);

    return {
      success: true,
      uid,
      email,
      firstName,
      lastName,
      organisationRole,
    };

  } catch (error) {
    console.error(`Error creating organisation member ${email}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Failed to create member: ${error.message}`);
  }
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


// ============================================================================
// STRIPE CONNECT - MODEL ONBOARDING
// ============================================================================

/**
 * Create Stripe Connected Account for model
 * Called when model wants to set up payouts
 */
exports.createStripeConnectedAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const uid = request.auth.uid;

  // Verify user is a model
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  if (userData.role !== "model") {
    throw new HttpsError("permission-denied", "Only models can create payout accounts");
  }

  // Check if user already has a Stripe account
  if (userData.stripeAccountId) {
    throw new HttpsError("already-exists", "Stripe account already exists");
  }

  try {
    // Create Express Connected Account
    const account = await stripe.accounts.create({
      type: "express",
      country: userData.country === "United States" ? "US" : "GB", // Default to UK
      email: userData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      business_profile: {
        name: `${userData.firstName} ${userData.lastName}`,
        product_description: "Modeling services via The Model Cloud",
      },
      metadata: {
        firebaseUid: uid,
        platform: "model-cloud",
      },
    });

    // Save Stripe account ID to user document
    await db.collection("users").doc(uid).update({
      stripeAccountId: account.id,
      stripeAccountStatus: "pending",
      stripeOnboardingComplete: false,
      stripePayoutsEnabled: false,
      stripeChargesEnabled: false,
      balance: {
        available: 0,
        pending: 0,
        currency: "GBP",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || "https://v4.themodel.cloud"}/payouts?refresh=true`,
      return_url: `${process.env.FRONTEND_URL || "https://v4.themodel.cloud"}/payouts?success=true`,
      type: "account_onboarding",
    });

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    console.error("Error creating Stripe connected account:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Generate Stripe Connect onboarding link
 * Called if model needs to complete/update onboarding
 */
exports.createStripeOnboardingLink = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  if (!userData.stripeAccountId) {
    throw new HttpsError("failed-precondition", "No Stripe account found. Please create one first.");
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL || "https://v4.themodel.cloud"}/payouts?refresh=true`,
      return_url: `${process.env.FRONTEND_URL || "https://v4.themodel.cloud"}/payouts?success=true`,
      type: "account_onboarding",
    });

    return {
      success: true,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    console.error("Error creating onboarding link:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Generate Stripe Express Dashboard link
 * Allows models to view their Stripe dashboard
 */
exports.createStripeDashboardLink = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  if (!userData.stripeAccountId) {
    throw new HttpsError("failed-precondition", "No Stripe account found");
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(userData.stripeAccountId);

    return {
      success: true,
      dashboardUrl: loginLink.url,
    };
  } catch (error) {
    console.error("Error creating dashboard link:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Check Stripe account status
 * Called to verify onboarding completion
 */
exports.getStripeAccountStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  if (!userData.stripeAccountId) {
    return {
      success: true,
      hasAccount: false,
      status: null,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(userData.stripeAccountId);

    // Update local status if it has changed
    const newStatus = account.details_submitted ? "active" : "pending";
    if (
      userData.stripeAccountStatus !== newStatus ||
      userData.stripePayoutsEnabled !== account.payouts_enabled ||
      userData.stripeChargesEnabled !== account.charges_enabled
    ) {
      await db.collection("users").doc(uid).update({
        stripeAccountStatus: newStatus,
        stripeOnboardingComplete: account.details_submitted,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeChargesEnabled: account.charges_enabled,
      });
    }

    // Get balance for connected account if payouts are enabled
    let balance = null;
    if (account.payouts_enabled) {
      try {
        const stripeBalance = await stripe.balance.retrieve({
          stripeAccount: userData.stripeAccountId,
        });

        // Sum up balances (they can have multiple currencies)
        const available = stripeBalance.available.reduce((sum, b) => {
          // Convert to primary currency if needed (for simplicity, just sum GBP)
          if (b.currency === "gbp") return sum + b.amount;
          return sum;
        }, 0);

        const pending = stripeBalance.pending.reduce((sum, b) => {
          if (b.currency === "gbp") return sum + b.amount;
          return sum;
        }, 0);

        balance = {
          available: available,
          pending: pending,
          currency: "GBP",
        };
      } catch (balanceError) {
        console.warn("Could not fetch Stripe balance:", balanceError.message);
      }
    }

    return {
      success: true,
      hasAccount: true,
      status: newStatus,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      requirements: account.requirements,
      balance: balance,
    };
  } catch (error) {
    console.error("Error getting Stripe account status:", error);
    throw new HttpsError("internal", error.message);
  }
});


// ============================================================================
// STRIPE - CLIENT PAYMENT METHODS
// ============================================================================

/**
 * Create or get Stripe Customer for client
 */
exports.createStripeCustomer = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  // Check if user already has a Stripe customer
  if (userData.stripeCustomerId) {
    return {
      success: true,
      customerId: userData.stripeCustomerId,
      isNew: false,
    };
  }

  try {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.companyName || `${userData.firstName} ${userData.lastName}`,
      metadata: {
        firebaseUid: uid,
        role: userData.role,
        platform: "model-cloud",
      },
    });

    // Save customer ID to user document
    await db.collection("users").doc(uid).update({
      stripeCustomerId: customer.id,
      savedPaymentMethods: [],
    });

    return {
      success: true,
      customerId: customer.id,
      isNew: true,
    };
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Create SetupIntent for saving payment method
 */
exports.createSetupIntent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  let customerId = userData.stripeCustomerId;

  // Create customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.companyName || `${userData.firstName} ${userData.lastName}`,
      metadata: {
        firebaseUid: uid,
        role: userData.role,
        platform: "model-cloud",
      },
    });
    customerId = customer.id;
    await db.collection("users").doc(uid).update({
      stripeCustomerId: customerId,
      savedPaymentMethods: [],
    });
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        firebaseUid: uid,
      },
    });

    return {
      success: true,
      clientSecret: setupIntent.client_secret,
    };
  } catch (error) {
    console.error("Error creating setup intent:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get saved payment methods
 */
exports.getSavedPaymentMethods = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();
  if (!userData.stripeCustomerId) {
    return {
      success: true,
      paymentMethods: [],
    };
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: userData.stripeCustomerId,
      type: "card",
    });

    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: pm.id === userData.defaultPaymentMethod,
    }));

    return {
      success: true,
      paymentMethods: formattedMethods,
    };
  } catch (error) {
    console.error("Error getting payment methods:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Delete a saved payment method
 */
exports.deletePaymentMethod = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { paymentMethodId } = request.data;
  if (!paymentMethodId) {
    throw new HttpsError("invalid-argument", "Payment method ID is required");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  try {
    await stripe.paymentMethods.detach(paymentMethodId);

    // Update user's saved payment methods list
    const userData = userDoc.data();
    const updatedMethods = (userData.savedPaymentMethods || []).filter(
      (id) => id !== paymentMethodId
    );

    const updates = { savedPaymentMethods: updatedMethods };
    if (userData.defaultPaymentMethod === paymentMethodId) {
      updates.defaultPaymentMethod = updatedMethods[0] || null;
    }

    await db.collection("users").doc(uid).update(updates);

    return { success: true };
  } catch (error) {
    console.error("Error deleting payment method:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Set default payment method
 */
exports.setDefaultPaymentMethod = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { paymentMethodId } = request.data;
  if (!paymentMethodId) {
    throw new HttpsError("invalid-argument", "Payment method ID is required");
  }

  const uid = request.auth.uid;

  try {
    await db.collection("users").doc(uid).update({
      defaultPaymentMethod: paymentMethodId,
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting default payment method:", error);
    throw new HttpsError("internal", error.message);
  }
});


// ============================================================================
// JOB AWARD & PAYMENT
// ============================================================================

/**
 * Award job to model (client action)
 * Creates the award record but doesn't initiate payment
 */
exports.awardJobToModel = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { jobId, modelId, agreedAmount, currency = "GBP" } = request.data;

  if (!jobId || !modelId || !agreedAmount) {
    throw new HttpsError("invalid-argument", "Job ID, model ID, and agreed amount are required");
  }

  const uid = request.auth.uid;

  // Get job document
  const jobDoc = await db.collection("jobs").doc(jobId).get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Job not found");
  }

  const jobData = jobDoc.data();

  // Verify caller is the job owner
  if (jobData.userId !== uid) {
    throw new HttpsError("permission-denied", "Only the job owner can award the job");
  }

  // Verify job is not already awarded
  if (jobData.awardedTo) {
    throw new HttpsError("already-exists", "Job has already been awarded");
  }

  // Verify model exists and has Stripe account
  const modelDoc = await db.collection("users").doc(modelId).get();
  if (!modelDoc.exists) {
    throw new HttpsError("not-found", "Model not found");
  }

  const modelData = modelDoc.data();
  if (modelData.role !== "model") {
    throw new HttpsError("invalid-argument", "Selected user is not a model");
  }

  // Check if model has Stripe account set up
  const hasStripeAccount = modelData.stripeAccountId && modelData.stripePayoutsEnabled;

  // Get client data
  const clientDoc = await db.collection("users").doc(uid).get();
  const clientData = clientDoc.data();

  try {
    // Update job with award information
    await db.collection("jobs").doc(jobId).update({
      status: "awarded",
      awardedTo: {
        modelId: modelId,
        modelName: `${modelData.firstName} ${modelData.lastName}`,
        modelEmail: modelData.email,
        awardedAt: admin.firestore.FieldValue.serverTimestamp(),
        awardedBy: uid,
        agreedAmount: Math.round(agreedAmount * 100), // Store in cents
        agreedCurrency: currency,
      },
      payment: {
        status: "pending",
        paymentIntentId: null,
        clientAmount: Math.round(agreedAmount * 100 * (1 + PLATFORM_FEE_PERCENT)),
        modelAmount: Math.round(agreedAmount * 100),
        platformFee: Math.round(agreedAmount * 100 * PLATFORM_FEE_PERCENT),
        currency: currency,
        authorizedAt: null,
        capturedAt: null,
      },
      completion: {
        modelMarkedComplete: false,
        modelMarkedAt: null,
        clientConfirmed: false,
        clientConfirmedAt: null,
        fundsReleasedAt: null,
      },
    });

    // Create notification for model
    await db.collection("users").doc(modelId).collection("notifications").add({
      type: "job_awarded",
      title: "Job Awarded!",
      message: `You have been awarded the job "${jobData.title}" by ${clientData.companyName || clientData.firstName}`,
      data: {
        jobId: jobId,
        jobReference: jobData.reference,
        link: `/jobs/${jobData.reference}`,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send message to model about the job award
    try {
      const clientName = clientData.companyName || `${clientData.firstName} ${clientData.lastName || ""}`.trim();
      const sortedUids = [uid, modelId].sort().join("_");
      const threadId = `job_${jobId}_${sortedUids}`;

      // Check if thread exists, create if not
      const threadRef = db.collection("threads").doc(threadId);
      const threadDoc = await threadRef.get();

      if (!threadDoc.exists) {
        // Create the thread
        await threadRef.set({
          participants: [uid, modelId],
          participantDetails: {
            [uid]: {
              uid: uid,
              name: clientName,
              avatar: clientData.profileAvatar || "",
              role: clientData.role || "client",
            },
            [modelId]: {
              uid: modelId,
              name: `${modelData.firstName} ${modelData.lastName || ""}`.trim(),
              avatar: modelData.profileAvatar || "",
              role: "model",
            },
          },
          type: "job",
          jobId: jobId,
          jobReference: jobData.reference,
          jobTitle: jobData.title,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: uid,
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          unread: { [modelId]: 0 },
        });
      }

      // Add the award message
      await db.collection("threads").doc(threadId).collection("messages").add({
        senderId: uid,
        senderName: clientName,
        senderAvatar: clientData.profileAvatar || "",
        body: `Great news! I've awarded you the job "${jobData.title}"!\n\nAgreed amount: ${currency} ${agreedAmount.toFixed(2)}\n\nI'll now proceed with the payment. Once the funds are held, you can start working on the job. Looking forward to working with you!\n\n[View job details](/jobs/${jobData.reference})`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        system: false,
      });

      // Update thread's last message
      await threadRef.update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: `I've awarded you the job "${jobData.title}"!`,
        [`unread.${modelId}`]: admin.firestore.FieldValue.increment(1),
      });

      console.log("Award message sent to model");
    } catch (msgError) {
      console.error("Failed to send award message:", msgError);
      // Don't fail the whole operation if messaging fails
    }

    // Send email to model
    if (await isEmailEnabled()) {
      try {
        await sgMail.send({
          to: modelData.email,
          from: sendgridFromEmail,
          subject: `Job Awarded: ${jobData.title}`,
          html: `
            <h2>Congratulations!</h2>
            <p>You have been awarded the job "${jobData.title}" (${jobData.reference}).</p>
            <p><strong>Agreed Amount:</strong> ${currency} ${agreedAmount.toFixed(2)}</p>
            <p>The client will now proceed with payment. Once payment is authorized, you can begin work on the job.</p>
            <p>Log in to The Model Cloud to view the job details.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send award email:", emailError);
      }
    }

    return {
      success: true,
      modelHasStripeAccount: hasStripeAccount,
      message: hasStripeAccount
        ? "Job awarded successfully. Proceed to payment."
        : "Job awarded. Note: Model needs to set up their payout account before funds can be released.",
    };
  } catch (error) {
    console.error("Error awarding job:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Create PaymentIntent with manual capture (hold funds)
 * Called when client confirms payment for awarded job
 */
exports.createJobPaymentIntent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { jobId, paymentMethodId } = request.data;

  if (!jobId) {
    throw new HttpsError("invalid-argument", "Job ID is required");
  }

  const uid = request.auth.uid;

  // Get job document
  const jobDoc = await db.collection("jobs").doc(jobId).get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Job not found");
  }

  const jobData = jobDoc.data();

  // Verify caller is the job owner
  if (jobData.userId !== uid) {
    throw new HttpsError("permission-denied", "Only the job owner can pay for the job");
  }

  // Verify job is awarded
  if (!jobData.awardedTo) {
    throw new HttpsError("failed-precondition", "Job must be awarded before payment");
  }

  // Check if payment already exists
  if (jobData.payment && jobData.payment.status !== "pending") {
    // If payment is already authorized or captured, don't allow new payment
    if (jobData.payment.status === "authorized" || jobData.payment.status === "captured") {
      throw new HttpsError("already-exists", "Payment has already been completed");
    }

    // If payment intent exists but is in processing state, return existing client secret
    // This allows retrying the payment if the user cancelled the modal
    if (jobData.payment.paymentIntentId && jobData.payment.status === "processing") {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(jobData.payment.paymentIntentId);
        // If intent is still valid and requires action, return it
        if (existingIntent.status === "requires_payment_method" || existingIntent.status === "requires_confirmation") {
          return {
            success: true,
            paymentIntentId: existingIntent.id,
            clientSecret: existingIntent.client_secret,
            status: existingIntent.status,
            existing: true,
          };
        }
        // If intent is already requires_capture, it was authorized
        if (existingIntent.status === "requires_capture") {
          throw new HttpsError("already-exists", "Payment has already been authorised");
        }
      } catch (retrieveError) {
        if (retrieveError.code) throw retrieveError; // Re-throw HttpsError
        // If we can't retrieve from Stripe, continue to create new intent
        console.log("Could not retrieve existing payment intent, creating new one");
      }
    }
  }

  // Get client's Stripe customer ID
  const clientDoc = await db.collection("users").doc(uid).get();
  const clientData = clientDoc.data();

  if (!clientData.stripeCustomerId) {
    throw new HttpsError("failed-precondition", "Please add a payment method first");
  }

  // Get model's Stripe account (optional - payment can proceed without it)
  const modelDoc = await db.collection("users").doc(jobData.awardedTo.modelId).get();
  const modelData = modelDoc.data();
  const modelHasStripeAccount = !!modelData.stripeAccountId;

  try {
    const amountInCents = jobData.payment.clientAmount;
    const platformFeeInCents = jobData.payment.platformFee;
    const currency = jobData.payment.currency.toLowerCase();

    // Create PaymentIntent with manual capture
    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency,
      customer: clientData.stripeCustomerId,
      capture_method: "manual", // This holds the funds without capturing
      metadata: {
        jobId: jobId,
        jobReference: jobData.reference,
        clientId: uid,
        modelId: jobData.awardedTo.modelId,
        platform: "model-cloud",
        modelHasStripeAccount: modelHasStripeAccount.toString(),
      },
      description: `Payment for job ${jobData.reference}: ${jobData.title}`,
    };

    // Only include transfer_data and application_fee if model has a Stripe account
    // If no account, funds are held and will be transferred when model sets up their account
    if (modelHasStripeAccount) {
      paymentIntentParams.application_fee_amount = platformFeeInCents;
      paymentIntentParams.transfer_data = {
        destination: modelData.stripeAccountId,
      };
    }

    // Add payment method if provided
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirm = true;
      paymentIntentParams.return_url = `${process.env.FRONTEND_URL || "https://v4.themodel.cloud"}/jobs/${jobId}?payment=success`;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Update job with payment intent ID
    await db.collection("jobs").doc(jobId).update({
      "payment.paymentIntentId": paymentIntent.id,
      "payment.status": paymentIntent.status === "requires_capture" ? "authorized" : "processing",
      "payment.modelHasStripeAccount": modelHasStripeAccount,
      "payment.requiresManualTransfer": !modelHasStripeAccount,
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === "requires_action",
      modelHasStripeAccount: modelHasStripeAccount,
    };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Confirm payment was authorized successfully
 * Called after frontend confirms PaymentIntent
 */
exports.confirmJobPaymentAuthorized = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { jobId, paymentIntentId } = request.data;

  if (!jobId || !paymentIntentId) {
    throw new HttpsError("invalid-argument", "Job ID and Payment Intent ID are required");
  }

  const uid = request.auth.uid;

  // Get job document
  const jobDoc = await db.collection("jobs").doc(jobId).get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Job not found");
  }

  const jobData = jobDoc.data();

  // Verify caller is the job owner
  if (jobData.userId !== uid) {
    throw new HttpsError("permission-denied", "Only the job owner can confirm payment");
  }

  try {
    // Verify PaymentIntent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "requires_capture") {
      throw new HttpsError(
        "failed-precondition",
        `Payment is not in correct state: ${paymentIntent.status}`
      );
    }

    // Update job status
    await db.collection("jobs").doc(jobId).update({
      status: "in_progress",
      "payment.status": "authorized",
      "payment.authorizedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update model's pending balance
    const modelId = jobData.awardedTo.modelId;
    const modelAmount = jobData.payment.modelAmount;

    await db.collection("users").doc(modelId).update({
      "balance.pending": admin.firestore.FieldValue.increment(modelAmount),
      "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create transaction record
    await db.collection("transactions").add({
      type: "job_payment_authorized",
      jobId: jobId,
      jobReference: jobData.reference,
      clientId: uid,
      modelId: modelId,
      amount: jobData.payment.modelAmount,
      clientAmount: jobData.payment.clientAmount,
      platformFee: jobData.payment.platformFee,
      currency: jobData.payment.currency,
      status: "authorized",
      stripePaymentIntentId: paymentIntentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify model
    await db.collection("users").doc(modelId).collection("notifications").add({
      type: "payment_authorised",
      title: "Payment Authorised",
      message: `Payment for job "${jobData.title}" has been authorised. You can now start working on the job.`,
      data: {
        jobId: jobId,
        jobReference: jobData.reference,
        jobTitle: jobData.title,
        amount: modelAmount,
        currency: jobData.payment.currency,
        link: `/jobs/${jobData.reference}`,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Payment authorised. Funds are held until job completion.",
    };
  } catch (error) {
    console.error("Error confirming payment authorization:", error);
    throw new HttpsError("internal", error.message);
  }
});


// ============================================================================
// JOB COMPLETION & FUND RELEASE
// ============================================================================

/**
 * Model marks job as complete
 */
exports.modelMarkJobComplete = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { jobId } = request.data;

  if (!jobId) {
    throw new HttpsError("invalid-argument", "Job ID is required");
  }

  const uid = request.auth.uid;

  // Get job document
  const jobDoc = await db.collection("jobs").doc(jobId).get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Job not found");
  }

  const jobData = jobDoc.data();

  // Verify caller is the awarded model
  if (!jobData.awardedTo || jobData.awardedTo.modelId !== uid) {
    throw new HttpsError("permission-denied", "Only the awarded model can mark the job as complete");
  }

  // Verify job is in progress
  if (jobData.status !== "in_progress") {
    throw new HttpsError("failed-precondition", "Job must be in progress to mark as complete");
  }

  // Verify payment was authorized
  if (jobData.payment.status !== "authorized") {
    throw new HttpsError("failed-precondition", "Payment must be authorized before marking complete");
  }

  try {
    await db.collection("jobs").doc(jobId).update({
      "completion.modelMarkedComplete": true,
      "completion.modelMarkedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get client info
    const clientDoc = await db.collection("users").doc(jobData.userId).get();
    const clientData = clientDoc.data();

    // Notify client
    await db.collection("users").doc(jobData.userId).collection("notifications").add({
      type: "job_marked_complete",
      title: "Job Marked Complete",
      message: `The model has marked job "${jobData.title}" as complete. Please review and confirm to release payment.`,
      data: {
        jobId: jobId,
        jobReference: jobData.reference,
        jobTitle: jobData.title,
        link: `/jobs/${jobData.reference}`,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get model info for message
    const modelDoc = await db.collection("users").doc(uid).get();
    const modelData = modelDoc.data();
    const modelName = `${modelData.firstName || ""} ${modelData.lastName || ""}`.trim();

    // Send internal message to client about job completion
    try {
      // Find or create thread for this job
      const threadsQuery = await db.collection("threads")
        .where("jobId", "==", jobId)
        .where("participants", "array-contains", jobData.userId)
        .limit(1)
        .get();

      let threadId;
      if (!threadsQuery.empty) {
        threadId = threadsQuery.docs[0].id;
      } else {
        // Create new thread
        const newThread = await db.collection("threads").add({
          participants: [uid, jobData.userId],
          jobId: jobId,
          contextType: "job",
          contextId: jobId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        threadId = newThread.id;
      }

      // Add message to thread
      await db.collection("threads").doc(threadId).collection("messages").add({
        senderId: uid,
        senderName: modelName,
        senderAvatar: modelData.profileAvatar || "",
        body: `Hi! I've completed the work for "${jobData.title}" and marked the job as complete. Please review and confirm so the payment can be released.\n\n[View job details](/jobs/${jobData.reference})`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        system: false,
      });

      // Update thread metadata
      await db.collection("threads").doc(threadId).update({
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: `I've completed the work for "${jobData.title}"...`,
        [`unread.${jobData.userId}`]: admin.firestore.FieldValue.increment(1),
      });
    } catch (msgError) {
      console.warn("Failed to send completion message:", msgError);
    }

    // Send email to client
    if (await isEmailEnabled()) {
      try {
        await sgMail.send({
          to: clientData.email,
          from: sendgridFromEmail,
          subject: `Job Completed: ${jobData.title}`,
          html: `
            <h2>Job Marked as Complete</h2>
            <p>The model has marked job "${jobData.title}" (${jobData.reference}) as complete.</p>
            <p>Please log in to The Model Cloud to review the work and confirm completion to release the payment.</p>
            <p><strong>Note:</strong> If you do not confirm within 14 days, the funds will be automatically released to the model.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send completion email:", emailError);
      }
    }

    return {
      success: true,
      message: "Job marked as complete. The client has been notified to confirm and release payment.",
    };
  } catch (error) {
    console.error("Error marking job complete:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Client confirms job completion (releases funds)
 */
exports.clientConfirmJobComplete = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { jobId } = request.data;

  if (!jobId) {
    throw new HttpsError("invalid-argument", "Job ID is required");
  }

  const uid = request.auth.uid;

  // Get job document
  const jobDoc = await db.collection("jobs").doc(jobId).get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Job not found");
  }

  const jobData = jobDoc.data();

  // Verify caller is the job owner
  if (jobData.userId !== uid) {
    throw new HttpsError("permission-denied", "Only the job owner can confirm completion");
  }

  // Verify model has marked complete
  if (!jobData.completion.modelMarkedComplete) {
    throw new HttpsError("failed-precondition", "Model must mark the job as complete first");
  }

  // Verify payment is authorized
  if (jobData.payment.status !== "authorized") {
    throw new HttpsError("failed-precondition", "Payment must be authorized");
  }

  try {
    // Capture the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.capture(jobData.payment.paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment capture failed: ${paymentIntent.status}`);
    }

    const modelId = jobData.awardedTo.modelId;
    const modelAmount = jobData.payment.modelAmount;

    // Get model's Stripe connected account
    const modelDoc = await db.collection("users").doc(modelId).get();
    const modelData = modelDoc.data();

    // Transfer funds to model's connected account (if they have one)
    let transferId = null;
    if (modelData.stripeAccountId) {
      try {
        const transfer = await stripe.transfers.create({
          amount: modelAmount,
          currency: jobData.payment.currency.toLowerCase(),
          destination: modelData.stripeAccountId,
          transfer_group: `job_${jobId}`,
          metadata: {
            jobId: jobId,
            jobReference: jobData.reference,
            modelId: modelId,
            platform: "model-cloud",
          },
        });
        transferId = transfer.id;
        console.log(`Transfer created: ${transfer.id} for ${modelAmount} to ${modelData.stripeAccountId}`);
      } catch (transferError) {
        console.error("Failed to transfer to connected account:", transferError);
        // Continue anyway - funds are captured, we can manually reconcile
      }
    }

    // Update job status
    await db.collection("jobs").doc(jobId).update({
      status: "completed",
      "payment.status": "captured",
      "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
      "payment.stripeTransferId": transferId,
      "completion.clientConfirmed": true,
      "completion.clientConfirmedAt": admin.firestore.FieldValue.serverTimestamp(),
      "completion.fundsReleasedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update model's balance (move from pending to available)
    await db.collection("users").doc(modelId).update({
      "balance.pending": admin.firestore.FieldValue.increment(-modelAmount),
      "balance.available": admin.firestore.FieldValue.increment(modelAmount),
      "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update transaction record
    const transactionQuery = await db
      .collection("transactions")
      .where("jobId", "==", jobId)
      .where("type", "==", "job_payment_authorized")
      .limit(1)
      .get();

    if (!transactionQuery.empty) {
      await transactionQuery.docs[0].ref.update({
        status: "completed",
        type: "job_payment_completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Notify model
    await db.collection("users").doc(modelId).collection("notifications").add({
      type: "funds_released",
      title: "Funds Released!",
      message: `Payment of ${jobData.payment.currency} ${(modelAmount / 100).toFixed(2)} for job "${jobData.title}" has been released to your account.`,
      data: {
        jobId: jobId,
        jobReference: jobData.reference,
        jobTitle: jobData.title,
        amount: modelAmount,
        currency: jobData.payment.currency,
        link: `/jobs/${jobData.reference}`,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email to model
    if (await isEmailEnabled()) {
      try {
        await sgMail.send({
          to: modelData.email,
          from: sendgridFromEmail,
          subject: `Payment Released: ${jobData.title}`,
          html: `
            <h2>Payment Released!</h2>
            <p>The client has confirmed completion of job "${jobData.title}" (${jobData.reference}).</p>
            <p><strong>Amount:</strong> ${jobData.payment.currency} ${(modelAmount / 100).toFixed(2)}</p>
            <p>The funds are now available in your Model Cloud balance and can be withdrawn to your bank account.</p>
            <p>Log in to The Model Cloud to view your balance and request a withdrawal.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send funds released email:", emailError);
      }
    }

    return {
      success: true,
      message: "Payment released successfully. The model has been notified.",
    };
  } catch (error) {
    console.error("Error releasing funds:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Admin force release or cancel funds (dispute resolution)
 */
exports.adminManageJobPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { jobId, action, refundPercentage = 100 } = request.data;

  if (!jobId || !action) {
    throw new HttpsError("invalid-argument", "Job ID and action are required");
  }

  if (!["release", "cancel", "partial_refund"].includes(action)) {
    throw new HttpsError("invalid-argument", "Invalid action. Must be: release, cancel, or partial_refund");
  }

  const uid = request.auth.uid;

  // Verify admin role
  const adminDoc = await db.collection("users").doc(uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const adminData = adminDoc.data();
  if (!["admin", "super admin"].includes(adminData.role)) {
    throw new HttpsError("permission-denied", "Only admins can manage job payments");
  }

  // Get job document
  const jobDoc = await db.collection("jobs").doc(jobId).get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Job not found");
  }

  const jobData = jobDoc.data();

  if (!jobData.payment || !jobData.payment.paymentIntentId) {
    throw new HttpsError("failed-precondition", "No payment found for this job");
  }

  try {
    const paymentIntentId = jobData.payment.paymentIntentId;
    const modelId = jobData.awardedTo.modelId;
    const modelAmount = jobData.payment.modelAmount;

    if (action === "release") {
      // Capture the payment and release to model
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

      await db.collection("jobs").doc(jobId).update({
        status: "completed",
        "payment.status": "captured",
        "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
        "completion.fundsReleasedAt": admin.firestore.FieldValue.serverTimestamp(),
        "completion.releasedByAdmin": uid,
      });

      await db.collection("users").doc(modelId).update({
        "balance.pending": admin.firestore.FieldValue.increment(-modelAmount),
        "balance.available": admin.firestore.FieldValue.increment(modelAmount),
        "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log admin action
      await db.collection("adminLogs").add({
        action: "force_release_payment",
        adminUid: uid,
        adminEmail: adminData.email,
        adminName: `${adminData.firstName} ${adminData.lastName}`,
        jobId: jobId,
        jobReference: jobData.reference,
        amount: modelAmount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: "Funds released to model" };

    } else if (action === "cancel") {
      // Cancel the payment intent and refund client
      await stripe.paymentIntents.cancel(paymentIntentId);

      await db.collection("jobs").doc(jobId).update({
        status: "cancelled",
        "payment.status": "cancelled",
        "payment.cancelledAt": admin.firestore.FieldValue.serverTimestamp(),
        "payment.cancelledByAdmin": uid,
      });

      await db.collection("users").doc(modelId).update({
        "balance.pending": admin.firestore.FieldValue.increment(-modelAmount),
        "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log admin action
      await db.collection("adminLogs").add({
        action: "cancel_payment",
        adminUid: uid,
        adminEmail: adminData.email,
        adminName: `${adminData.firstName} ${adminData.lastName}`,
        jobId: jobId,
        jobReference: jobData.reference,
        amount: modelAmount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: "Payment cancelled and client refunded" };

    } else if (action === "partial_refund") {
      // Capture with partial amount
      const captureAmount = Math.round(jobData.payment.clientAmount * (refundPercentage / 100));
      const modelReceives = Math.round(modelAmount * (refundPercentage / 100));

      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
        amount_to_capture: captureAmount,
      });

      await db.collection("jobs").doc(jobId).update({
        status: "completed",
        "payment.status": "partial_captured",
        "payment.capturedAmount": captureAmount,
        "payment.refundedAmount": jobData.payment.clientAmount - captureAmount,
        "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
        "payment.partialRefundByAdmin": uid,
      });

      await db.collection("users").doc(modelId).update({
        "balance.pending": admin.firestore.FieldValue.increment(-modelAmount),
        "balance.available": admin.firestore.FieldValue.increment(modelReceives),
        "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log admin action
      await db.collection("adminLogs").add({
        action: "partial_refund",
        adminUid: uid,
        adminEmail: adminData.email,
        adminName: `${adminData.firstName} ${adminData.lastName}`,
        jobId: jobId,
        jobReference: jobData.reference,
        originalAmount: modelAmount,
        refundPercentage: refundPercentage,
        modelReceives: modelReceives,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: `Partial payment processed. Model receives ${refundPercentage}% (${modelReceives / 100})`,
      };
    }
  } catch (error) {
    console.error("Error managing job payment:", error);
    throw new HttpsError("internal", error.message);
  }
});


// ============================================================================
// WITHDRAWALS
// ============================================================================

/**
 * Get model's balance summary
 */
exports.getModelBalance = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  if (userData.role !== "model") {
    throw new HttpsError("permission-denied", "Only models have a balance");
  }

  const balance = userData.balance || {
    available: 0,
    pending: 0,
    currency: "GBP",
  };

  return {
    success: true,
    balance: {
      available: balance.available,
      pending: balance.pending,
      currency: balance.currency || "GBP",
      lastUpdated: balance.lastUpdated,
    },
    withdrawalFeePercent: WITHDRAWAL_FEE_PERCENT * 100,
  };
});

/**
 * Request withdrawal to bank account
 */
exports.requestWithdrawal = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!stripe) {
    throw new HttpsError("unavailable", "Stripe is not configured");
  }

  const { amount } = request.data;

  if (!amount || amount <= 0) {
    throw new HttpsError("invalid-argument", "Valid withdrawal amount is required");
  }

  const amountInCents = Math.round(amount * 100);
  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userDoc.data();

  if (userData.role !== "model") {
    throw new HttpsError("permission-denied", "Only models can request withdrawals");
  }

  // Check available balance
  const availableBalance = userData.balance?.available || 0;
  if (amountInCents > availableBalance) {
    throw new HttpsError(
      "failed-precondition",
      `Insufficient balance. Available: ${(availableBalance / 100).toFixed(2)}`
    );
  }

  // Check Stripe account
  if (!userData.stripeAccountId || !userData.stripePayoutsEnabled) {
    throw new HttpsError("failed-precondition", "Please complete your payout account setup first");
  }

  // Calculate fee
  const feeInCents = Math.round(amountInCents * WITHDRAWAL_FEE_PERCENT);
  const netAmountInCents = amountInCents - feeInCents;

  try {
    // Check the connected account's actual Stripe balance
    const stripeBalance = await stripe.balance.retrieve({
      stripeAccount: userData.stripeAccountId,
    });

    // Find the available balance in the requested currency
    const currency = (userData.balance?.currency || "GBP").toLowerCase();
    const availableBalance = stripeBalance.available.find((b) => b.currency === currency);
    const pendingBalance = stripeBalance.pending.find((b) => b.currency === currency);

    const availableAmount = availableBalance?.amount || 0;
    const pendingAmount = pendingBalance?.amount || 0;

    console.log(`Stripe balance check - Available: ${availableAmount}, Pending: ${pendingAmount}, Requested: ${netAmountInCents}`);

    if (availableAmount < netAmountInCents) {
      // Not enough available funds - check if there are pending funds
      if (pendingAmount > 0) {
        const pendingGBP = (pendingAmount / 100).toFixed(2);
        const availableGBP = (availableAmount / 100).toFixed(2);
        throw new HttpsError(
          "failed-precondition",
          `Insufficient available funds. You have £${availableGBP} available and £${pendingGBP} pending. Pending funds typically become available within 1-2 business days after job completion.`
        );
      } else {
        throw new HttpsError(
          "failed-precondition",
          `Insufficient funds in your Stripe account. Available: £${(availableAmount / 100).toFixed(2)}`
        );
      }
    }

    // Create a payout from the connected account's available balance
    const payout = await stripe.payouts.create(
      {
        amount: netAmountInCents,
        currency: (userData.balance?.currency || "GBP").toLowerCase(),
        metadata: {
          firebaseUid: uid,
          withdrawalId: `wd_${Date.now()}`,
          platform: "model-cloud",
        },
      },
      {
        stripeAccount: userData.stripeAccountId,
      }
    );

    // Deduct from available balance
    await db.collection("users").doc(uid).update({
      "balance.available": admin.firestore.FieldValue.increment(-amountInCents),
      "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create withdrawal record
    const withdrawalRef = await db.collection("withdrawals").add({
      modelId: uid,
      stripeAccountId: userData.stripeAccountId,
      amount: amountInCents,
      fee: feeInCents,
      netAmount: netAmountInCents,
      currency: userData.balance?.currency || "GBP",
      status: "processing",
      stripePayoutId: payout.id,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
    });

    // Create transaction record
    await db.collection("transactions").add({
      type: "withdrawal",
      modelId: uid,
      amount: amountInCents,
      fee: feeInCents,
      netAmount: netAmountInCents,
      currency: userData.balance?.currency || "GBP",
      status: "processing",
      stripePayoutId: payout.id,
      withdrawalId: withdrawalRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      withdrawalId: withdrawalRef.id,
      amount: amountInCents,
      fee: feeInCents,
      netAmount: netAmountInCents,
      message: `Withdrawal of ${(netAmountInCents / 100).toFixed(2)} initiated. Funds will arrive in 1-2 business days.`,
    };
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get withdrawal history
 */
exports.getWithdrawalHistory = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { limit = 50 } = request.data;
  const uid = request.auth.uid;

  try {
    const withdrawalsSnapshot = await db
      .collection("withdrawals")
      .where("modelId", "==", uid)
      .orderBy("requestedAt", "desc")
      .limit(limit)
      .get();

    const withdrawals = withdrawalsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.()?.toISOString() || null,
      processedAt: doc.data().processedAt?.toDate?.()?.toISOString() || null,
    }));

    return {
      success: true,
      withdrawals,
    };
  } catch (error) {
    console.error("Error getting withdrawal history:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get transaction history
 */
exports.getTransactionHistory = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { limit = 50 } = request.data;
  const uid = request.auth.uid;

  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();

  try {
    let query;
    if (userData.role === "model") {
      query = db.collection("transactions").where("modelId", "==", uid);
    } else {
      query = db.collection("transactions").where("clientId", "==", uid);
    }

    const transactionsSnapshot = await query
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const transactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString() || null,
    }));

    return {
      success: true,
      transactions,
    };
  } catch (error) {
    console.error("Error getting transaction history:", error);
    throw new HttpsError("internal", error.message);
  }
});


// ============================================================================
// MIGRATION: BACKFILL JOBS WITH ORGANISATION IDS
// ============================================================================

/**
 * One-time migration to backfill existing jobs with organisationId
 * For each job:
 *   1. Get job.userId
 *   2. Get user document
 *   3. If user.organisationId exists, update job.organisationId
 *
 * This function is admin-only and should be run once.
 */
exports.migrateJobsToOrganisations = onCall(
  { timeoutSeconds: 540 },
  async (request) => {
    const { auth } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Check if user is admin
    const callerRef = firestore.collection("users").doc(auth.uid);
    const callerSnap = await callerRef.get();
    if (!callerSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const callerData = callerSnap.data();
    if (callerData.role !== "admin" && callerData.role !== "superAdmin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { dryRun = true } = request.data || {};

    try {
      console.log(`Starting job-organisation migration (dryRun: ${dryRun})`);

      // Get all jobs
      const jobsSnap = await firestore.collection("jobs").get();
      const stats = {
        totalJobs: jobsSnap.size,
        alreadyHasOrg: 0,
        userNotFound: 0,
        userNoOrg: 0,
        updated: 0,
        errors: [],
      };

      const batch = firestore.batch();
      let batchCount = 0;
      const MAX_BATCH_SIZE = 500;

      for (const jobDoc of jobsSnap.docs) {
        const jobData = jobDoc.data();

        // Skip if job already has organisationId
        if (jobData.organisationId) {
          stats.alreadyHasOrg++;
          continue;
        }

        // Get the job creator's user document
        const userId = jobData.userId;
        if (!userId) {
          stats.errors.push({ jobId: jobDoc.id, error: "No userId" });
          continue;
        }

        const userRef = firestore.collection("users").doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          stats.userNotFound++;
          continue;
        }

        const userData = userSnap.data();

        // Check if user belongs to an organisation
        if (!userData.organisationId) {
          stats.userNoOrg++;
          continue;
        }

        // Update job with organisation info
        if (!dryRun) {
          batch.update(jobDoc.ref, {
            organisationId: userData.organisationId,
            teamId: userData.teamId || null,
            migratedAt: new Date().toISOString(),
          });

          batchCount++;

          // Commit batch if we reach the limit
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            console.log(`Committed batch of ${batchCount} updates`);
            batchCount = 0;
          }
        }

        stats.updated++;
      }

      // Commit remaining updates
      if (!dryRun && batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount} updates`);
      }

      console.log("Migration complete:", stats);

      return {
        success: true,
        dryRun,
        stats,
        message: dryRun
          ? `Dry run complete. Would update ${stats.updated} jobs.`
          : `Migration complete. Updated ${stats.updated} jobs.`,
      };
    } catch (error) {
      console.error("Migration error:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);


// ============================================================================
// STRIPE WEBHOOKS
// ============================================================================

/**
 * Stripe webhook handler
 * Handles events from Stripe for payment status updates
 */
exports.stripeWebhook = onRequest(
  { cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    if (!stripe) {
      res.status(500).send("Stripe not configured");
      return;
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Stripe webhook secret not configured");
      res.status(500).send("Webhook secret not configured");
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Check for duplicate events (idempotency)
    const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
    const existingEvent = await eventRef.get();

    if (existingEvent.exists && existingEvent.data().processed) {
      console.log(`Event ${event.id} already processed`);
      res.status(200).send("Already processed");
      return;
    }

    // Store the event for idempotency
    await eventRef.set({
      eventId: event.id,
      type: event.type,
      processed: false,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      data: event.data.object,
    });

    try {
      // Handle different event types
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object);
          break;

        case "payment_intent.canceled":
          await handlePaymentIntentCanceled(event.data.object);
          break;

        case "account.updated":
          await handleAccountUpdated(event.data.object);
          break;

        case "payout.paid":
          await handlePayoutPaid(event.data.object);
          break;

        case "payout.failed":
          await handlePayoutFailed(event.data.object);
          break;

        // Subscription events
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object);
          break;

        case "customer.subscription.created":
          await handleSubscriptionCreated(event.data.object);
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event.data.object);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object);
          break;

        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(event.data.object);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await eventRef.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).send("OK");
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      await eventRef.update({
        processed: false,
        error: error.message,
      });
      res.status(500).send(`Error: ${error.message}`);
    }
  }
);

// Webhook helper functions
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log("PaymentIntent succeeded:", paymentIntent.id);
  // This is called when a payment is captured
  // Most of our logic is in the clientConfirmJobComplete function
  // This webhook can be used for additional verification or logging
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log("PaymentIntent failed:", paymentIntent.id);

  const jobId = paymentIntent.metadata?.jobId;
  if (!jobId) return;

  await db.collection("jobs").doc(jobId).update({
    "payment.status": "failed",
    "payment.failedAt": admin.firestore.FieldValue.serverTimestamp(),
    "payment.failureMessage": paymentIntent.last_payment_error?.message || "Payment failed",
  });
}

async function handlePaymentIntentCanceled(paymentIntent) {
  console.log("PaymentIntent canceled:", paymentIntent.id);

  const jobId = paymentIntent.metadata?.jobId;
  if (!jobId) return;

  const jobDoc = await db.collection("jobs").doc(jobId).get();
  if (!jobDoc.exists) return;

  const jobData = jobDoc.data();

  // Update job status
  await db.collection("jobs").doc(jobId).update({
    status: "awarded", // Revert to awarded state
    "payment.status": "cancelled",
    "payment.cancelledAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  // Remove from model's pending balance if applicable
  if (jobData.awardedTo && jobData.payment?.status === "authorized") {
    await db.collection("users").doc(jobData.awardedTo.modelId).update({
      "balance.pending": admin.firestore.FieldValue.increment(-jobData.payment.modelAmount),
      "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function handleAccountUpdated(account) {
  console.log("Account updated:", account.id);

  // Find the user with this Stripe account
  const usersSnapshot = await db
    .collection("users")
    .where("stripeAccountId", "==", account.id)
    .limit(1)
    .get();

  if (usersSnapshot.empty) return;

  const userDoc = usersSnapshot.docs[0];
  const newStatus = account.details_submitted ? "active" : "pending";

  await userDoc.ref.update({
    stripeAccountStatus: newStatus,
    stripeOnboardingComplete: account.details_submitted,
    stripePayoutsEnabled: account.payouts_enabled,
    stripeChargesEnabled: account.charges_enabled,
  });
}

async function handlePayoutPaid(payout) {
  console.log("Payout paid:", payout.id);

  // Update withdrawal record
  const withdrawalSnapshot = await db
    .collection("withdrawals")
    .where("stripePayoutId", "==", payout.id)
    .limit(1)
    .get();

  if (!withdrawalSnapshot.empty) {
    await withdrawalSnapshot.docs[0].ref.update({
      status: "completed",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update transaction record
    const transactionSnapshot = await db
      .collection("transactions")
      .where("stripePayoutId", "==", payout.id)
      .limit(1)
      .get();

    if (!transactionSnapshot.empty) {
      await transactionSnapshot.docs[0].ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

async function handlePayoutFailed(payout) {
  console.log("Payout failed:", payout.id);

  // Update withdrawal record
  const withdrawalSnapshot = await db
    .collection("withdrawals")
    .where("stripePayoutId", "==", payout.id)
    .limit(1)
    .get();

  if (!withdrawalSnapshot.empty) {
    const withdrawalDoc = withdrawalSnapshot.docs[0];
    const withdrawalData = withdrawalDoc.data();

    await withdrawalDoc.ref.update({
      status: "failed",
      failureReason: payout.failure_message || "Payout failed",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Refund the balance to the model
    await db.collection("users").doc(withdrawalData.modelId).update({
      "balance.available": admin.firestore.FieldValue.increment(withdrawalData.amount),
      "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update transaction record
    const transactionSnapshot = await db
      .collection("transactions")
      .where("stripePayoutId", "==", payout.id)
      .limit(1)
      .get();

    if (!transactionSnapshot.empty) {
      await transactionSnapshot.docs[0].ref.update({
        status: "failed",
        failureReason: payout.failure_message || "Payout failed",
      });
    }
  }
}

// ============================================================================
// SUBSCRIPTION WEBHOOK HANDLERS
// ============================================================================

async function handleCheckoutSessionCompleted(session) {
  console.log("Checkout session completed:", session.id);

  const firebaseUid = session.metadata?.firebaseUid;
  if (!firebaseUid) {
    console.log("No Firebase UID in session metadata");
    return;
  }

  // Handle additional seats purchase
  if (session.metadata?.type === "additional_seats") {
    const quantity = parseInt(session.metadata.quantity, 10);

    await db.collection("users").doc(firebaseUid).update({
      "agency.totalSeats": admin.firestore.FieldValue.increment(quantity),
      "agency.additionalSeatsPurchased": admin.firestore.FieldValue.increment(quantity),
    });

    await db.collection("subscriptionEvents").add({
      userId: firebaseUid,
      eventType: "seats_purchased",
      metadata: { quantity },
      stripeEventId: session.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  // Regular subscription checkout is handled by subscription.created event
}

async function handleSubscriptionCreated(subscription) {
  console.log("Subscription created:", subscription.id);

  const firebaseUid = subscription.metadata?.firebaseUid;
  const tier = subscription.metadata?.tier;

  if (!firebaseUid) {
    console.log("No Firebase UID in subscription metadata");
    return;
  }

  const updateData = {
    subscription: {
      tier: tier || "starter",
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      managedSeat: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  };

  // Initialize agency fields if applicable
  if (tier === "agency") {
    updateData.agency = {
      totalSeats: 6,
      usedSeats: 0,
      additionalSeatsPurchased: 0,
      managedUserIds: [],
    };
  }

  await db.collection("users").doc(firebaseUid).update(updateData);

  await db.collection("subscriptionEvents").add({
    userId: firebaseUid,
    eventType: "subscription_created",
    newTier: tier,
    stripeEventId: subscription.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleSubscriptionUpdated(subscription) {
  console.log("Subscription updated:", subscription.id);

  // Find user by subscription ID
  const usersSnapshot = await db
    .collection("users")
    .where("subscription.stripeSubscriptionId", "==", subscription.id)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.log("No user found for subscription:", subscription.id);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userData = userDoc.data();

  // Determine tier from price
  let tier = userData.subscription?.tier || "starter";
  const priceId = subscription.items.data[0]?.price?.id;

  for (const [tierKey, tierConfig] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tierConfig.stripePriceId === priceId) {
      tier = tierKey;
      break;
    }
  }

  await userDoc.ref.update({
    "subscription.tier": tier,
    "subscription.status": subscription.status,
    "subscription.stripePriceId": priceId,
    "subscription.currentPeriodStart": admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
    "subscription.currentPeriodEnd": admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
    "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
    "subscription.cancelledAt": subscription.canceled_at
      ? admin.firestore.Timestamp.fromMillis(subscription.canceled_at * 1000)
      : null,
    "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update managed users' subscription end dates if agency
  if (tier === "agency" && userData.agency?.managedUserIds?.length > 0) {
    const batch = db.batch();
    for (const managedUserId of userData.agency.managedUserIds) {
      batch.update(db.collection("users").doc(managedUserId), {
        "subscription.currentPeriodEnd": admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
        "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log("Subscription deleted:", subscription.id);

  const usersSnapshot = await db
    .collection("users")
    .where("subscription.stripeSubscriptionId", "==", subscription.id)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.log("No user found for subscription:", subscription.id);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userData = userDoc.data();
  const previousTier = userData.subscription?.tier;

  // If agency, handle managed users - revert them to free tier
  if (previousTier === "agency" && userData.agency?.managedUserIds?.length > 0) {
    const batch = db.batch();

    for (const managedUserId of userData.agency.managedUserIds) {
      batch.update(db.collection("users").doc(managedUserId), {
        managedBy: admin.firestore.FieldValue.delete(),
        subscription: {
          tier: "free",
          status: "active",
          stripeSubscriptionId: null,
          stripePriceId: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          managedSeat: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    await batch.commit();
  }

  // Revert user to free tier
  await userDoc.ref.update({
    subscription: {
      tier: "free",
      status: "active",
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      managedSeat: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    // Clear agency data
    agency: admin.firestore.FieldValue.delete(),
  });

  await db.collection("subscriptionEvents").add({
    userId: userDoc.id,
    eventType: "subscription_cancelled",
    previousTier,
    newTier: "free",
    stripeEventId: subscription.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log("Invoice payment succeeded:", invoice.id);

  // Subscription invoices are handled by subscription.updated
  // This is mainly for logging/audit
  if (invoice.subscription) {
    const usersSnapshot = await db
      .collection("users")
      .where("subscription.stripeSubscriptionId", "==", invoice.subscription)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      await db.collection("subscriptionEvents").add({
        userId: usersSnapshot.docs[0].id,
        eventType: "invoice_paid",
        metadata: {
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
        },
        stripeEventId: invoice.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log("Invoice payment failed:", invoice.id);

  if (!invoice.subscription) return;

  const usersSnapshot = await db
    .collection("users")
    .where("subscription.stripeSubscriptionId", "==", invoice.subscription)
    .limit(1)
    .get();

  if (usersSnapshot.empty) return;

  const userDoc = usersSnapshot.docs[0];

  await userDoc.ref.update({
    "subscription.status": "past_due",
    "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("subscriptionEvents").add({
    userId: userDoc.id,
    eventType: "payment_failed",
    metadata: {
      invoiceId: invoice.id,
      attemptCount: invoice.attempt_count,
    },
    stripeEventId: invoice.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send notification to user about failed payment
  await db.collection("users").doc(userDoc.id).collection("notifications").add({
    type: "payment_failed",
    title: "Payment Failed",
    message: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
    data: {
      link: "/account/billing",
    },
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}


// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Auto-release funds for jobs where model marked complete 14+ days ago
 * Runs daily at midnight
 */
exports.autoReleaseFunds = onSchedule(
  {
    schedule: "0 0 * * *", // Every day at midnight
    timeZone: "Europe/London",
    retryCount: 3,
  },
  async (event) => {
    if (!stripe) {
      console.log("Stripe not configured, skipping auto-release");
      return;
    }

    console.log("Running auto-release check...");

    // Find jobs that are:
    // 1. In progress
    // 2. Payment authorized
    // 3. Model marked complete 14+ days ago
    // 4. Client hasn't confirmed
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    try {
      const jobsSnapshot = await db
        .collection("jobs")
        .where("status", "==", "in_progress")
        .where("payment.status", "==", "authorized")
        .where("completion.modelMarkedComplete", "==", true)
        .where("completion.clientConfirmed", "==", false)
        .get();

      let releasedCount = 0;

      for (const jobDoc of jobsSnapshot.docs) {
        const jobData = jobDoc.data();
        const modelMarkedAt = jobData.completion.modelMarkedAt?.toDate?.();

        if (!modelMarkedAt || modelMarkedAt > fourteenDaysAgo) {
          continue; // Not yet 14 days
        }

        console.log(`Auto-releasing funds for job ${jobDoc.id} (${jobData.reference})`);

        try {
          // Capture the PaymentIntent
          const paymentIntent = await stripe.paymentIntents.capture(
            jobData.payment.paymentIntentId
          );

          if (paymentIntent.status !== "succeeded") {
            console.error(`Failed to capture payment for job ${jobDoc.id}: ${paymentIntent.status}`);
            continue;
          }

          const modelId = jobData.awardedTo.modelId;
          const modelAmount = jobData.payment.modelAmount;

          // Get model's Stripe connected account and transfer funds
          const modelDoc = await db.collection("users").doc(modelId).get();
          const modelData = modelDoc.data();

          let transferId = null;
          if (modelData.stripeAccountId) {
            try {
              const transfer = await stripe.transfers.create({
                amount: modelAmount,
                currency: jobData.payment.currency.toLowerCase(),
                destination: modelData.stripeAccountId,
                transfer_group: `job_${jobDoc.id}`,
                metadata: {
                  jobId: jobDoc.id,
                  jobReference: jobData.reference,
                  modelId: modelId,
                  autoReleased: "true",
                  platform: "model-cloud",
                },
              });
              transferId = transfer.id;
              console.log(`Auto-release transfer created: ${transfer.id}`);
            } catch (transferError) {
              console.error("Failed to auto-transfer to connected account:", transferError);
            }
          }

          // Update job status
          await jobDoc.ref.update({
            status: "completed",
            "payment.status": "captured",
            "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
            "payment.stripeTransferId": transferId,
            "completion.fundsReleasedAt": admin.firestore.FieldValue.serverTimestamp(),
            "completion.autoReleased": true,
          });

          // Update model's balance
          await db.collection("users").doc(modelId).update({
            "balance.pending": admin.firestore.FieldValue.increment(-modelAmount),
            "balance.available": admin.firestore.FieldValue.increment(modelAmount),
            "balance.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update transaction record
          const transactionQuery = await db
            .collection("transactions")
            .where("jobId", "==", jobDoc.id)
            .where("type", "==", "job_payment_authorized")
            .limit(1)
            .get();

          if (!transactionQuery.empty) {
            await transactionQuery.docs[0].ref.update({
              status: "completed",
              type: "job_payment_completed",
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              autoReleased: true,
            });
          }

          // Notify model
          await db.collection("users").doc(modelId).collection("notifications").add({
            type: "funds_auto_released",
            title: "Funds Auto-Released!",
            message: `Payment for job "${jobData.title}" has been automatically released after 14 days.`,
            data: {
              jobId: jobDoc.id,
              jobReference: jobData.reference,
              jobTitle: jobData.title,
              amount: modelAmount,
              currency: jobData.payment.currency,
              link: `/jobs/${jobData.reference}`,
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Notify client
          await db.collection("users").doc(jobData.userId).collection("notifications").add({
            type: "funds_auto_released",
            title: "Payment Auto-Released",
            message: `Payment for job "${jobData.title}" was automatically released after 14 days without response.`,
            data: {
              jobId: jobDoc.id,
              jobReference: jobData.reference,
              jobTitle: jobData.title,
              link: `/jobs/${jobData.reference}`,
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          releasedCount++;
        } catch (err) {
          console.error(`Error auto-releasing job ${jobDoc.id}:`, err);
        }
      }

      console.log(`Auto-release complete. Released funds for ${releasedCount} jobs.`);
    } catch (error) {
      console.error("Error in auto-release scheduled function:", error);
    }
  }
);

/**
 * Check for expired subscriptions and mark them as expired
 * Runs daily at 1 AM
 */
exports.checkSubscriptionExpiry = onSchedule(
  {
    schedule: "0 1 * * *", // Every day at 1 AM
    timeZone: "Europe/London",
    retryCount: 3,
  },
  async (event) => {
    console.log("Running subscription expiry check...");

    const now = new Date();

    try {
      // Find subscriptions that have expired (currentPeriodEnd < now and status is still active)
      const expiredSnapshot = await db
        .collection("users")
        .where("subscription.status", "==", "active")
        .where("subscription.currentPeriodEnd", "<", admin.firestore.Timestamp.fromDate(now))
        .get();

      let updatedCount = 0;

      for (const userDoc of expiredSnapshot.docs) {
        const userData = userDoc.data();

        // Skip free tier users (they don't have expiry)
        if (userData.subscription?.tier === "free") continue;

        // Skip managed seats (they're handled by agency expiry)
        if (userData.subscription?.managedSeat) continue;

        console.log(`Marking subscription expired for user: ${userDoc.id}`);

        await userDoc.ref.update({
          "subscription.status": "expired",
          "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });

        // If agency, expire managed users too
        if (userData.subscription?.tier === "agency" && userData.agency?.managedUserIds?.length > 0) {
          const batch = db.batch();

          for (const managedUserId of userData.agency.managedUserIds) {
            batch.update(db.collection("users").doc(managedUserId), {
              "subscription.status": "expired",
              "subscription.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          await batch.commit();
        }

        // Send notification
        await db.collection("users").doc(userDoc.id).collection("notifications").add({
          type: "subscription_expired",
          title: "Subscription Expired",
          message: "Your subscription has expired. Please renew to continue accessing premium features.",
          data: {
            link: "/account/billing",
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Log event
        await db.collection("subscriptionEvents").add({
          userId: userDoc.id,
          eventType: "subscription_expired",
          previousTier: userData.subscription?.tier,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        updatedCount++;
      }

      console.log(`Subscription expiry check complete. Updated ${updatedCount} users.`);
    } catch (error) {
      console.error("Error in subscription expiry check:", error);
    }
  }
);


// ============================================================================
// PUBLIC API - RANDOM MODEL IMAGES
// ============================================================================

// Maximum number of background-removed images to generate per month (Cloudinary free tier limit)
const MAX_MONTHLY_BG_REMOVAL_IMAGES = 15;

/**
 * Helper function to transform a Cloudinary URL with background removal
 */
function transformImageUrl(originalUrl) {
  if (!originalUrl.includes("cloudinary.com") || !originalUrl.includes("/upload/")) {
    return originalUrl;
  }

  const uploadIndex = originalUrl.indexOf("/upload/");
  const baseUrl = originalUrl.substring(0, uploadIndex + 8);
  const afterUpload = originalUrl.substring(uploadIndex + 8);

  let publicIdPart = afterUpload;

  const versionMatch = afterUpload.match(/v\d+\//);
  if (versionMatch) {
    const versionIndex = afterUpload.indexOf(versionMatch[0]);
    if (versionIndex > 0) {
      publicIdPart = afterUpload.substring(versionIndex);
    }
  } else {
    const folderMatch = afterUpload.match(/users\//);
    if (folderMatch) {
      const folderIndex = afterUpload.indexOf(folderMatch[0]);
      if (folderIndex > 0) {
        publicIdPart = afterUpload.substring(folderIndex);
      }
    }
  }

  // e_background_removal: AI-powered background removal
  // c_fill,g_face: crop to fill with face focus
  // w_1200,h_1600: portrait dimensions (3:4 aspect ratio)
  // q_auto,f_auto: automatic quality and format
  return `${baseUrl}e_background_removal/c_fill,g_face,w_1200,h_1600,q_auto,f_auto/${publicIdPart}`;
}

/**
 * Get random model profile images for public pages (sign-in, sign-up, etc.)
 * Uses a monthly cache to limit Cloudinary background removal API usage to 15 images/month
 * @param {number} count - Number of random images to return (default: 5, max: 10)
 * @returns {Object} - Array of cached image URLs with face-focused transformations
 */
exports.getRandomModelImages = onRequest({
  cors: true,
  timeoutSeconds: 30,
}, async (req, res) => {
  try {
    const count = Math.min(Math.max(parseInt(req.query.count) || 5, 1), 10);

    // Check for cached images in Firestore
    const cacheRef = db.collection("settings").doc("signInImagesCache");
    const cacheDoc = await cacheRef.get();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let cachedImages = [];

    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();

      // Check if cache is from current month and has images
      if (cacheData.month === currentMonth && cacheData.images?.length > 0) {
        cachedImages = cacheData.images;
        console.log(`Using cached images from ${currentMonth} (${cachedImages.length} images)`);
      }
    }

    // If no valid cache, generate new images for this month
    if (cachedImages.length === 0) {
      console.log(`Generating new cached images for ${currentMonth}`);

      // Get verified models with profile avatars
      const modelsSnapshot = await db.collection("users")
        .where("role", "==", "model")
        .where("verified", "==", true)
        .limit(100)
        .get();

      const modelsWithAvatars = [];
      modelsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.profileAvatar && data.profileAvatar.includes("cloudinary")) {
          modelsWithAvatars.push({
            originalUrl: data.profileAvatar,
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          });
        }
      });

      if (modelsWithAvatars.length === 0) {
        return res.status(200).json({
          success: true,
          images: [],
          message: "No model images available",
        });
      }

      // Shuffle and pick up to 15 images for the month
      const shuffled = modelsWithAvatars.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(MAX_MONTHLY_BG_REMOVAL_IMAGES, shuffled.length));

      // Transform URLs with background removal
      cachedImages = selected.map((model) => ({
        url: transformImageUrl(model.originalUrl),
        originalUrl: model.originalUrl,
      }));

      // Save to cache
      await cacheRef.set({
        month: currentMonth,
        images: cachedImages,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        count: cachedImages.length,
      });

      console.log(`Cached ${cachedImages.length} images for ${currentMonth}`);
    }

    // Return random selection from cached images
    const shuffledCache = [...cachedImages].sort(() => Math.random() - 0.5);
    const selectedImages = shuffledCache.slice(0, Math.min(count, shuffledCache.length));

    return res.status(200).json({
      success: true,
      images: selectedImages,
      total: cachedImages.length,
      cached: true,
    });
  } catch (error) {
    console.error("Error getting random model images:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


/**
 * Import clients from CSV data (Super Admin only)
 * Creates client users and links them to organisations
 * All imported clients default to "free" tier
 * @param {Array} clients - Array of client objects with email, firstName, lastName, companyName, etc.
 * @returns {Object} - Results for each client (created, updated, or error)
 */
exports.importClients = onCall({ timeoutSeconds: 540 }, async (request) => {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const callerUid = request.auth.uid;
  const { clients } = request.data;

  if (!clients || !Array.isArray(clients) || clients.length === 0) {
    throw new HttpsError("invalid-argument", "Clients array is required");
  }

  // 2. Verify caller is a super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  const callerRole = callerData.role;

  if (callerRole !== "super admin") {
    throw new HttpsError("permission-denied", "Only super admins can import clients");
  }

  console.log(`Super Admin ${callerData.email} starting import of ${clients.length} clients`);

  const defaultPassword = "Client123!";
  const BATCH_SIZE = 10;

  // Track organisations created during this import
  let organisationsCreated = 0;

  // ============================================================
  // PHASE 1: Pre-process all unique organisations SEQUENTIALLY
  // This prevents race conditions when multiple users have same company
  // ============================================================
  const organisationMap = new Map(); // companyName -> { id, name }

  // Collect unique company data (use first occurrence's details)
  const uniqueCompanies = new Map();
  for (const client of clients) {
    const companyName = client.companyName?.trim();
    if (companyName && !uniqueCompanies.has(companyName)) {
      uniqueCompanies.set(companyName, {
        companyName,
        companyNumber: client.companyNumber?.trim() || "",
        vatNumber: client.vatNumber?.trim() || "",
        instagram: client.instagram?.trim() || "",
        companyDescription: client.companyDescription?.trim() || "",
        address: [
          client.address1,
          client.address2,
          client.city,
          client.county,
          client.postcode,
          client.country,
        ].filter(Boolean).map(p => p.trim()).filter(p => p).join(", "),
      });
    }
  }

  console.log(`Found ${uniqueCompanies.size} unique companies to process`);

  // Process organisations SEQUENTIALLY to avoid race conditions
  for (const [companyName, companyData] of uniqueCompanies) {
    try {
      // Check if organisation already exists in database
      const existingOrgQuery = await db.collection("organisations")
        .where("companyName", "==", companyName)
        .limit(1)
        .get();

      if (!existingOrgQuery.empty) {
        const existingOrg = existingOrgQuery.docs[0];
        console.log(`Found existing organisation: ${companyName} (${existingOrg.id})`);

        // Update existing org with instagram/description if provided and not already set
        const existingData = existingOrg.data();
        const updates = {};
        if (companyData.instagram && !existingData.instagram) {
          updates.instagram = companyData.instagram;
        }
        if (companyData.companyDescription && !existingData.companyDescription) {
          updates.companyDescription = companyData.companyDescription;
        }
        if (Object.keys(updates).length > 0) {
          await existingOrg.ref.update(updates);
          console.log(`Updated organisation ${companyName} with new profile data`);
        }

        organisationMap.set(companyName, { id: existingOrg.id, name: companyName });
      } else {
        // Create new organisation with free tier
        const newOrgRef = db.collection("organisations").doc();
        const newOrgData = {
          companyName,
          companyNumber: companyData.companyNumber,
          vatNumber: companyData.vatNumber,
          registeredAddress: companyData.address,
          instagram: companyData.instagram,
          companyDescription: companyData.companyDescription,
          tier: "free",
          licenceLimit: 1,
          status: "active",
          expiryDate: null,
          userCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: callerUid,
        };

        await newOrgRef.set(newOrgData);
        organisationsCreated++;
        console.log(`Created new organisation: ${companyName} (${newOrgRef.id}) on Free tier`);

        organisationMap.set(companyName, { id: newOrgRef.id, name: companyName });
      }
    } catch (orgError) {
      console.error(`Error processing organisation ${companyName}:`, orgError);
      // Continue - users will be created without org link
    }
  }

  console.log(`Organisations processed: ${organisationMap.size} ready, ${organisationsCreated} newly created`);

  // ============================================================
  // PHASE 2: Process users (can be parallel now, orgs already exist)
  // ============================================================

  // Helper function to process a single client
  const processClient = async (client) => {
    const email = client.email?.toLowerCase()?.trim();

    if (!email) {
      return { email: "(missing)", status: "error", message: "Missing email address" };
    }

    // Generate public slug
    const firstName = (client.firstName || "").trim();
    const lastName = (client.lastName || "").trim();
    const firstNameLower = firstName.toLowerCase();
    const lastInitial = lastName.charAt(0).toLowerCase();
    const publicSlug = `${firstNameLower}.${lastInitial}`;

    // Look up organisation from pre-processed map
    const companyName = client.companyName?.trim();
    const organisationInfo = companyName ? organisationMap.get(companyName) : null;

    const clientData = {
      firstName,
      lastName,
      email,
      phone: client.phone || "",
      companyName: companyName || "",
      company: companyName || "", // For backwards compatibility
      address1: client.address1?.trim() || "",
      address2: client.address2?.trim() || "",
      city: client.city?.trim() || "",
      county: client.county?.trim() || "",
      country: client.country?.trim() || "United Kingdom",
      postcode: client.postcode?.trim() || "",
      role: "client",
      publicSlug,
      updatedAt: new Date().toISOString(),
      importedViaCSV: true,
    };

    // Add organisation reference if exists
    if (organisationInfo) {
      clientData.organisationId = organisationInfo.id;
      clientData.organisationRole = "member";
    }

    try {
      // Check if user exists in Firestore first
      const firestoreQuery = await db.collection("users").where("email", "==", email).get();

      if (!firestoreQuery.empty) {
        // User exists in Firestore - update them
        const existingDoc = firestoreQuery.docs[0];
        try {
          await existingDoc.ref.update({
            ...clientData,
            status: "imported",
          });

          // Update organisation user count if applicable
          if (organisationInfo) {
            await db.collection("organisations").doc(organisationInfo.id).update({
              userCount: admin.firestore.FieldValue.increment(1),
            });
          }

          console.log(`Updated existing Firestore user: ${email}`);
          return {
            email,
            status: "updated",
            message: "Existing Firestore user updated",
            organisationName: organisationInfo?.name || null,
          };
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
        ...clientData,
        uid,
        createdAt: new Date().toISOString(),
        status: "activated",
      });

      // Update organisation user count if applicable
      if (organisationInfo) {
        await db.collection("organisations").doc(organisationInfo.id).update({
          userCount: admin.firestore.FieldValue.increment(1),
        });
      }

      if (authUserExisted) {
        return {
          email,
          status: "linked",
          message: "Linked to existing Auth user",
          organisationName: organisationInfo?.name || null,
        };
      } else {
        return {
          email,
          status: "created",
          message: "New user created",
          organisationName: organisationInfo?.name || null,
        };
      }

    } catch (err) {
      console.error(`Error processing ${email}:`, err);
      return { email, status: "error", message: err.message };
    }
  };

  // 3. Process clients in parallel batches
  const results = [];
  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processClient));
    results.push(...batchResults);
    console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(clients.length / BATCH_SIZE)}`);
  }

  // 4. Summary
  const summary = {
    total: clients.length,
    created: results.filter(r => r.status === "created").length,
    updated: results.filter(r => r.status === "updated").length,
    linked: results.filter(r => r.status === "linked").length,
    errors: results.filter(r => r.status === "error").length,
    organisationsCreated,
  };

  console.log(`Import complete:`, summary);

  // 5. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "IMPORT_CLIENTS",
      description: `Imported ${summary.total} clients via CSV`,
      details: {
        summary,
        importedEmails: results.filter(r => r.status !== "error").map(r => r.email),
        errorEmails: results.filter(r => r.status === "error").map(r => ({ email: r.email, error: r.message })),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
    console.log(`Admin action logged: IMPORT_CLIENTS by ${callerData.email}`);
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
  }

  return { success: true, results, summary };
});

/**
 * deleteOrganisation - Delete an organisation and all its related users
 *
 * Super admin only. Cascades delete to:
 * - All users in Firebase Auth
 * - All user documents in Firestore
 * - The organisation document
 *
 * @param {string} organisationId - The ID of the organisation to delete
 * @returns {object} - Success status and summary of deleted items
 */
exports.deleteOrganisation = functions.https.onCall(async (data, context) => {
  // 1. Verify caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerUid = context.auth.uid;
  const { organisationId } = data;

  if (!organisationId) {
    throw new functions.https.HttpsError("invalid-argument", "organisationId is required");
  }

  // 2. Verify caller is super admin
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Caller user not found");
  }

  const callerData = callerDoc.data();
  if (callerData.role !== "super admin") {
    throw new functions.https.HttpsError("permission-denied", "Only super admin can delete organisations");
  }

  console.log(`deleteOrganisation called by ${callerData.email} for org ${organisationId}`);

  // 3. Get the organisation document
  const orgDoc = await db.collection("organisations").doc(organisationId).get();
  if (!orgDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Organisation not found");
  }

  const orgData = orgDoc.data();
  const orgName = orgData.companyName || "Unknown Organisation";

  // 4. Find all users belonging to this organisation
  const usersSnapshot = await db.collection("users")
    .where("organisationId", "==", organisationId)
    .get();

  const userDeletions = [];
  const deletedUsers = [];

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const uid = userDoc.id;

    userDeletions.push(
      (async () => {
        try {
          // Delete from Firebase Auth
          try {
            await admin.auth().deleteUser(uid);
            console.log(`Deleted Auth user: ${userData.email}`);
          } catch (authError) {
            if (authError.code !== "auth/user-not-found") {
              console.error(`Failed to delete Auth user ${uid}:`, authError);
            }
            // Continue even if Auth user doesn't exist
          }

          // Delete from Firestore
          await db.collection("users").doc(uid).delete();
          console.log(`Deleted Firestore user: ${userData.email}`);

          deletedUsers.push({
            uid,
            email: userData.email,
            name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
          });

          return { success: true, email: userData.email };
        } catch (err) {
          console.error(`Error deleting user ${userData.email}:`, err);
          return { success: false, email: userData.email, error: err.message };
        }
      })()
    );
  }

  // Wait for all user deletions
  const userResults = await Promise.all(userDeletions);

  // 5. Delete any teams subcollection
  try {
    const teamsSnapshot = await db.collection("organisations").doc(organisationId)
      .collection("teams").get();

    for (const teamDoc of teamsSnapshot.docs) {
      await teamDoc.ref.delete();
    }
    console.log(`Deleted ${teamsSnapshot.size} teams from organisation`);
  } catch (teamsError) {
    console.error("Error deleting teams:", teamsError);
  }

  // 6. Delete any favourite lists belonging to this organisation
  try {
    const favouritesSnapshot = await db.collection("favouriteLists")
      .where("organisationId", "==", organisationId)
      .get();

    for (const favDoc of favouritesSnapshot.docs) {
      await favDoc.ref.delete();
    }
    console.log(`Deleted ${favouritesSnapshot.size} favourite lists from organisation`);
  } catch (favsError) {
    console.error("Error deleting favourite lists:", favsError);
  }

  // 7. Delete the organisation document
  await db.collection("organisations").doc(organisationId).delete();
  console.log(`Deleted organisation: ${orgName}`);

  // 8. Summary
  const summary = {
    organisationId,
    organisationName: orgName,
    usersDeleted: deletedUsers.length,
    usersFailed: userResults.filter(r => !r.success).length,
  };

  // 9. Log admin action
  try {
    await db.collection("adminLogs").add({
      adminUid: callerUid,
      adminEmail: callerData.email,
      adminName: `${callerData.firstName || ""} ${callerData.lastName || ""}`.trim(),
      action: "DELETE_ORGANISATION",
      description: `Deleted organisation "${orgName}" and ${deletedUsers.length} users`,
      details: {
        summary,
        deletedUsers,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    });
    console.log(`Admin action logged: DELETE_ORGANISATION by ${callerData.email}`);
  } catch (logError) {
    console.error("Failed to log admin action:", logError);
  }

  return {
    success: true,
    message: `Organisation "${orgName}" deleted successfully`,
    summary,
  };
});


// ============================================================================
// MAILCHIMP MARKETING SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Update Mailchimp subscription for a user
 * Adds or removes tags based on their marketing preferences
 *
 * @param {string} email - User's email address
 * @param {string} tag - The marketing tag (newLaunches, productUpdates, newsletter)
 * @param {boolean} subscribed - Whether to subscribe or unsubscribe
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 */
exports.updateMailchimpSubscription = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { email, tag, subscribed, firstName = "", lastName = "" } = request.data;

  if (!email || !tag) {
    throw new HttpsError("invalid-argument", "Email and tag are required");
  }

  // Map internal tag names to Mailchimp tag names
  const tagMapping = {
    newLaunches: "New Launches",
    productUpdates: "Product Updates",
    newsletter: "Newsletter",
  };

  const mailchimpTag = tagMapping[tag];
  if (!mailchimpTag) {
    throw new HttpsError("invalid-argument", `Invalid tag: ${tag}`);
  }

  const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
  const mailchimpAudienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  const mailchimpServerPrefix = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., "us21"

  if (!mailchimpApiKey || !mailchimpAudienceId || !mailchimpServerPrefix) {
    console.warn("Mailchimp not configured. Skipping subscription update.");
    return {
      success: true,
      skipped: true,
      message: "Mailchimp not configured",
    };
  }

  try {
    const crypto = require("crypto");
    const subscriberHash = crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
    const mailchimpUrl = `https://${mailchimpServerPrefix}.api.mailchimp.com/3.0/lists/${mailchimpAudienceId}/members/${subscriberHash}`;

    // First, ensure the member exists (add or update)
    const memberResponse = await axios.put(
      mailchimpUrl,
      {
        email_address: email,
        status_if_new: "subscribed",
        merge_fields: {
          FNAME: firstName,
          LNAME: lastName,
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${mailchimpApiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Mailchimp member ${subscribed ? "added/updated" : "found"}:`, memberResponse.data.id);

    // Now update the tag
    const tagUrl = `https://${mailchimpServerPrefix}.api.mailchimp.com/3.0/lists/${mailchimpAudienceId}/members/${subscriberHash}/tags`;

    await axios.post(
      tagUrl,
      {
        tags: [
          {
            name: mailchimpTag,
            status: subscribed ? "active" : "inactive",
          },
        ],
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${mailchimpApiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Mailchimp tag "${mailchimpTag}" ${subscribed ? "added" : "removed"} for ${email}`);

    return {
      success: true,
      email,
      tag: mailchimpTag,
      subscribed,
    };
  } catch (error) {
    console.error("Mailchimp API error:", error.response?.data || error.message);

    // Don't throw - we don't want to fail the whole operation if Mailchimp fails
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
});
