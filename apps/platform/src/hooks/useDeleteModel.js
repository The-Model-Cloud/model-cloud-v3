/**
 * useDeleteModel - Custom hook for deleting model accounts (Admin only)
 * Handles the Cloud Function call, admin logging, and state management
 */

import { useState, useCallback } from "react";
import { deleteModel as deleteModelApi } from "utils/api";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";
import { useAuth } from "context/AuthContext";

export const useDeleteModel = () => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const deleteModel = useCallback(
    async (modelUid, modelData = {}) => {
      if (!user) {
        setError("User not authenticated");
        return { success: false, error: "User not authenticated" };
      }

      setDeleting(true);
      setError(null);

      try {
        // Call Cloud Function
        const result = await deleteModelApi(modelUid);

        if (!result.success) {
          throw new Error(result.error || "Failed to delete model");
        }

        // Log admin action
        const adminName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const modelName = result.modelName || modelData.name || "Unknown";
        const modelEmail = result.modelEmail || modelData.email || "Unknown";

        await logAdminAction({
          adminUid: user.uid,
          adminEmail: user.email,
          adminName,
          action: ADMIN_ACTIONS.DELETE_MODEL,
          description: `Deleted model account: ${modelEmail}`,
          details: {
            modelUid,
            modelEmail,
            modelName,
            cleanup: result.cleanup,
            deletedImages: result.deletedImages,
            errors: result.errors,
          },
        });

        return { success: true, data: result };
      } catch (err) {
        const errorMessage = err.message || "Failed to delete model";
        setError(errorMessage);
        console.error("Delete model error:", err);
        return { success: false, error: errorMessage };
      } finally {
        setDeleting(false);
      }
    },
    [user]
  );

  return { deleteModel, deleting, error, clearError: () => setError(null) };
};

export default useDeleteModel;
