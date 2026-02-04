import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

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
  const orgsRef = collection(db, "Organisations");

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
  const orgsRef = collection(db, "Organisations");

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
  const orgRef = doc(db, "Organisations", orgId);
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
  const orgsRef = collection(db, "Organisations");

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
  const orgRef = doc(db, "Organisations", orgId);

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
  const orgRef = doc(db, "Organisations", orgId);

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
