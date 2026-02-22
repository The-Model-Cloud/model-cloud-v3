import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, updateDoc, Timestamp } from "firebase/firestore";
import {
  getOrganisationById,
  getOrganisationUsers,
  updateOrganisation,
  ORG_TIERS,
  TIER_CONFIG,
  getPricingTiers,
  isOrganisationExpired,
} from "utils/organisations";

// MUI components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard components
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

  // Pricing tiers from Firestore
  const [pricingTiers, setPricingTiers] = useState(TIER_CONFIG);

  // Edit organisation dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editData, setEditData] = useState({
    companyName: "",
    companyNumber: "",
    registeredAddress: "",
    vatNumber: "",
    tier: "starter",
    licenceLimit: 5,
    expiryDate: "",
    status: "active",
  });

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

  // Format date for input
  const formatDateForInput = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString().split("T")[0];
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Open edit dialog
  const handleEditClick = () => {
    if (organisation) {
      setEditData({
        companyName: organisation.companyName || "",
        companyNumber: organisation.companyNumber || "",
        registeredAddress: organisation.registeredAddress || "",
        vatNumber: organisation.vatNumber || "",
        tier: organisation.tier || "starter",
        licenceLimit: organisation.licenceLimit || 5,
        expiryDate: formatDateForInput(organisation.expiryDate),
        status: organisation.status || "active",
      });
      setEditError("");
      setEditDialogOpen(true);
    }
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!editData.companyName.trim()) {
      setEditError("Company name is required");
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      const updates = {
        companyName: editData.companyName.trim(),
        companyNumber: editData.companyNumber.trim(),
        registeredAddress: editData.registeredAddress.trim(),
        vatNumber: editData.vatNumber.trim(),
        tier: editData.tier,
        licenceLimit: parseInt(editData.licenceLimit, 10) || 5,
        expiryDate: editData.expiryDate ? Timestamp.fromDate(new Date(editData.expiryDate)) : null,
        status: editData.status,
      };

      await updateOrganisation(orgId, updates);

      // Update local state
      setOrganisation((prev) => ({ ...prev, ...updates }));
      setEditDialogOpen(false);
      setSuccessMessage("Organisation settings updated successfully");
    } catch (error) {
      console.error("Error updating organisation:", error);
      setEditError(error.message || "Failed to update organisation");
    } finally {
      setEditLoading(false);
    }
  };

  // Fetch pricing tiers on mount
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const tiers = await getPricingTiers();
        setPricingTiers(tiers);
      } catch (error) {
        console.error("Error fetching pricing tiers:", error);
      }
    };
    fetchTiers();
  }, []);

  // Handle tier change in edit dialog
  const handleTierChange = (tier) => {
    const tierConfig = pricingTiers[tier] || pricingTiers.starter;
    setEditData({
      ...editData,
      tier,
      licenceLimit: tier === "custom" ? editData.licenceLimit : (tierConfig?.defaultLicences || 5),
    });
  };

  // Action handlers for users
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
        const orgData = await getOrganisationById(orgId);

        if (!orgData) {
          console.error("Organisation not found");
          setLoading(false);
          return;
        }

        const orgUsers = await getOrganisationUsers(orgId);

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

  // Get tier chip
  const getTierChip = (tier) => {
    const config = pricingTiers[tier] || pricingTiers.starter || TIER_CONFIG.starter;
    return (
      <Chip
        label={config.name}
        size="small"
        color={config.color}
      />
    );
  };

  // Get status chip
  const getStatusChip = () => {
    if (!organisation) return null;
    if (isOrganisationExpired(organisation)) {
      return <Chip label="Expired" size="small" color="error" />;
    }
    if (organisation.status === "suspended") {
      return <Chip label="Suspended" size="small" color="warning" />;
    }
    return <Chip label="Active" size="small" color="success" />;
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
            <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <MDBox display="flex" alignItems="center">
                <Icon fontSize="large" sx={{ mr: 2, color: "info.main" }}>
                  business
                </Icon>
                <MDBox>
                  <MDTypography variant="h4" fontWeight="medium">
                    {organisation?.companyName || "Loading..."}
                  </MDTypography>
                  <MDBox display="flex" alignItems="center" gap={1} mt={0.5}>
                    {organisation && getTierChip(organisation.tier)}
                    {getStatusChip()}
                  </MDBox>
                </MDBox>
              </MDBox>
              {isAdmin && organisation && (
                <MDButton
                  variant="outlined"
                  color="info"
                  size="small"
                  startIcon={<Icon>edit</Icon>}
                  onClick={handleEditClick}
                >
                  Edit Settings
                </MDButton>
              )}
            </MDBox>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              {/* Company Details */}
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
                    VAT Number
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="medium">
                    {organisation?.vatNumber || "—"}
                  </MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Registered Address
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="medium">
                    {organisation?.registeredAddress || "—"}
                  </MDTypography>
                </MDBox>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Subscription Details */}
              <Grid item xs={12} md={4}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Tier
                  </MDTypography>
                  <MDBox mt={0.5}>
                    {organisation && getTierChip(organisation.tier)}
                  </MDBox>
                </MDBox>
              </Grid>
              <Grid item xs={12} md={4}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Licences
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="medium">
                    {users.length} / {organisation?.licenceLimit || "∞"} used
                  </MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12} md={4}>
                <MDBox mb={2}>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Expiry Date
                  </MDTypography>
                  <MDTypography
                    variant="body2"
                    fontWeight="medium"
                    color={isOrganisationExpired(organisation) ? "error" : "text"}
                  >
                    {formatDate(organisation?.expiryDate)}
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

      {/* Edit Organisation Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !editLoading && setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="info">settings</Icon>
            <MDTypography variant="h5">Edit Organisation Settings</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Name"
                value={editData.companyName}
                onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                fullWidth
                required
                disabled={editLoading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Number"
                value={editData.companyNumber}
                onChange={(e) => setEditData({ ...editData, companyNumber: e.target.value })}
                fullWidth
                disabled={editLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Registered Address"
                value={editData.registeredAddress}
                onChange={(e) => setEditData({ ...editData, registeredAddress: e.target.value })}
                fullWidth
                multiline
                rows={2}
                disabled={editLoading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="VAT Number"
                value={editData.vatNumber}
                onChange={(e) => setEditData({ ...editData, vatNumber: e.target.value })}
                fullWidth
                disabled={editLoading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Status"
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                fullWidth
                disabled={editLoading}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <MDTypography variant="button" fontWeight="medium" color="text">
                Subscription Settings
              </MDTypography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Tier"
                value={editData.tier}
                onChange={(e) => handleTierChange(e.target.value)}
                fullWidth
                disabled={editLoading}
              >
                {Object.entries(pricingTiers).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <MDBox>
                      <MDTypography variant="button" fontWeight="medium">
                        {config.name}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {config.description}
                        {key !== "custom" && ` (default: ${config.defaultLicences} seats)`}
                      </MDTypography>
                    </MDBox>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Licence Limit (Seats)"
                type="number"
                value={editData.licenceLimit}
                onChange={(e) => setEditData({ ...editData, licenceLimit: e.target.value })}
                fullWidth
                disabled={editLoading}
                inputProps={{ min: 1 }}
                helperText={
                  editData.tier === "custom"
                    ? `Currently using ${users.length} of custom seats`
                    : `Currently using ${users.length}. Default for ${pricingTiers[editData.tier]?.name || "Starter"}: ${pricingTiers[editData.tier]?.defaultLicences || 5}`
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Expiry Date"
                type="date"
                value={editData.expiryDate}
                onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })}
                fullWidth
                disabled={editLoading}
                InputLabelProps={{ shrink: true }}
                helperText="Leave blank for no expiry"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setEditDialogOpen(false)}
            disabled={editLoading}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleEditSave}
            disabled={editLoading || !editData.companyName.trim()}
            startIcon={editLoading ? <CircularProgress size={16} color="inherit" /> : <Icon>save</Icon>}
          >
            {editLoading ? "Saving..." : "Save Changes"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* User Dialogs */}
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
