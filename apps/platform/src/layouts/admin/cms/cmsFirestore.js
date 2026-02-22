/**
 * CMS Firestore Operations
 * Utility functions for managing CMS content in Firestore
 */

import {
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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "firebase";

// ============================================================
// SITE CONTENT OPERATIONS
// ============================================================

/**
 * Get a single site content document by ID
 * @param {string} contentId - The content ID (e.g., "home", "about", "pricing")
 * @returns {Promise<Object|null>} - The content object or null
 */
export async function getSiteContent(contentId) {
  const docRef = doc(db, "siteContent", contentId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Get all site content documents
 * @returns {Promise<Array>} - Array of site content objects
 */
export async function getAllSiteContent() {
  const querySnapshot = await getDocs(collection(db, "siteContent"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Save/update site content
 * @param {string} contentId - The content ID
 * @param {Object} data - The content data to save
 * @param {string} userId - The user ID making the change
 * @returns {Promise<void>}
 */
export async function saveSiteContent(contentId, data, userId) {
  const docRef = doc(db, "siteContent", contentId);
  await setDoc(
    docRef,
    {
      ...data,
      id: contentId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true }
  );
}

// ============================================================
// PRICING TIERS OPERATIONS
// ============================================================

/**
 * Get all pricing tiers
 * @param {boolean} publishedOnly - If true, only return published tiers
 * @returns {Promise<Array>} - Array of pricing tier objects
 */
export async function getPricingTiers(publishedOnly = false) {
  let q;
  if (publishedOnly) {
    q = query(collection(db, "pricingTiers"), where("published", "==", true));
  } else {
    q = query(collection(db, "pricingTiers"));
  }

  const querySnapshot = await getDocs(q);
  const tiers = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by order client-side
  tiers.sort((a, b) => (a.order || 0) - (b.order || 0));

  return tiers;
}

/**
 * Save/update a pricing tier
 * @param {string} id - The tier ID
 * @param {Object} data - The tier data
 * @returns {Promise<void>}
 */
export async function savePricingTier(id, data) {
  const docRef = doc(db, "pricingTiers", id);
  await setDoc(docRef, data, { merge: true });
}

/**
 * Delete a pricing tier
 * @param {string} id - The tier ID to delete
 * @returns {Promise<void>}
 */
export async function deletePricingTier(id) {
  await deleteDoc(doc(db, "pricingTiers", id));
}

// ============================================================
// CONTACT SUBMISSIONS OPERATIONS
// ============================================================

/**
 * Get all contact form submissions
 * @returns {Promise<Array>} - Array of contact submission objects
 */
export async function getContactSubmissions() {
  const q = query(collection(db, "contactSubmissions"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Mark a contact submission as read
 * @param {string} id - The submission ID
 * @returns {Promise<void>}
 */
export async function markContactAsRead(id) {
  await updateDoc(doc(db, "contactSubmissions", id), { read: true });
}

/**
 * Delete a contact submission
 * @param {string} id - The submission ID to delete
 * @returns {Promise<void>}
 */
export async function deleteContactSubmission(id) {
  await deleteDoc(doc(db, "contactSubmissions", id));
}
