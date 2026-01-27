/**
 * Z-Card utility functions for managing Z-Card CRUD operations
 * Handles creating, reading, updating, and deleting Z-Cards in Firestore
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "config/firebase";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// Z-CARD CRUD Operations
// ============================================================================

/**
 * Create a new Z-Card
 * @param {object} params - Z-Card parameters
 * @returns {Promise<object>} - The created Z-Card with ID
 */
export const createZCard = async ({
  modelId,
  modelFirstName,
  modelLastName,
  modelPublicSlug,
  createdBy,
  creatorName,
  creatorRole,
  creatorEmail,
  creatorPhone,
  mainImage,
  gridImages,
  measurements,
  visibility = "private",
}) => {
  const shareToken = uuidv4();

  const zcardData = {
    modelId,
    modelFirstName,
    modelLastName,
    modelPublicSlug,
    createdBy,
    creatorName,
    creatorRole,
    creatorEmail: creatorEmail || null,
    creatorPhone: creatorPhone || null,
    mainImage,
    gridImages,
    measurements,
    shareToken,
    visibility,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "zcards"), zcardData);
  return { id: docRef.id, ...zcardData, shareToken };
};

/**
 * Get a Z-Card by ID
 * @param {string} zcardId - Z-Card document ID
 * @returns {Promise<object|null>} - Z-Card data or null
 */
export const getZCard = async (zcardId) => {
  const docRef = doc(db, "zcards", zcardId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

/**
 * Get a Z-Card by share token
 * @param {string} shareToken - Share token UUID
 * @returns {Promise<object|null>} - Z-Card data or null
 */
export const getZCardByShareToken = async (shareToken) => {
  const q = query(
    collection(db, "zcards"),
    where("shareToken", "==", shareToken)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

/**
 * Get all Z-Cards for a specific model
 * @param {string} modelId - Model's UID
 * @returns {Promise<Array>} - Array of Z-Cards
 */
export const getModelZCards = async (modelId) => {
  const q = query(
    collection(db, "zcards"),
    where("modelId", "==", modelId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

/**
 * Get Z-Cards created by a specific user
 * @param {string} creatorId - Creator's UID
 * @returns {Promise<Array>} - Array of Z-Cards
 */
export const getZCardsByCreator = async (creatorId) => {
  const q = query(
    collection(db, "zcards"),
    where("createdBy", "==", creatorId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

/**
 * Update a Z-Card
 * @param {string} zcardId - Z-Card document ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateZCard = async (zcardId, updates) => {
  const docRef = doc(db, "zcards", zcardId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a Z-Card
 * @param {string} zcardId - Z-Card document ID
 * @returns {Promise<void>}
 */
export const deleteZCard = async (zcardId) => {
  const docRef = doc(db, "zcards", zcardId);
  await deleteDoc(docRef);
};

/**
 * Update Z-Card visibility
 * @param {string} zcardId - Z-Card document ID
 * @param {string} visibility - "private" | "authenticated" | "public"
 * @returns {Promise<void>}
 */
export const updateZCardVisibility = async (zcardId, visibility) => {
  const docRef = doc(db, "zcards", zcardId);
  await updateDoc(docRef, {
    visibility,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Generate shareable URL for a Z-Card
 * @param {string} shareToken - Z-Card share token
 * @returns {string} - Full shareable URL
 */
export const generateZCardShareUrl = (shareToken) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/zcard/view/${shareToken}`;
};

/**
 * Regenerate a Z-Card's share token
 * @param {string} zcardId - Z-Card document ID
 * @returns {Promise<string>} - New share token
 */
export const regenerateZCardShareToken = async (zcardId) => {
  const newToken = uuidv4();
  const docRef = doc(db, "zcards", zcardId);
  await updateDoc(docRef, {
    shareToken: newToken,
    updatedAt: serverTimestamp(),
  });
  return newToken;
};

/**
 * Check if user can edit a Z-Card
 * @param {object} zcard - Z-Card data
 * @param {object} user - Current user
 * @returns {boolean} - Whether user can edit
 */
export const canEditZCard = (zcard, user) => {
  if (!zcard || !user) return false;

  // Super admin and admin can edit any Z-Card
  if (user.role === "super admin" || user.role === "admin") return true;

  // Model can edit their own Z-Card
  if (user.role === "model" && zcard.modelId === user.uid) return true;

  // Creator can edit their own Z-Card
  if (zcard.createdBy === user.uid) return true;

  return false;
};

/**
 * Check if user can view a Z-Card
 * @param {object} zcard - Z-Card data
 * @param {object} user - Current user (can be null for public access)
 * @returns {boolean} - Whether user can view
 */
export const canViewZCard = (zcard, user) => {
  if (!zcard) return false;

  // Public Z-Cards can be viewed by anyone
  if (zcard.visibility === "public") return true;

  // Authenticated Z-Cards require login
  if (zcard.visibility === "authenticated" && user) return true;

  // Private Z-Cards - check ownership
  if (zcard.visibility === "private") {
    if (!user) return false;

    // Admins can view any Z-Card
    if (user.role === "super admin" || user.role === "admin") return true;

    // Model can view their own Z-Card
    if (zcard.modelId === user.uid) return true;

    // Creator can view their own Z-Card
    if (zcard.createdBy === user.uid) return true;
  }

  return false;
};
