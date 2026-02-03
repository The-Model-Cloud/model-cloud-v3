import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, getFirestore, doc, updateDoc, writeBatch } from "firebase/firestore";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useNavigate } from "react-router-dom";

// Dashboard layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Delete user components
import DeleteUserDialog from "components/DeleteUserDialog";
import useDeleteUser from "hooks/useDeleteUser";

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

// Role color mapping
const getRoleColor = (role) => {
  switch (role) {
    case "model":
      return "info";
    case "client":
      return "success";
    case "account manager":
      return "warning";
    case "admin":
      return "primary";
    case "super admin":
      return "error";
    default:
      return "default";
  }
};

// Format role for display
const formatRole = (role) => {
  if (!role) return "Unknown";
  return role
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Available role filter options
const ROLE_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "model", label: "Models" },
  { value: "client", label: "Clients" },
  { value: "account manager", label: "Account Managers" },
  { value: "admin", label: "Admins" },
  { value: "super admin", label: "Super Admins" },
];

// Available verified filter options
const VERIFIED_OPTIONS = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
];

// Available status filter options
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];

function AllUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [rawUsers, setRawUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const { deleteUser, deleting, error: deleteError, clearError } = useDeleteUser();

  // Check if any filter is active
  const hasActiveFilters = roleFilter !== "all" || verifiedFilter !== "all" || statusFilter !== "all" || locationFilter !== "all";

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setRoleFilter("all");
    setVerifiedFilter("all");
    setStatusFilter("all");
    setLocationFilter("all");
  }, []);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);
  const [changeNameDialogOpen, setChangeNameDialogOpen] = useState(false);
  const [changeLocationDialogOpen, setChangeLocationDialogOpen] = useState(false);

  // Selected user for dialogs
  const [selectedUser, setSelectedUser] = useState(null);

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

  // Get models from filtered users (only models can be verified)
  const allModels = filteredUsers.filter((u) => u.role === "model");
  const unverifiedModels = allModels.filter((u) => u.verified !== true);
  const verifiedModels = allModels.filter((u) => u.verified === true);

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

  // Handle select all models
  const handleSelectAllModels = useCallback(() => {
    if (selectedModels.length === allModels.length) {
      setSelectedModels([]);
    } else {
      setSelectedModels(allModels.map((m) => m.uid));
    }
  }, [selectedModels.length, allModels]);

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
      const modelsToEmail = rawUsers.filter((u) => selectedUnverified.includes(u.uid));
      modelsToEmail.forEach((model) => {
        if (model.email) {
          sendVerificationEmail(model.email, model.name || "Model").catch((err) =>
            console.warn("Failed to send verification email:", err)
          );
        }
      });

      // Update local state
      setRawUsers((prev) =>
        prev.map((u) =>
          selectedUnverified.includes(u.uid) ? { ...u, verified: true } : u
        )
      );
      setSelectedModels([]);
      setSuccessMessage(`${selectedUnverified.length} model${selectedUnverified.length > 1 ? "s" : ""} verified successfully`);
    } catch (error) {
      console.error("Error bulk verifying models:", error);
    } finally {
      setVerifying(false);
    }
  }, [selectedUnverified, rawUsers]);

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
      const modelsToEmail = rawUsers.filter((u) => selectedVerified.includes(u.uid));
      modelsToEmail.forEach((model) => {
        if (model.email) {
          sendUnverificationEmail(model.email, model.name || "Model").catch((err) =>
            console.warn("Failed to send unverification email:", err)
          );
        }
      });

      // Update local state
      setRawUsers((prev) =>
        prev.map((u) =>
          selectedVerified.includes(u.uid) ? { ...u, verified: false } : u
        )
      );
      setSelectedModels([]);
      setSuccessMessage(`${selectedVerified.length} model${selectedVerified.length > 1 ? "s" : ""} unverified successfully`);
    } catch (error) {
      console.error("Error bulk unverifying models:", error);
    } finally {
      setVerifying(false);
    }
  }, [selectedVerified, rawUsers]);

  // Individual verify/unverify toggle handler
  const handleToggleVerification = useCallback(async (user) => {
    const newVerified = !user.verified;
    try {
      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { verified: newVerified });

      // Send appropriate email
      if (user.email) {
        if (newVerified) {
          sendVerificationEmail(user.email, user.name || "Model").catch((err) =>
            console.warn("Failed to send verification email:", err)
          );
        } else {
          sendUnverificationEmail(user.email, user.name || "Model").catch((err) =>
            console.warn("Failed to send unverification email:", err)
          );
        }
      }

      // Update local state
      setRawUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid ? { ...u, verified: newVerified } : u
        )
      );
      setSuccessMessage(`${user.name || "Model"} ${newVerified ? "verified" : "unverified"} successfully`);
    } catch (error) {
      console.error("Error toggling verification:", error);
    }
  }, []);

  // Handle delete click
  const handleDeleteClick = useCallback((user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedUser) return;

    const result = await deleteUser(selectedUser.uid, selectedUser);
    if (result.success) {
      setRawUsers((prev) => prev.filter((u) => u.uid !== selectedUser.uid));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setSuccessMessage("User deleted successfully");
    }
  }, [selectedUser, deleteUser]);

  // Handle reset password click
  const handleResetPasswordClick = useCallback((user) => {
    setSelectedUser(user);
    setResetPasswordError(null);
    setResetPasswordDialogOpen(true);
  }, []);

  // Handle reset password confirmation
  const handleResetPasswordConfirm = useCallback(async (newPassword, sendEmail) => {
    if (!selectedUser) return;

    setResetPasswordLoading(true);
    setResetPasswordError(null);

    try {
      await adminResetUserPassword(selectedUser.uid, newPassword, sendEmail);
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setSuccessMessage(`Password reset successfully${sendEmail ? " and email sent" : ""}`);
    } catch (err) {
      setResetPasswordError(err.message || "Failed to reset password");
    } finally {
      setResetPasswordLoading(false);
    }
  }, [selectedUser]);

  // Handle change email click
  const handleChangeEmailClick = useCallback((user) => {
    setSelectedUser(user);
    setChangeEmailError(null);
    setChangeEmailDialogOpen(true);
  }, []);

  // Handle change email confirmation
  const handleChangeEmailConfirm = useCallback(async (newEmail) => {
    if (!selectedUser) return;

    setChangeEmailLoading(true);
    setChangeEmailError(null);

    try {
      await adminUpdateUserEmail(selectedUser.uid, newEmail);
      // Update local state
      setRawUsers((prev) =>
        prev.map((u) => (u.uid === selectedUser.uid ? { ...u, email: newEmail } : u))
      );
      setChangeEmailDialogOpen(false);
      setSelectedUser(null);
      setSuccessMessage("Email updated successfully");
    } catch (err) {
      setChangeEmailError(err.message || "Failed to update email");
    } finally {
      setChangeEmailLoading(false);
    }
  }, [selectedUser]);

  // Handle change name click
  const handleChangeNameClick = useCallback((user) => {
    setSelectedUser(user);
    setChangeNameError(null);
    setChangeNameDialogOpen(true);
  }, []);

  // Handle change name confirmation
  const handleChangeNameConfirm = useCallback(async (firstName, lastName) => {
    if (!selectedUser) return;

    setChangeNameLoading(true);
    setChangeNameError(null);

    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", selectedUser.uid), {
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
        description: `Updated name for user: ${selectedUser.email}`,
        details: {
          userUid: selectedUser.uid,
          userEmail: selectedUser.email,
          oldName: `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim(),
          newName: `${firstName} ${lastName}`.trim(),
        },
      });

      // Update local state
      const newName = `${firstName} ${lastName}`.trim();
      setRawUsers((prev) =>
        prev.map((u) =>
          u.uid === selectedUser.uid ? { ...u, firstName, lastName, name: newName } : u
        )
      );
      setChangeNameDialogOpen(false);
      setSelectedUser(null);
      setSuccessMessage("Name updated successfully");
    } catch (err) {
      setChangeNameError(err.message || "Failed to update name");
    } finally {
      setChangeNameLoading(false);
    }
  }, [selectedUser, currentUser]);

  // Handle change location click
  const handleChangeLocationClick = useCallback((user) => {
    setSelectedUser(user);
    setChangeLocationError(null);
    setChangeLocationDialogOpen(true);
  }, []);

  // Handle change location confirmation
  const handleChangeLocationConfirm = useCallback(async (locationData) => {
    if (!selectedUser) return;

    setChangeLocationLoading(true);
    setChangeLocationError(null);

    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", selectedUser.uid), {
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
        description: `Updated location for user: ${selectedUser.email}`,
        details: {
          userUid: selectedUser.uid,
          userEmail: selectedUser.email,
          oldLocation: selectedUser.location,
          newLocation: locationData.location,
        },
      });

      // Update local state
      setRawUsers((prev) =>
        prev.map((u) =>
          u.uid === selectedUser.uid
            ? {
                ...u,
                location: locationData.location,
                city: locationData.city,
                county: locationData.county,
                state: locationData.state,
                country: locationData.country,
              }
            : u
        )
      );
      setChangeLocationDialogOpen(false);
      setSelectedUser(null);
      setSuccessMessage("Location updated successfully");
    } catch (err) {
      setChangeLocationError(err.message || "Failed to update location");
    } finally {
      setChangeLocationLoading(false);
    }
  }, [selectedUser, currentUser]);

  // Close dialogs
  const handleCloseDeleteDialog = useCallback(() => {
    if (!deleting) {
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      clearError();
    }
  }, [deleting, clearError]);

  const handleCloseResetPasswordDialog = useCallback(() => {
    if (!resetPasswordLoading) {
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setResetPasswordError(null);
    }
  }, [resetPasswordLoading]);

  const handleCloseChangeEmailDialog = useCallback(() => {
    if (!changeEmailLoading) {
      setChangeEmailDialogOpen(false);
      setSelectedUser(null);
      setChangeEmailError(null);
    }
  }, [changeEmailLoading]);

  const handleCloseChangeNameDialog = useCallback(() => {
    if (!changeNameLoading) {
      setChangeNameDialogOpen(false);
      setSelectedUser(null);
      setChangeNameError(null);
    }
  }, [changeNameLoading]);

  const handleCloseChangeLocationDialog = useCallback(() => {
    if (!changeLocationLoading) {
      setChangeLocationDialogOpen(false);
      setSelectedUser(null);
      setChangeLocationError(null);
    }
  }, [changeLocationLoading]);

  // Fetch all users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const db = getFirestore();
      const snapshot = await getDocs(collection(db, "users"));

      const usersList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: data.email || "",
          role: data.role || "",
          location: data.location || "",
          city: data.city || "",
          county: data.county || "",
          state: data.state || "",
          country: data.country || "",
          status: data.status || "",
          profileAvatar: data.profileAvatar || "",
          createdAt: data.createdAt || null,
          verified: data.verified,
        };
      });

      setRawUsers(usersList);
    };

    fetchUsers();
  }, []);

  // Get unique locations for filter dropdown
  const uniqueLocations = [...new Set(rawUsers.map((u) => u.location).filter(Boolean))].sort();

  // Apply all filters
  useEffect(() => {
    let filtered = rawUsers;

    // Filter by role/account type
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Filter by verified status
    if (verifiedFilter !== "all") {
      if (verifiedFilter === "verified") {
        filtered = filtered.filter((user) => user.verified === true);
      } else if (verifiedFilter === "unverified") {
        filtered = filtered.filter((user) => user.verified !== true);
      }
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Filter by location
    if (locationFilter !== "all") {
      filtered = filtered.filter((user) => user.location === locationFilter);
    }

    setFilteredUsers(filtered);
  }, [rawUsers, roleFilter, verifiedFilter, statusFilter, locationFilter]);

  // Update table data when filteredUsers changes
  useEffect(() => {
    setTableData({
      columns: [
        {
          Header: () => (
            <Checkbox
              checked={allModels.length > 0 && selectedModels.length === allModels.length}
              indeterminate={selectedModels.length > 0 && selectedModels.length < allModels.length}
              onChange={handleSelectAllModels}
              disabled={allModels.length === 0}
              size="small"
            />
          ),
          accessor: "select",
          width: "4%",
          Cell: ({ row }) => {
            const { uid, role } = row.original;
            // Only show checkbox for models
            if (role !== "model") return null;
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
            const { uid, name, role } = row.original;
            if (role === "model") {
              return (
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  sx={{
                    color: "#1976d2",
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={() => navigate(`/admin/model/${uid}/settings`)}
                >
                  {name || "—"}
                </MDTypography>
              );
            }
            return name || "—";
          },
        },
        { Header: "Email", accessor: "email" },
        {
          Header: "Type",
          accessor: "role",
          Cell: ({ value }) => (
            <Chip
              label={formatRole(value)}
              color={getRoleColor(value)}
              size="small"
              variant="outlined"
            />
          ),
        },
        {
          Header: "Verified",
          accessor: "verified",
          width: "8%",
          Cell: ({ row }) => {
            const { role, verified } = row.original;
            if (role !== "model") return "—";
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
        { Header: "Location", accessor: "city", Cell: ({ value }) => value || "—" },
        { Header: "Status", accessor: "status", width: "8%" },
        {
          Header: "Created",
          accessor: "createdAt",
          sortType: (rowA, rowB) => {
            const a = rowA.original.createdAt ? new Date(rowA.original.createdAt).getTime() : 0;
            const b = rowB.original.createdAt ? new Date(rowB.original.createdAt).getTime() : 0;
            return a - b;
          },
          Cell: ({ value }) => {
            if (!value) return "—";
            const date = new Date(value);
            return date.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          },
        },
        {
          Header: "Actions",
          accessor: "actions",
          width: "20%",
          Cell: ({ row }) => {
            const user = row.original;
            const isSuperAdmin = user.role === "super admin";
            const isCurrentUser = user.uid === currentUser?.uid;
            const isModel = user.role === "model";

            return (
              <MDBox display="flex" gap={0.5}>
                {isModel && (
                  <Tooltip title={user.verified ? "Unverify Model" : "Verify Model"}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleVerification(user)}
                      sx={{ color: user.verified ? "#ed6c02" : "#2e7d32" }}
                    >
                      <Icon fontSize="small">{user.verified ? "gpp_maybe" : "verified_user"}</Icon>
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Reset Password">
                  <IconButton
                    size="small"
                    onClick={() => handleResetPasswordClick(user)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">lock_reset</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Email">
                  <IconButton
                    size="small"
                    onClick={() => handleChangeEmailClick(user)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">email</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Name">
                  <IconButton
                    size="small"
                    onClick={() => handleChangeNameClick(user)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">badge</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Location">
                  <IconButton
                    size="small"
                    onClick={() => handleChangeLocationClick(user)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">location_on</Icon>
                  </IconButton>
                </Tooltip>
                {!isSuperAdmin && !isCurrentUser && (
                  <Tooltip title="Delete User">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(user)}
                      sx={{ color: "#d32f2f" }}
                    >
                      <Icon fontSize="small">delete</Icon>
                    </IconButton>
                  </Tooltip>
                )}
              </MDBox>
            );
          },
        },
      ],
      rows: filteredUsers,
    });
  }, [
    filteredUsers,
    handleDeleteClick,
    handleResetPasswordClick,
    handleChangeEmailClick,
    handleChangeNameClick,
    handleChangeLocationClick,
    handleToggleVerification,
    currentUser,
    selectedModels,
    allModels,
    handleSelectAllModels,
    handleSelectModel,
    navigate,
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
                  All Users
                </MDTypography>
                <MDTypography variant="button" color="text">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
                  {unverifiedModels.length > 0 && ` • ${unverifiedModels.length} unverified model${unverifiedModels.length > 1 ? "s" : ""}`}
                </MDTypography>
              </MDBox>
              <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap">
                {selectedModels.length > 0 && (
                  <MDBox display="flex" alignItems="center" gap={2}>
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
                  </MDBox>
                )}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Account Type</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Account Type"
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Verified</InputLabel>
                  <Select
                    value={verifiedFilter}
                    label="Verified"
                    onChange={(e) => setVerifiedFilter(e.target.value)}
                  >
                    {VERIFIED_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={locationFilter}
                    label="Location"
                    onChange={(e) => setLocationFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Locations</MenuItem>
                    {uniqueLocations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {hasActiveFilters && (
                  <MDButton
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={handleResetFilters}
                    startIcon={<Icon>filter_alt_off</Icon>}
                  >
                    Reset Filters
                  </MDButton>
                )}
              </MDBox>
            </MDBox>
          </MDBox>
          <DataTable table={tableData} canSearch entriesPerPage={{ defaultValue: 25 }} />
        </Card>
      </MDBox>
      <Footer />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteConfirm}
        user={selectedUser}
        loading={deleting}
        error={deleteError}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onClose={handleCloseResetPasswordDialog}
        onConfirm={handleResetPasswordConfirm}
        user={selectedUser}
        loading={resetPasswordLoading}
        error={resetPasswordError}
      />

      {/* Change Email Dialog */}
      <ChangeEmailDialog
        open={changeEmailDialogOpen}
        onClose={handleCloseChangeEmailDialog}
        onConfirm={handleChangeEmailConfirm}
        user={selectedUser}
        loading={changeEmailLoading}
        error={changeEmailError}
      />

      {/* Change Name Dialog */}
      <ChangeNameDialog
        open={changeNameDialogOpen}
        onClose={handleCloseChangeNameDialog}
        onConfirm={handleChangeNameConfirm}
        user={selectedUser}
        loading={changeNameLoading}
        error={changeNameError}
      />

      {/* Change Location Dialog */}
      <ChangeLocationDialog
        open={changeLocationDialogOpen}
        onClose={handleCloseChangeLocationDialog}
        onConfirm={handleChangeLocationConfirm}
        user={selectedUser}
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

export default AllUsers;
