import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, getFirestore, query, where, doc, updateDoc, writeBatch } from "firebase/firestore";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { Link } from "react-router-dom";

// Dashboard layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Delete model components
import DeleteModelDialog from "components/DeleteModelDialog";
import useDeleteModel from "hooks/useDeleteModel";

// Admin user dialogs
import {
  ResetPasswordDialog,
  ChangeEmailDialog,
  ChangeNameDialog,
  ChangeLocationDialog,
} from "components/AdminUserDialogs";

// API functions
import { adminResetUserPassword, adminUpdateUserEmail, sendVerificationEmail, sendUnverificationEmail } from "utils/api";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";
import { useAuth } from "context/AuthContext";

function AllModels() {
  const { user: currentUser } = useAuth();
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [rawModels, setRawModels] = useState([]);
  const { deleteModel, deleting, error: deleteError, clearError } = useDeleteModel();

  // Delete model state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);

  // Dialog states
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);
  const [changeNameDialogOpen, setChangeNameDialogOpen] = useState(false);
  const [changeLocationDialogOpen, setChangeLocationDialogOpen] = useState(false);

  // Selected model for dialogs
  const [selectedModel, setSelectedModel] = useState(null);

  // Loading and error states for each action
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState(null);
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState(null);
  const [changeNameLoading, setChangeNameLoading] = useState(false);
  const [changeNameError, setChangeNameError] = useState(null);
  const [changeLocationLoading, setChangeLocationLoading] = useState(false);
  const [changeLocationError, setChangeLocationError] = useState(null);

  // Success message
  const [successMessage, setSuccessMessage] = useState("");

  // Bulk verification state
  const [selectedModels, setSelectedModels] = useState([]);
  const [verifying, setVerifying] = useState(false);

  // Get unverified and verified models for selection
  const unverifiedModels = rawModels.filter((m) => m.verified !== true);
  const verifiedModels = rawModels.filter((m) => m.verified === true);

  // Get selected models by verification status
  const selectedUnverified = selectedModels.filter((uid) =>
    unverifiedModels.some((m) => m.uid === uid)
  );
  const selectedVerified = selectedModels.filter((uid) =>
    verifiedModels.some((m) => m.uid === uid)
  );

  // Handle checkbox toggle
  const handleSelectModel = useCallback((uid) => {
    setSelectedModels((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedModels.length === rawModels.length) {
      setSelectedModels([]);
    } else {
      setSelectedModels(rawModels.map((m) => m.uid));
    }
  }, [selectedModels.length, rawModels]);

  // Bulk verify selected models
  const handleBulkVerify = useCallback(async () => {
    if (selectedUnverified.length === 0) return;

    setVerifying(true);
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      selectedUnverified.forEach((uid) => {
        const userRef = doc(db, "users", uid);
        batch.update(userRef, { verified: true });
      });

      await batch.commit();

      // Send verification emails to all verified models
      const modelsToEmail = rawModels.filter((m) => selectedUnverified.includes(m.uid));
      modelsToEmail.forEach((model) => {
        if (model.email) {
          sendVerificationEmail(model.email, model.name || "Model").catch((err) =>
            console.warn("Failed to send verification email:", err)
          );
        }
      });

      // Update local state
      setRawModels((prev) =>
        prev.map((m) =>
          selectedUnverified.includes(m.uid) ? { ...m, verified: true } : m
        )
      );
      setSelectedModels([]);
      setSuccessMessage(`${selectedUnverified.length} model${selectedUnverified.length > 1 ? "s" : ""} verified successfully`);
    } catch (error) {
      console.error("Error bulk verifying models:", error);
    } finally {
      setVerifying(false);
    }
  }, [selectedUnverified, rawModels]);

  // Bulk unverify selected models
  const handleBulkUnverify = useCallback(async () => {
    if (selectedVerified.length === 0) return;

    setVerifying(true);
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      selectedVerified.forEach((uid) => {
        const userRef = doc(db, "users", uid);
        batch.update(userRef, { verified: false });
      });

      await batch.commit();

      // Send unverification emails to all unverified models
      const modelsToEmail = rawModels.filter((m) => selectedVerified.includes(m.uid));
      modelsToEmail.forEach((model) => {
        if (model.email) {
          sendUnverificationEmail(model.email, model.name || "Model").catch((err) =>
            console.warn("Failed to send unverification email:", err)
          );
        }
      });

      // Update local state
      setRawModels((prev) =>
        prev.map((m) =>
          selectedVerified.includes(m.uid) ? { ...m, verified: false } : m
        )
      );
      setSelectedModels([]);
      setSuccessMessage(`${selectedVerified.length} model${selectedVerified.length > 1 ? "s" : ""} unverified successfully`);
    } catch (error) {
      console.error("Error bulk unverifying models:", error);
    } finally {
      setVerifying(false);
    }
  }, [selectedVerified, rawModels]);

  // Verify all unverified models
  const handleVerifyAll = useCallback(async () => {
    if (unverifiedModels.length === 0) return;

    setVerifying(true);
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      unverifiedModels.forEach((model) => {
        const userRef = doc(db, "users", model.uid);
        batch.update(userRef, { verified: true });
      });

      await batch.commit();

      // Send verification emails to all models
      unverifiedModels.forEach((model) => {
        if (model.email) {
          sendVerificationEmail(model.email, model.name || "Model").catch((err) =>
            console.warn("Failed to send verification email:", err)
          );
        }
      });

      // Update local state
      setRawModels((prev) =>
        prev.map((m) => ({ ...m, verified: true }))
      );
      setSelectedModels([]);
      setSuccessMessage(`All ${unverifiedModels.length} model${unverifiedModels.length > 1 ? "s" : ""} verified successfully`);
    } catch (error) {
      console.error("Error verifying all models:", error);
    } finally {
      setVerifying(false);
    }
  }, [unverifiedModels]);

  // Individual verify/unverify toggle handler
  const handleToggleVerification = useCallback(async (model) => {
    const newVerified = !model.verified;
    try {
      const db = getFirestore();
      const userRef = doc(db, "users", model.uid);
      await updateDoc(userRef, { verified: newVerified });

      // Send appropriate email
      if (model.email) {
        if (newVerified) {
          sendVerificationEmail(model.email, model.name || "Model").catch((err) =>
            console.warn("Failed to send verification email:", err)
          );
        } else {
          sendUnverificationEmail(model.email, model.name || "Model").catch((err) =>
            console.warn("Failed to send unverification email:", err)
          );
        }
      }

      // Update local state
      setRawModels((prev) =>
        prev.map((m) =>
          m.uid === model.uid ? { ...m, verified: newVerified } : m
        )
      );
      setSuccessMessage(`${model.name || "Model"} ${newVerified ? "verified" : "unverified"} successfully`);
    } catch (error) {
      console.error("Error toggling verification:", error);
    }
  }, []);

  // Handle delete click
  const handleDeleteClick = useCallback((model) => {
    setModelToDelete(model);
    setDeleteDialogOpen(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!modelToDelete) return;

    const result = await deleteModel(modelToDelete.uid, modelToDelete);
    if (result.success) {
      // Remove the deleted model from the local state
      setRawModels((prev) => prev.filter((m) => m.uid !== modelToDelete.uid));
      setDeleteDialogOpen(false);
      setModelToDelete(null);
      setSuccessMessage("Model deleted successfully");
    }
  }, [modelToDelete, deleteModel]);

  // Handle delete dialog close
  const handleDeleteDialogClose = useCallback(() => {
    if (!deleting) {
      setDeleteDialogOpen(false);
      setModelToDelete(null);
      clearError();
    }
  }, [deleting, clearError]);

  // Handle reset password click
  const handleResetPasswordClick = useCallback((model) => {
    setSelectedModel(model);
    setResetPasswordError(null);
    setResetPasswordDialogOpen(true);
  }, []);

  // Handle reset password confirmation
  const handleResetPasswordConfirm = useCallback(async (newPassword, sendEmail) => {
    if (!selectedModel) return;

    setResetPasswordLoading(true);
    setResetPasswordError(null);

    try {
      await adminResetUserPassword(selectedModel.uid, newPassword, sendEmail);
      setResetPasswordDialogOpen(false);
      setSelectedModel(null);
      setSuccessMessage(`Password reset successfully${sendEmail ? " and email sent" : ""}`);
    } catch (err) {
      setResetPasswordError(err.message || "Failed to reset password");
    } finally {
      setResetPasswordLoading(false);
    }
  }, [selectedModel]);

  // Handle change email click
  const handleChangeEmailClick = useCallback((model) => {
    setSelectedModel(model);
    setChangeEmailError(null);
    setChangeEmailDialogOpen(true);
  }, []);

  // Handle change email confirmation
  const handleChangeEmailConfirm = useCallback(async (newEmail) => {
    if (!selectedModel) return;

    setChangeEmailLoading(true);
    setChangeEmailError(null);

    try {
      await adminUpdateUserEmail(selectedModel.uid, newEmail);
      // Update local state
      setRawModels((prev) =>
        prev.map((m) => (m.uid === selectedModel.uid ? { ...m, email: newEmail } : m))
      );
      setChangeEmailDialogOpen(false);
      setSelectedModel(null);
      setSuccessMessage("Email updated successfully");
    } catch (err) {
      setChangeEmailError(err.message || "Failed to update email");
    } finally {
      setChangeEmailLoading(false);
    }
  }, [selectedModel]);

  // Handle change name click
  const handleChangeNameClick = useCallback((model) => {
    setSelectedModel(model);
    setChangeNameError(null);
    setChangeNameDialogOpen(true);
  }, []);

  // Handle change name confirmation
  const handleChangeNameConfirm = useCallback(async (firstName, lastName) => {
    if (!selectedModel) return;

    setChangeNameLoading(true);
    setChangeNameError(null);

    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", selectedModel.uid), {
        firstName,
        lastName,
        updatedAt: new Date().toISOString(),
      });

      // Log admin action
      await logAdminAction({
        adminUid: currentUser.uid,
        adminEmail: currentUser.email,
        adminName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
        action: ADMIN_ACTIONS.UPDATE_USER_NAME,
        description: `Updated name for model: ${selectedModel.email}`,
        details: {
          userUid: selectedModel.uid,
          userEmail: selectedModel.email,
          oldName: selectedModel.name,
          newName: `${firstName} ${lastName}`.trim(),
        },
      });

      // Update local state
      const newName = `${firstName} ${lastName}`.trim();
      setRawModels((prev) =>
        prev.map((m) =>
          m.uid === selectedModel.uid ? { ...m, firstName, lastName, name: newName } : m
        )
      );
      setChangeNameDialogOpen(false);
      setSelectedModel(null);
      setSuccessMessage("Name updated successfully");
    } catch (err) {
      setChangeNameError(err.message || "Failed to update name");
    } finally {
      setChangeNameLoading(false);
    }
  }, [selectedModel, currentUser]);

  // Handle change location click
  const handleChangeLocationClick = useCallback((model) => {
    setSelectedModel(model);
    setChangeLocationError(null);
    setChangeLocationDialogOpen(true);
  }, []);

  // Handle change location confirmation
  const handleChangeLocationConfirm = useCallback(async (locationData) => {
    if (!selectedModel) return;

    setChangeLocationLoading(true);
    setChangeLocationError(null);

    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", selectedModel.uid), {
        location: locationData.location,
        city: locationData.city,
        county: locationData.county,
        state: locationData.state,
        country: locationData.country,
        updatedAt: new Date().toISOString(),
      });

      // Log admin action
      await logAdminAction({
        adminUid: currentUser.uid,
        adminEmail: currentUser.email,
        adminName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
        action: ADMIN_ACTIONS.UPDATE_USER_LOCATION,
        description: `Updated location for model: ${selectedModel.email}`,
        details: {
          userUid: selectedModel.uid,
          userEmail: selectedModel.email,
          oldLocation: selectedModel.location,
          newLocation: locationData.location,
        },
      });

      // Update local state
      setRawModels((prev) =>
        prev.map((m) =>
          m.uid === selectedModel.uid
            ? {
                ...m,
                location: locationData.location,
                city: locationData.city,
                county: locationData.county,
                state: locationData.state,
                country: locationData.country,
              }
            : m
        )
      );
      setChangeLocationDialogOpen(false);
      setSelectedModel(null);
      setSuccessMessage("Location updated successfully");
    } catch (err) {
      setChangeLocationError(err.message || "Failed to update location");
    } finally {
      setChangeLocationLoading(false);
    }
  }, [selectedModel, currentUser]);

  // Close dialogs
  const handleCloseResetPasswordDialog = useCallback(() => {
    if (!resetPasswordLoading) {
      setResetPasswordDialogOpen(false);
      setSelectedModel(null);
      setResetPasswordError(null);
    }
  }, [resetPasswordLoading]);

  const handleCloseChangeEmailDialog = useCallback(() => {
    if (!changeEmailLoading) {
      setChangeEmailDialogOpen(false);
      setSelectedModel(null);
      setChangeEmailError(null);
    }
  }, [changeEmailLoading]);

  const handleCloseChangeNameDialog = useCallback(() => {
    if (!changeNameLoading) {
      setChangeNameDialogOpen(false);
      setSelectedModel(null);
      setChangeNameError(null);
    }
  }, [changeNameLoading]);

  const handleCloseChangeLocationDialog = useCallback(() => {
    if (!changeLocationLoading) {
      setChangeLocationDialogOpen(false);
      setSelectedModel(null);
      setChangeLocationError(null);
    }
  }, [changeLocationLoading]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      const db = getFirestore();
      const modelsQuery = query(collection(db, "users"), where("role", "==", "model"));
      const snapshot = await getDocs(modelsQuery);

      const modelsList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: data.email || "",
          instagram: data.instagram || "",
          location: data.location || "",
          city: data.city || "",
          county: data.county || "",
          state: data.state || "",
          country: data.country || "",
          status: data.status || "",
          profileAvatar: data.profileAvatar || "",
          verified: data.verified,
        };
      });

      setRawModels(modelsList);
    };

    fetchModels();
  }, []);

  // Update table data when rawModels changes
  useEffect(() => {
    setTableData({
      columns: [
        {
          Header: () => (
            <Checkbox
              checked={rawModels.length > 0 && selectedModels.length === rawModels.length}
              indeterminate={selectedModels.length > 0 && selectedModels.length < rawModels.length}
              onChange={handleSelectAll}
              disabled={rawModels.length === 0}
              size="small"
            />
          ),
          accessor: "select",
          width: "4%",
          Cell: ({ row }) => {
            const { uid } = row.original;
            return (
              <Checkbox
                checked={selectedModels.includes(uid)}
                onChange={() => handleSelectModel(uid)}
                size="small"
              />
            );
          },
        },
        {
          Header: "Name",
          accessor: "name",
          Cell: ({ row }) => {
            const { uid, name } = row.original;
            return (
              <Link to={`/admin/model/${uid}/settings`} style={{ color: "#1976d2", textDecoration: "none" }}>
                {name || "—"}
              </Link>
            );
          },
        },
        { Header: "Email", accessor: "email" },
        { Header: "Location", accessor: "location" },
        {
          Header: "Verified",
          accessor: "verified",
          width: "8%",
          Cell: ({ row }) => {
            const { verified } = row.original;
            return (
              <Chip
                label={verified ? "Verified" : "Unverified"}
                color={verified ? "success" : "warning"}
                size="small"
                icon={<Icon sx={{ fontSize: "16px !important" }}>{verified ? "verified_user" : "gpp_maybe"}</Icon>}
              />
            );
          },
        },
        { Header: "Status", accessor: "status", width: "8%" },
        {
          Header: "Actions",
          accessor: "actions",
          width: "20%",
          Cell: ({ row }) => {
            const model = row.original;
            return (
              <MDBox display="flex" gap={0.5}>
                <Tooltip title={model.verified ? "Unverify Model" : "Verify Model"}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleVerification(model)}
                    sx={{ color: model.verified ? "#ed6c02" : "#2e7d32" }}
                  >
                    <Icon fontSize="small">{model.verified ? "gpp_maybe" : "verified_user"}</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset Password">
                  <IconButton
                    size="small"
                    onClick={() => handleResetPasswordClick(model)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">lock_reset</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Email">
                  <IconButton
                    size="small"
                    onClick={() => handleChangeEmailClick(model)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">email</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Name">
                  <IconButton
                    size="small"
                    onClick={() => handleChangeNameClick(model)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">badge</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Location">
                  <IconButton
                    size="small"
                    onClick={() => handleChangeLocationClick(model)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">location_on</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Model">
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(model)}
                    sx={{ color: "#d32f2f" }}
                  >
                    <Icon fontSize="small">delete</Icon>
                  </IconButton>
                </Tooltip>
              </MDBox>
            );
          },
        },
      ],
      rows: rawModels,
    });
  }, [
    rawModels,
    handleDeleteClick,
    handleResetPasswordClick,
    handleChangeEmailClick,
    handleChangeNameClick,
    handleChangeLocationClick,
    handleToggleVerification,
    selectedModels,
    handleSelectAll,
    handleSelectModel,
  ]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3} lineHeight={1}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <MDBox>
                <MDTypography variant="h5" fontWeight="medium">
                  All Models
                </MDTypography>
                <MDTypography variant="button" color="text">
                  {rawModels.length} model{rawModels.length !== 1 ? "s" : ""} total
                  {unverifiedModels.length > 0 && ` • ${unverifiedModels.length} unverified`}
                </MDTypography>
              </MDBox>
              <MDBox display="flex" alignItems="center" gap={2}>
                {selectedModels.length > 0 ? (
                  <>
                    <MDTypography variant="button" color="text">
                      {selectedModels.length} selected
                    </MDTypography>
                    {selectedUnverified.length > 0 && (
                      <MDButton
                        variant="gradient"
                        color="success"
                        size="small"
                        onClick={handleBulkVerify}
                        disabled={verifying}
                        startIcon={<Icon>{verifying ? "hourglass_empty" : "verified_user"}</Icon>}
                      >
                        {verifying ? "Processing..." : `Verify (${selectedUnverified.length})`}
                      </MDButton>
                    )}
                    {selectedVerified.length > 0 && (
                      <MDButton
                        variant="gradient"
                        color="warning"
                        size="small"
                        onClick={handleBulkUnverify}
                        disabled={verifying}
                        startIcon={<Icon>{verifying ? "hourglass_empty" : "gpp_maybe"}</Icon>}
                      >
                        {verifying ? "Processing..." : `Unverify (${selectedVerified.length})`}
                      </MDButton>
                    )}
                  </>
                ) : (
                  unverifiedModels.length > 0 && (
                    <MDButton
                      variant="gradient"
                      color="success"
                      size="small"
                      onClick={handleVerifyAll}
                      disabled={verifying}
                      startIcon={<Icon>{verifying ? "hourglass_empty" : "verified_user"}</Icon>}
                    >
                      {verifying ? "Processing..." : "Verify All"}
                    </MDButton>
                  )
                )}
              </MDBox>
            </MDBox>
          </MDBox>
          <DataTable table={tableData} canSearch entriesPerPage={{ defaultValue: 25 }} />
        </Card>
      </MDBox>
      <Footer />

      {/* Delete Model Dialog */}
      <DeleteModelDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        model={modelToDelete}
        loading={deleting}
        error={deleteError}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onClose={handleCloseResetPasswordDialog}
        onConfirm={handleResetPasswordConfirm}
        user={selectedModel}
        loading={resetPasswordLoading}
        error={resetPasswordError}
      />

      {/* Change Email Dialog */}
      <ChangeEmailDialog
        open={changeEmailDialogOpen}
        onClose={handleCloseChangeEmailDialog}
        onConfirm={handleChangeEmailConfirm}
        user={selectedModel}
        loading={changeEmailLoading}
        error={changeEmailError}
      />

      {/* Change Name Dialog */}
      <ChangeNameDialog
        open={changeNameDialogOpen}
        onClose={handleCloseChangeNameDialog}
        onConfirm={handleChangeNameConfirm}
        user={selectedModel}
        loading={changeNameLoading}
        error={changeNameError}
      />

      {/* Change Location Dialog */}
      <ChangeLocationDialog
        open={changeLocationDialogOpen}
        onClose={handleCloseChangeLocationDialog}
        onConfirm={handleChangeLocationConfirm}
        user={selectedModel}
        loading={changeLocationLoading}
        error={changeLocationError}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessMessage("")} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default AllModels;
