/**
 * Favourites utility functions for managing favourite lists and models
 * Handles CRUD operations for favourite lists and quick favourites
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
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "config/firebase";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// FAVOURITE LISTS - CRUD Operations
// ============================================================================

/**
 * Create a new favourite list
 * @param {object} params - List parameters
 * @param {string} params.title - List title
 * @param {string} params.description - Optional description
 * @param {object} params.owner - Owner object with uid, name, role
 * @param {string} params.visibility - "private" | "authenticated" | "public"
 * @param {string|null} params.linkedJobId - Optional linked job ID
 * @param {string|null} params.linkedJobTitle - Optional linked job title
 * @returns {Promise<string>} - The created list ID
 */
export const createFavouriteList = async ({
  title,
  description = "",
  owner,
  visibility = "private",
  linkedJobId = null,
  linkedJobTitle = null,
}) => {
  const shareToken = uuidv4();

  const listData = {
    title,
    description,
    ownerId: owner.uid,
    ownerName: owner.name,
    ownerRole: owner.role,
    models: [],
    modelIds: [],
    modelCount: 0,
    visibility,
    shareToken,
    linkedJobId,
    linkedJobTitle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "favouriteLists"), listData);
  return docRef.id;
};

/**
 * Get a favourite list by ID
 * @param {string} listId - List ID
 * @returns {Promise<object|null>} - List data or null if not found
 */
export const getFavouriteList = async (listId) => {
  const docRef = doc(db, "favouriteLists", listId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

/**
 * Get a favourite list by share token
 * @param {string} shareToken - Share token
 * @returns {Promise<object|null>} - List data or null if not found
 */
export const getFavouriteListByShareToken = async (shareToken) => {
  const q = query(
    collection(db, "favouriteLists"),
    where("shareToken", "==", shareToken)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

/**
 * Get all favourite lists for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} - Array of lists
 */
export const getUserFavouriteLists = async (userId) => {
  const q = query(
    collection(db, "favouriteLists"),
    where("ownerId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Update a favourite list
 * @param {string} listId - List ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateFavouriteList = async (listId, updates) => {
  const docRef = doc(db, "favouriteLists", listId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a favourite list
 * @param {string} listId - List ID
 * @returns {Promise<void>}
 */
export const deleteFavouriteList = async (listId) => {
  const docRef = doc(db, "favouriteLists", listId);
  await deleteDoc(docRef);
};

// ============================================================================
// MODEL MANAGEMENT IN LISTS
// ============================================================================

/**
 * Add a model to a favourite list
 * @param {string} listId - List ID
 * @param {object} modelData - Model data to store (denormalized)
 * @returns {Promise<void>}
 */
export const addModelToList = async (listId, modelData) => {
  const docRef = doc(db, "favouriteLists", listId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("List not found");
  }

  const listData = docSnap.data();

  // Check if model already in list
  if (listData.modelIds.includes(modelData.uid)) {
    return; // Already in list
  }

  const modelEntry = {
    uid: modelData.uid,
    firstName: modelData.firstName || "",
    lastName: modelData.lastName || "",
    profileAvatar: modelData.profileAvatar || null,
    location: modelData.location || "",
    rate: modelData.rate || null,
    publicSlug: modelData.publicSlug || "",
    addedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, {
    models: arrayUnion(modelEntry),
    modelIds: arrayUnion(modelData.uid),
    modelCount: listData.modelCount + 1,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Remove a model from a favourite list
 * @param {string} listId - List ID
 * @param {string} modelUid - Model's user ID
 * @returns {Promise<void>}
 */
export const removeModelFromList = async (listId, modelUid) => {
  const docRef = doc(db, "favouriteLists", listId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("List not found");
  }

  const listData = docSnap.data();
  const modelEntry = listData.models.find((m) => m.uid === modelUid);

  if (!modelEntry) {
    return; // Not in list
  }

  await updateDoc(docRef, {
    models: arrayRemove(modelEntry),
    modelIds: arrayRemove(modelUid),
    modelCount: Math.max(0, listData.modelCount - 1),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Get all lists that contain a specific model
 * @param {string} modelUid - Model's user ID
 * @param {string} userId - Current user ID (owner of lists)
 * @returns {Promise<array>} - Array of list IDs
 */
export const getListsContainingModel = async (modelUid, userId) => {
  const q = query(
    collection(db, "favouriteLists"),
    where("ownerId", "==", userId),
    where("modelIds", "array-contains", modelUid)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.id);
};

// ============================================================================
// QUICK FAVOURITES (User document field)
// ============================================================================

/**
 * Toggle a model in user's quick favourites
 * @param {string} userId - User ID
 * @param {string} modelUid - Model's user ID
 * @param {boolean} isFavourited - Current favourite state
 * @returns {Promise<boolean>} - New favourite state
 */
export const toggleQuickFavourite = async (userId, modelUid, isFavourited) => {
  const userRef = doc(db, "users", userId);

  if (isFavourited) {
    await updateDoc(userRef, {
      favouriteModelIds: arrayRemove(modelUid),
    });
    return false;
  } else {
    await updateDoc(userRef, {
      favouriteModelIds: arrayUnion(modelUid),
    });
    return true;
  }
};

/**
 * Check if a model is in user's quick favourites
 * @param {array} favouriteModelIds - User's favourite model IDs array
 * @param {string} modelUid - Model's user ID
 * @returns {boolean}
 */
export const isModelFavourited = (favouriteModelIds, modelUid) => {
  if (!favouriteModelIds || !Array.isArray(favouriteModelIds)) {
    return false;
  }
  return favouriteModelIds.includes(modelUid);
};

// ============================================================================
// JOB SHORTLISTING
// ============================================================================

/**
 * Link a favourite list to a job (for shortlisting)
 * @param {string} listId - List ID
 * @param {string} jobId - Job ID
 * @param {string} jobTitle - Job title
 * @returns {Promise<void>}
 */
export const linkListToJob = async (listId, jobId, jobTitle) => {
  const docRef = doc(db, "favouriteLists", listId);
  await updateDoc(docRef, {
    linkedJobId: jobId,
    linkedJobTitle: jobTitle,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Unlink a favourite list from a job
 * @param {string} listId - List ID
 * @returns {Promise<void>}
 */
export const unlinkListFromJob = async (listId) => {
  const docRef = doc(db, "favouriteLists", listId);
  await updateDoc(docRef, {
    linkedJobId: null,
    linkedJobTitle: null,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Get lists linked to a specific job
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID (owner of lists)
 * @returns {Promise<array>} - Array of lists
 */
export const getListsForJob = async (jobId, userId) => {
  const q = query(
    collection(db, "favouriteLists"),
    where("ownerId", "==", userId),
    where("linkedJobId", "==", jobId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// ============================================================================
// SHARING
// ============================================================================

/**
 * Generate a shareable URL for a list
 * @param {string} shareToken - List's share token
 * @returns {string} - Full shareable URL
 */
export const generateShareUrl = (shareToken) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/${shareToken}`;
};

/**
 * Update list visibility
 * @param {string} listId - List ID
 * @param {string} visibility - "private" | "authenticated" | "public"
 * @returns {Promise<void>}
 */
export const updateListVisibility = async (listId, visibility) => {
  const docRef = doc(db, "favouriteLists", listId);
  await updateDoc(docRef, {
    visibility,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Regenerate share token for a list
 * @param {string} listId - List ID
 * @returns {Promise<string>} - New share token
 */
export const regenerateShareToken = async (listId) => {
  const newToken = uuidv4();
  const docRef = doc(db, "favouriteLists", listId);
  await updateDoc(docRef, {
    shareToken: newToken,
    updatedAt: serverTimestamp(),
  });
  return newToken;
};
