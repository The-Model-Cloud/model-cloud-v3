// src/utils/adminLogs.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "config/firebase";

/**
 * Log an admin action to Firestore
 * @param {Object} params - Log parameters
 * @param {string} params.adminUid - The admin user's UID
 * @param {string} params.adminEmail - The admin user's email
 * @param {string} params.adminName - The admin user's name
 * @param {string} params.action - The action performed (e.g., "DELETE_ALL_MODELS")
 * @param {string} params.description - Human-readable description
 * @param {Object} params.details - Additional details about the action
 * @returns {Promise<string>} - The log document ID
 */
export const logAdminAction = async ({
  adminUid,
  adminEmail,
  adminName,
  action,
  description,
  details = {},
}) => {
  try {
    const logRef = collection(db, "adminLogs");

    const logEntry = {
      adminUid,
      adminEmail,
      adminName,
      action,
      description,
      details,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString(),
    };

    const docRef = await addDoc(logRef, logEntry);
    console.log(`Admin action logged: ${action} by ${adminEmail}`);
    return docRef.id;
  } catch (error) {
    console.error("Error logging admin action:", error);
    throw error;
  }
};

// Action type constants
export const ADMIN_ACTIONS = {
  DELETE_ALL_MODELS: "DELETE_ALL_MODELS",
  DELETE_ALL_CLIENTS: "DELETE_ALL_CLIENTS",
  DELETE_ALL_JOBS: "DELETE_ALL_JOBS",
  DELETE_MODEL: "DELETE_MODEL",
  DELETE_USER: "DELETE_USER",
  DELETE_CLIENT: "DELETE_CLIENT",
  DELETE_ADMIN: "DELETE_ADMIN",
  DELETE_ORPHANED_AUTH_ACCOUNTS: "DELETE_ORPHANED_AUTH_ACCOUNTS",
  CLEANUP_CLOUDINARY: "CLEANUP_CLOUDINARY",
  IMPORT_MODELS: "IMPORT_MODELS",
  IMPORT_IMAGES: "IMPORT_IMAGES",
  OPTIMIZE_IMAGES: "OPTIMIZE_IMAGES",
  EDIT_MODEL: "EDIT_MODEL",
  RESET_USER_PASSWORD: "RESET_USER_PASSWORD",
  UPDATE_USER_EMAIL: "UPDATE_USER_EMAIL",
  UPDATE_USER_NAME: "UPDATE_USER_NAME",
  UPDATE_USER_LOCATION: "UPDATE_USER_LOCATION",
  UPDATE_USER_ROLE: "UPDATE_USER_ROLE",
};
