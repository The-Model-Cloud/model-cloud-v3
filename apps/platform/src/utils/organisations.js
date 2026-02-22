import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

// ============================================================================
// ORGANISATION TIERS
// ============================================================================

/**
 * Organisation tier definitions (legacy - prefer fetching from Firestore)
 */
export const ORG_TIERS = {
  DEMO: "demo",
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
  AGENCY: "agency",
  CUSTOM: "custom",
};

/**
 * Fallback tier config - used if Firestore pricingTiers collection is unavailable
 */
export const TIER_CONFIG_FALLBACK = {
  demo: {
    name: "Demo",
    description: "Trial account for evaluation",
    defaultLicences: 3,
    color: "warning",
    order: 0,
  },
  starter: {
    name: "Starter",
    description: "For small teams",
    defaultLicences: 5,
    color: "info",
    order: 1,
  },
  professional: {
    name: "Professional",
    description: "For growing businesses",
    defaultLicences: 15,
    color: "primary",
    order: 2,
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organisations",
    defaultLicences: 50,
    color: "success",
    order: 3,
  },
  agency: {
    name: "Agency",
    description: "For agencies managing multiple clients",
    defaultLicences: 100,
    color: "secondary",
    order: 4,
  },
  custom: {
    name: "Custom",
    description: "Custom licence configuration",
    defaultLicences: 10,
    color: "default",
    order: 5,
  },
};

// Export as TIER_CONFIG for backwards compatibility
export const TIER_CONFIG = TIER_CONFIG_FALLBACK;

// Cache for pricing tiers from Firestore
let cachedPricingTiers = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch pricing tiers from Firestore pricingTiers collection
 * Falls back to TIER_CONFIG_FALLBACK if collection doesn't exist
 * @param {boolean} forceRefresh - Force refresh the cache
 * @returns {Promise<Object>} Tier configuration object
 */
export async function getPricingTiers(forceRefresh = false) {
  // Return cached data if still valid
  if (!forceRefresh && cachedPricingTiers && cacheTimestamp) {
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_DURATION) {
      return cachedPricingTiers;
    }
  }

  try {
    const db = getFirestore();
    const tiersRef = collection(db, "pricingTiers");
    const snapshot = await getDocs(tiersRef);

    if (snapshot.empty) {
      // Collection doesn't exist or is empty - use fallback
      cachedPricingTiers = TIER_CONFIG_FALLBACK;
      cacheTimestamp = Date.now();
      return TIER_CONFIG_FALLBACK;
    }

    // Build tier config from Firestore documents
    const tiers = {};
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const tierId = docSnap.id; // e.g., "demo", "starter", etc.
      tiers[tierId] = {
        name: data.name || tierId,
        description: data.description || "",
        defaultLicences: data.defaultLicences || data.seats || 5,
        color: data.color || "info",
        order: data.order ?? 99,
        price: data.price || null,
        priceMonthly: data.priceMonthly || null,
        priceAnnual: data.priceAnnual || null,
        features: data.features || [],
      };
    });

    // Add custom tier if not present
    if (!tiers.custom) {
      tiers.custom = TIER_CONFIG_FALLBACK.custom;
    }

    // Sort by order
    const sortedTiers = Object.fromEntries(
      Object.entries(tiers).sort((a, b) => (a[1].order || 99) - (b[1].order || 99))
    );

    cachedPricingTiers = sortedTiers;
    cacheTimestamp = Date.now();
    return sortedTiers;
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    // Return fallback on error
    cachedPricingTiers = TIER_CONFIG_FALLBACK;
    cacheTimestamp = Date.now();
    return TIER_CONFIG_FALLBACK;
  }
}

/**
 * Get a specific tier's configuration
 * @param {string} tierId - Tier ID (e.g., "starter", "enterprise")
 * @returns {Promise<Object>} Tier configuration
 */
export async function getTierConfig(tierId) {
  const tiers = await getPricingTiers();
  return tiers[tierId] || tiers.starter || TIER_CONFIG_FALLBACK.starter;
}

/**
 * Clear the pricing tiers cache
 */
export function clearPricingTiersCache() {
  cachedPricingTiers = null;
  cacheTimestamp = null;
}

// ============================================================================
// ORGANISATION ROLES & PERMISSIONS
// ============================================================================

/**
 * Organisation role hierarchy (higher = more permissions)
 */
export const ORG_ROLES = {
  MEMBER: "member",
  ADMIN: "admin",
  OWNER: "owner",
};

/**
 * Default permissions for each role
 */
export const ROLE_PERMISSIONS = {
  member: {
    canCreateJobs: true,
    canAwardJobs: true,
    canViewAllOrgJobs: false,
    canManageTeamMembers: false,
    canViewAnalytics: false,
    canManageFavourites: true,
    canInviteMembers: false,
    canManageOrg: false,
  },
  admin: {
    canCreateJobs: true,
    canAwardJobs: true,
    canViewAllOrgJobs: true,
    canManageTeamMembers: true,
    canViewAnalytics: true,
    canManageFavourites: true,
    canInviteMembers: true,
    canManageOrg: false,
  },
  owner: {
    canCreateJobs: true,
    canAwardJobs: true,
    canViewAllOrgJobs: true,
    canManageTeamMembers: true,
    canViewAnalytics: true,
    canManageFavourites: true,
    canInviteMembers: true,
    canManageOrg: true,
  },
};

/**
 * Create a new organisation in Firestore
 * @param {Object} orgData - Organisation data
 * @param {string} orgData.companyName - Company name (required)
 * @param {string} orgData.companyNumber - Company registration number (optional)
 * @param {string} orgData.yearEstablished - Year company was established (optional)
 * @param {string} orgData.registeredAddress - Registered address (optional)
 * @param {string} orgData.vatNumber - VAT number (optional)
 * @param {string} orgData.tier - Organisation tier: demo, starter, professional, enterprise, agency (optional)
 * @param {number} orgData.licenceLimit - Maximum number of users allowed (optional)
 * @param {Date|Timestamp} orgData.expiryDate - Account expiry date for demo/trial (optional)
 * @param {string} orgData.createdBy - UID of user creating the org (optional)
 * @returns {Promise<{id: string, ...orgData}>} Created organisation with ID
 */
export async function createOrganisation(orgData) {
  const db = getFirestore();
  const orgsRef = collection(db, "organisations");

  // Generate new document reference with auto ID
  const newOrgRef = doc(orgsRef);

  // Determine default licence limit based on tier
  const tier = orgData.tier || ORG_TIERS.STARTER;
  const defaultLicences = TIER_CONFIG[tier]?.defaultLicences || 5;

  const organisation = {
    companyName: orgData.companyName.trim(),
    companyNumber: orgData.companyNumber || "",
    yearEstablished: orgData.yearEstablished || "",
    registeredAddress: orgData.registeredAddress || "",
    vatNumber: orgData.vatNumber || "",
    tier: tier,
    licenceLimit: orgData.licenceLimit ?? defaultLicences,
    expiryDate: orgData.expiryDate || null,
    status: "active", // active, suspended, expired
    createdAt: Timestamp.now(),
    createdBy: orgData.createdBy || "",
    userCount: 0, // Track number of users in this org
  };

  await setDoc(newOrgRef, organisation);

  return {
    id: newOrgRef.id,
    ...organisation,
  };
}

/**
 * Check if an organisation has exceeded its licence limit
 * @param {string} orgId - Organisation ID
 * @returns {Promise<{canAddUser: boolean, currentCount: number, limit: number}>}
 */
export async function checkLicenceLimit(orgId) {
  const org = await getOrganisationById(orgId);
  if (!org) {
    return { canAddUser: false, currentCount: 0, limit: 0 };
  }

  const currentCount = org.userCount || 0;
  const limit = org.licenceLimit || 999; // Default to high number if not set

  return {
    canAddUser: currentCount < limit,
    currentCount,
    limit,
  };
}

/**
 * Check if an organisation has expired
 * @param {Object} org - Organisation object
 * @returns {boolean}
 */
export function isOrganisationExpired(org) {
  if (!org?.expiryDate) return false;

  const expiryDate = org.expiryDate?.toDate
    ? org.expiryDate.toDate()
    : new Date(org.expiryDate);

  return expiryDate < new Date();
}

/**
 * Get an organisation by company name (case-insensitive)
 * @param {string} companyName - Company name to search for
 * @returns {Promise<Object|null>} Organisation object with ID, or null if not found
 */
export async function getOrganisationByName(companyName) {
  const db = getFirestore();
  const orgsRef = collection(db, "organisations");

  // Firestore doesn't support case-insensitive queries, so we need to fetch and filter
  // For better performance with large datasets, consider storing a lowercase version
  const snapshot = await getDocs(orgsRef);

  const searchName = companyName.trim().toLowerCase();
  const matchingDoc = snapshot.docs.find(
    (doc) => doc.data().companyName.toLowerCase() === searchName
  );

  if (!matchingDoc) return null;

  return {
    id: matchingDoc.id,
    ...matchingDoc.data(),
  };
}

/**
 * Get an organisation by ID
 * @param {string} orgId - Organisation document ID
 * @returns {Promise<Object|null>} Organisation object with ID, or null if not found
 */
export async function getOrganisationById(orgId) {
  const db = getFirestore();
  const orgRef = doc(db, "organisations", orgId);
  const orgSnap = await getDoc(orgRef);

  if (!orgSnap.exists()) return null;

  return {
    id: orgSnap.id,
    ...orgSnap.data(),
  };
}

/**
 * Get or create an organisation by company name
 * If organisation exists, returns it. If not, creates a new one.
 * @param {string} companyName - Company name
 * @param {Object} additionalData - Additional org data (companyNumber, etc.)
 * @param {string} createdBy - UID of user creating the org
 * @returns {Promise<{id: string, ...orgData}>} Organisation object with ID
 */
export async function getOrCreateOrganisation(companyName, additionalData = {}, createdBy = "") {
  // Try to find existing organisation
  const existing = await getOrganisationByName(companyName);

  if (existing) {
    return existing;
  }

  // Create new organisation
  return createOrganisation({
    companyName,
    ...additionalData,
    createdBy,
  });
}

/**
 * Get all organisations
 * @param {Object} options - Query options
 * @param {string} options.orderByField - Field to order by (default: 'companyName')
 * @returns {Promise<Array>} Array of organisation objects with IDs
 */
export async function getAllOrganisations(options = {}) {
  const db = getFirestore();
  const orgsRef = collection(db, "organisations");

  // Create query (can add orderBy if needed)
  const snapshot = await getDocs(orgsRef);

  const organisations = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by company name (client-side since Firestore case-insensitive sort is limited)
  organisations.sort((a, b) =>
    a.companyName.localeCompare(b.companyName, undefined, { sensitivity: 'base' })
  );

  return organisations;
}

/**
 * Get users for a specific organisation
 * @param {string} orgId - Organisation ID
 * @returns {Promise<Array>} Array of user objects
 */
export async function getOrganisationUsers(orgId) {
  const db = getFirestore();
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("organisationId", "==", orgId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
}

/**
 * Update organisation details
 * @param {string} orgId - Organisation ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateOrganisation(orgId, updates) {
  const db = getFirestore();
  const orgRef = doc(db, "organisations", orgId);

  await setDoc(orgRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

/**
 * Increment the user count for an organisation
 * @param {string} orgId - Organisation ID
 * @param {number} increment - Amount to increment by (default: 1, use -1 to decrement)
 * @returns {Promise<void>}
 */
export async function updateOrganisationUserCount(orgId, increment = 1) {
  const db = getFirestore();
  const orgRef = doc(db, "organisations", orgId);

  // Get current count
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) return;

  const currentCount = orgSnap.data().userCount || 0;
  const newCount = Math.max(0, currentCount + increment); // Ensure count doesn't go negative

  await setDoc(orgRef, {
    userCount: newCount,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

/**
 * Create a new team within an organisation
 * @param {string} orgId - Organisation ID
 * @param {Object} teamData - Team data
 * @returns {Promise<{id: string, ...teamData}>} Created team with ID
 */
export async function createTeam(orgId, teamData) {
  const db = getFirestore();
  const teamsRef = collection(db, "organisations", orgId, "teams");
  const newTeamRef = doc(teamsRef);

  const team = {
    name: teamData.name.trim(),
    description: teamData.description || "",
    createdAt: serverTimestamp(),
    createdBy: teamData.createdBy || "",
    permissions: teamData.permissions || ROLE_PERMISSIONS.member,
    memberCount: 0,
  };

  await setDoc(newTeamRef, team);

  return {
    id: newTeamRef.id,
    ...team,
  };
}

/**
 * Get all teams for an organisation
 * @param {string} orgId - Organisation ID
 * @returns {Promise<Array>} Array of team objects
 */
export async function getOrganisationTeams(orgId) {
  const db = getFirestore();
  const teamsRef = collection(db, "organisations", orgId, "teams");
  const snapshot = await getDocs(teamsRef);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get a specific team by ID
 * @param {string} orgId - Organisation ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object|null>} Team object or null
 */
export async function getTeamById(orgId, teamId) {
  const db = getFirestore();
  const teamRef = doc(db, "organisations", orgId, "teams", teamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) return null;

  return {
    id: teamSnap.id,
    ...teamSnap.data(),
  };
}

/**
 * Update a team
 * @param {string} orgId - Organisation ID
 * @param {string} teamId - Team ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateTeam(orgId, teamId, updates) {
  const db = getFirestore();
  const teamRef = doc(db, "organisations", orgId, "teams", teamId);

  await updateDoc(teamRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a team
 * @param {string} orgId - Organisation ID
 * @param {string} teamId - Team ID
 * @returns {Promise<void>}
 */
export async function deleteTeam(orgId, teamId) {
  const db = getFirestore();
  const teamRef = doc(db, "organisations", orgId, "teams", teamId);
  await deleteDoc(teamRef);
}

/**
 * Get team members
 * @param {string} orgId - Organisation ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Array>} Array of user objects in the team
 */
export async function getTeamMembers(orgId, teamId) {
  const db = getFirestore();
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("organisationId", "==", orgId),
    where("teamId", "==", teamId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
}

// ============================================================================
// MEMBER ROLE MANAGEMENT
// ============================================================================

/**
 * Update a user's organisation role
 * @param {string} userId - User ID
 * @param {string} newRole - New role (member, admin, owner)
 * @returns {Promise<void>}
 */
export async function updateMemberRole(userId, newRole) {
  if (!Object.values(ORG_ROLES).includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    organisationRole: newRole,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Assign a user to a team
 * @param {string} userId - User ID
 * @param {string} teamId - Team ID (or null to remove from team)
 * @returns {Promise<void>}
 */
export async function assignUserToTeam(userId, teamId) {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    teamId: teamId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove a user from their organisation
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function removeUserFromOrganisation(userId) {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  // Get user's current org to decrement count
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().organisationId) {
    await updateOrganisationUserCount(userSnap.data().organisationId, -1);
  }

  await updateDoc(userRef, {
    organisationId: null,
    teamId: null,
    organisationRole: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Add a user to an organisation
 * @param {string} userId - User ID
 * @param {string} orgId - Organisation ID
 * @param {string} role - Organisation role (default: member)
 * @param {string} teamId - Team ID (optional)
 * @returns {Promise<void>}
 */
export async function addUserToOrganisation(userId, orgId, role = ORG_ROLES.MEMBER, teamId = null) {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    organisationId: orgId,
    teamId: teamId,
    organisationRole: role,
    updatedAt: serverTimestamp(),
  });

  // Increment org user count
  await updateOrganisationUserCount(orgId, 1);
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Get a user's effective permissions based on their org role
 * @param {Object} user - User object with organisationRole
 * @returns {Object} Permission object
 */
export function getUserPermissions(user) {
  const role = user?.organisationRole || ORG_ROLES.MEMBER;
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member;
}

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with organisationRole
 * @param {string} permission - Permission key to check
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  const permissions = getUserPermissions(user);
  return permissions[permission] === true;
}

/**
 * Check if user can manage the organisation (owner only)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canManageOrganisation(user) {
  return user?.organisationRole === ORG_ROLES.OWNER;
}

/**
 * Check if user can invite members (admin or owner)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canInviteMembers(user) {
  return hasPermission(user, "canInviteMembers");
}

/**
 * Check if user can view all organisation jobs
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canViewAllOrgJobs(user) {
  return hasPermission(user, "canViewAllOrgJobs");
}

/**
 * Check if user can manage team members
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canManageTeamMembers(user) {
  return hasPermission(user, "canManageTeamMembers");
}
