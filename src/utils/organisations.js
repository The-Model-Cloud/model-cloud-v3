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
 * @param {string} orgData.createdBy - UID of user creating the org (optional)
 * @returns {Promise<{id: string, ...orgData}>} Created organisation with ID
 */
export async function createOrganisation(orgData) {
  const db = getFirestore();
  const orgsRef = collection(db, "organisations");

  // Generate new document reference with auto ID
  const newOrgRef = doc(orgsRef);

  const organisation = {
    companyName: orgData.companyName.trim(),
    companyNumber: orgData.companyNumber || "",
    yearEstablished: orgData.yearEstablished || "",
    registeredAddress: orgData.registeredAddress || "",
    vatNumber: orgData.vatNumber || "",
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
