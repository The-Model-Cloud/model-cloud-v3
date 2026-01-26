/**
 * useDeleteUser - Custom hook for deleting user accounts (Admin only)
 * Handles the Cloud Function call, admin logging, and state management
 * Works with all user types (models, clients, account managers, admins)
 */

import { useState, useCallback } from "react";
import { doc, deleteDoc, getFirestore } from "firebase/firestore";
import { deleteModel as deleteModelApi, deleteUserAuth } from "utils/api";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";
import { useAuth } from "context/AuthContext";

// Map role to action type for logging
const getActionType = (role) => {
  switch (role) {
    case "model":
      return ADMIN_ACTIONS.DELETE_MODEL;
    case "client":
      return ADMIN_ACTIONS.DELETE_CLIENT;
    case "admin":
    case "super admin":
      return ADMIN_ACTIONS.DELETE_ADMIN;
    default:
      return ADMIN_ACTIONS.DELETE_USER;
  }
};

export const useDeleteUser = () => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const deleteUser = useCallback(
    async (userUid, userData = {}) => {
      if (!user) {
        setError("User not authenticated");
        return { success: false, error: "User not authenticated" };
      }

      setDeleting(true);
      setError(null);

      const role = userData.role || "unknown";

      try {
        let result;

        // For models, use the dedicated deleteModel API which handles all cleanup
        if (role === "model") {
          result = await deleteModelApi(userUid);
          if (!result.success) {
            throw new Error(result.error || "Failed to delete model");
          }
        } else {
          // For other user types, delete Firestore document first, then Auth
          const db = getFirestore();

          // Delete Firestore user document
          await deleteDoc(doc(db, "users", userUid));

          // Delete Firebase Auth account
          const authResult = await deleteUserAuth(userUid);
          if (!authResult.success && !authResult.notFound) {
            console.warn("Auth deletion failed but continuing:", authResult.error);
          }

          result = {
            success: true,
            userName: userData.name || `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
            userEmail: userData.email,
          };
        }

        // Log admin action
        const adminName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const userName = result.modelName || result.userName || userData.name || "Unknown";
        const userEmail = result.modelEmail || result.userEmail || userData.email || "Unknown";

        await logAdminAction({
          adminUid: user.uid,
          adminEmail: user.email,
          adminName,
          action: getActionType(role),
          description: `Deleted ${role} account: ${userEmail}`,
          details: {
            userUid,
            userEmail,
            userName,
            userRole: role,
            cleanup: result.cleanup,
            deletedImages: result.deletedImages,
            errors: result.errors,
          },
        });

        return { success: true, data: result };
      } catch (err) {
        const errorMessage = err.message || "Failed to delete user";
        setError(errorMessage);
        console.error("Delete user error:", err);
        return { success: false, error: errorMessage };
      } finally {
        setDeleting(false);
      }
    },
    [user]
  );

  return { deleteUser, deleting, error, clearError: () => setError(null) };
};

export default useDeleteUser;
