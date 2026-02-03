import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getOrganisationById, getOrganisationUsers } from "utils/organisations";

// MUI and MD components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

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
import { adminResetUserPassword, adminUpdateUserEmail } from "utils/api";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";
import { useAuth } from "context/AuthContext";

function OrganisationDetail() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [organisation, setOrganisation] = useState(null);
  const [users, setUsers] = useState([]);
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const { deleteUser, deleting, error: deleteError, clearError } = useDeleteUser();

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);
  const [changeNameDialogOpen, setChangeNameDialogOpen] = useState(false);
  const [changeLocationDialogOpen, setChangeLocationDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Loading and error states
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState(null);
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState(null);
  const [changeNameLoading, setChangeNameLoading] = useState(false);
  const [changeNameError, setChangeNameError] = useState(null);
  const [changeLocationLoading, setChangeLocationLoading] = useState(false);
  const [changeLocationError, setChangeLocationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Determine user role
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "super admin";

  // Action handlers
  const handleDeleteClick = useCallback((user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedUser) return;
    const result = await deleteUser(selectedUser.uid, selectedUser);
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.uid !== selectedUser.uid));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setSuccessMessage("User deleted successfully");
    }
  }, [selectedUser, deleteUser]);

  const handleResetPasswordClick = useCallback((user) => {
    setSelectedUser(user);
    setResetPasswordError(null);
    setResetPasswordDialogOpen(true);
  }, []);

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

  const handleChangeEmailClick = useCallback((user) => {
    setSelectedUser(user);
    setChangeEmailError(null);
    setChangeEmailDialogOpen(true);
  }, []);

  const handleChangeEmailConfirm = useCallback(async (newEmail) => {
    if (!selectedUser) return;
    setChangeEmailLoading(true);
    setChangeEmailError(null);
    try {
      await adminUpdateUserEmail(selectedUser.uid, newEmail);
      setUsers((prev) =>
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

  const handleChangeNameClick = useCallback((user) => {
    setSelectedUser(user);
    setChangeNameError(null);
    setChangeNameDialogOpen(true);
  }, []);

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
      const newName = `${firstName} ${lastName}`.trim();
      setUsers((prev) =>
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

  const handleChangeLocationClick = useCallback((user) => {
    setSelectedUser(user);
    setChangeLocationError(null);
    setChangeLocationDialogOpen(true);
  }, []);

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
      setUsers((prev) =>
        prev.map((u) => (u.uid === selectedUser.uid ? { ...u, ...locationData } : u))
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

  // Close handlers
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

  // Fetch organisation data
  useEffect(() => {
    const fetchOrganisation = async () => {
      if (!orgId) return;

      setLoading(true);

      try {
        // Fetch organisation from organisations collection
        const orgData = await getOrganisationById(orgId);

        if (!orgData) {
          console.error("Organisation not found");
          setLoading(false);
          return;
        }

        // Fetch users for this organisation
        const orgUsers = await getOrganisationUsers(orgId);

        // Format users with additional fields
        const formattedUsers = orgUsers.map((userData) => ({
          uid: userData.uid,
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
          email: userData.email || "",
          phone: userData.phone || "",
          role: userData.role || "",
          location: userData.location || "",
          city: userData.city || "",
          county: userData.county || "",
          state: userData.state || "",
          country: userData.country || "",
          status: userData.status || "",
          profileAvatar: userData.profileAvatar || "",
        }));

        setOrganisation(orgData);
        setUsers(formattedUsers);
      } catch (error) {
        console.error("Error fetching organisation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisation();
  }, [orgId]);

  // Update table data when users change
  useEffect(() => {
    setTableData({
      columns: [
        { Header: "Name", accessor: "name", Cell: ({ row }) => row.original.name || "—" },
        { Header: "Email", accessor: "email" },
        {
          Header: "Role",
          accessor: "role",
          width: "12%",
          Cell: ({ row }) => {
            const role = row.original.role;
            const colorMap = {
              client: "info",
              "account manager": "warning",
            };
            return (
              <Chip
                label={role}
                size="small"
                color={colorMap[role] || "default"}
                sx={{ textTransform: "capitalize" }}
              />
            );
          },
        },
        { Header: "Phone", accessor: "phone" },
        { Header: "Location", accessor: "location" },
        {
          Header: "Actions",
          accessor: "actions",
          width: "18%",
          Cell: ({ row }) => {
            const user = row.original;
            return (
              <MDBox display="flex" gap={0.5}>
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
                {isAdmin && (
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
      rows: users,
    });
  }, [
    users,
    isAdmin,
    handleDeleteClick,
    handleResetPasswordClick,
    handleChangeEmailClick,
    handleChangeNameClick,
    handleChangeLocationClick,
  ]);

  // Get role badge color
  const getRoleColor = (role) => {
    const colorMap = {
      client: "info",
      "account manager": "warning",
    };
    return colorMap[role] || "default";
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        {/* Back button */}
        <MDBox mb={3}>
          <MDButton
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => navigate("/admin/organisations")}
          >
            <Icon sx={{ mr: 1 }}>arrow_back</Icon>
            Back to Organisations
          </MDButton>
        </MDBox>

        {/* Organisation Details Card */}
        <Card sx={{ mb: 3 }}>
          <MDBox p={3}>
            <MDBox display="flex" alignItems="center" mb={2}>
              <Icon fontSize="large" sx={{ mr: 2, color: "info.main" }}>
                business
              </Icon>
              <MDTypography variant="h4" fontWeight="medium">
                {organisation?.companyName || "Loading..."}
              </MDTypography>
            </MDBox>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Company Number
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="medium">
                    {organisation?.companyNumber || "—"}
                  </MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12} md={6}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Year Established
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="medium">
                    {organisation?.yearEstablished || "—"}
                  </MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12} md={6}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Registered Address
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="medium">
                    {organisation?.registeredAddress || "—"}
                  </MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12} md={6}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    VAT Number
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="medium">
                    {organisation?.vatNumber || "—"}
                  </MDTypography>
                </MDBox>
              </Grid>
            </Grid>
          </MDBox>
        </Card>

        {/* Users Table */}
        <Card>
          <MDBox p={3} lineHeight={1}>
            <MDTypography variant="h5" fontWeight="medium">
              Users
            </MDTypography>
            <MDTypography variant="button" color="text">
              {loading
                ? "Loading..."
                : `${users.length} user${users.length !== 1 ? "s" : ""} in this organisation`}
            </MDTypography>
          </MDBox>
          <DataTable table={tableData} canSearch entriesPerPage={{ defaultValue: 25 }} />
        </Card>
      </MDBox>
      <Footer />

      {/* Dialogs */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteConfirm}
        user={selectedUser}
        loading={deleting}
        error={deleteError}
      />
      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onClose={handleCloseResetPasswordDialog}
        onConfirm={handleResetPasswordConfirm}
        user={selectedUser}
        loading={resetPasswordLoading}
        error={resetPasswordError}
      />
      <ChangeEmailDialog
        open={changeEmailDialogOpen}
        onClose={handleCloseChangeEmailDialog}
        onConfirm={handleChangeEmailConfirm}
        user={selectedUser}
        loading={changeEmailLoading}
        error={changeEmailError}
      />
      <ChangeNameDialog
        open={changeNameDialogOpen}
        onClose={handleCloseChangeNameDialog}
        onConfirm={handleChangeNameConfirm}
        user={selectedUser}
        loading={changeNameLoading}
        error={changeNameError}
      />
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
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default OrganisationDetail;
