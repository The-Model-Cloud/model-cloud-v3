import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, getFirestore, query, where, doc, updateDoc } from "firebase/firestore";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
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
import { adminResetUserPassword, adminUpdateUserEmail } from "utils/api";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";
import { useAuth } from "context/AuthContext";

function AllAccountManagers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [rawUsers, setRawUsers] = useState([]);
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

  // Action handlers
  const handleDeleteClick = useCallback((user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedUser) return;
    const result = await deleteUser(selectedUser.uid, selectedUser);
    if (result.success) {
      setRawUsers((prev) => prev.filter((u) => u.uid !== selectedUser.uid));
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setSuccessMessage("Account manager deleted successfully");
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
        description: `Updated name for account manager: ${selectedUser.email}`,
        details: {
          userUid: selectedUser.uid,
          userEmail: selectedUser.email,
          oldName: `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim(),
          newName: `${firstName} ${lastName}`.trim(),
        },
      });
      const newName = `${firstName} ${lastName}`.trim();
      setRawUsers((prev) =>
        prev.map((u) => u.uid === selectedUser.uid ? { ...u, firstName, lastName, name: newName } : u)
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
        description: `Updated location for account manager: ${selectedUser.email}`,
        details: {
          userUid: selectedUser.uid,
          userEmail: selectedUser.email,
          oldLocation: selectedUser.location,
          newLocation: locationData.location,
        },
      });
      setRawUsers((prev) =>
        prev.map((u) => u.uid === selectedUser.uid ? { ...u, ...locationData } : u)
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
    if (!deleting) { setDeleteDialogOpen(false); setSelectedUser(null); clearError(); }
  }, [deleting, clearError]);

  const handleCloseResetPasswordDialog = useCallback(() => {
    if (!resetPasswordLoading) { setResetPasswordDialogOpen(false); setSelectedUser(null); setResetPasswordError(null); }
  }, [resetPasswordLoading]);

  const handleCloseChangeEmailDialog = useCallback(() => {
    if (!changeEmailLoading) { setChangeEmailDialogOpen(false); setSelectedUser(null); setChangeEmailError(null); }
  }, [changeEmailLoading]);

  const handleCloseChangeNameDialog = useCallback(() => {
    if (!changeNameLoading) { setChangeNameDialogOpen(false); setSelectedUser(null); setChangeNameError(null); }
  }, [changeNameLoading]);

  const handleCloseChangeLocationDialog = useCallback(() => {
    if (!changeLocationLoading) { setChangeLocationDialogOpen(false); setSelectedUser(null); setChangeLocationError(null); }
  }, [changeLocationLoading]);

  // Fetch account managers on mount
  useEffect(() => {
    const fetchAccountManagers = async () => {
      const db = getFirestore();
      const usersQuery = query(
        collection(db, "users"),
        where("role", "==", "account manager")
      );
      const snapshot = await getDocs(usersQuery);

      const usersList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: data.email || "",
          role: data.role || "account manager",
          company: data.company || "",
          phone: data.phone || "",
          location: data.location || "",
          city: data.city || "",
          county: data.county || "",
          state: data.state || "",
          country: data.country || "",
          status: data.status || "",
          profileAvatar: data.profileAvatar || "",
          createdAt: data.createdAt || null,
        };
      });

      setRawUsers(usersList);
    };

    fetchAccountManagers();
  }, []);

  // Update table data
  useEffect(() => {
    setTableData({
      columns: [
        {
          Header: "Name",
          accessor: "name",
          Cell: ({ row }) => {
            const { uid, name } = row.original;
            return (
              <MDTypography
                variant="button"
                fontWeight="regular"
                sx={{
                  color: "#1976d2",
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={() => navigate(`/admin/user/${uid}/settings`)}
              >
                {name || "—"}
              </MDTypography>
            );
          },
        },
        { Header: "Email", accessor: "email" },
        { Header: "Company", accessor: "company" },
        { Header: "Phone", accessor: "phone" },
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
          width: "18%",
          Cell: ({ row }) => {
            const user = row.original;
            return (
              <MDBox display="flex" gap={0.5}>
                <Tooltip title="Reset Password">
                  <IconButton size="small" onClick={() => handleResetPasswordClick(user)} sx={{ color: "#1976d2" }}>
                    <Icon fontSize="small">lock_reset</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Email">
                  <IconButton size="small" onClick={() => handleChangeEmailClick(user)} sx={{ color: "#1976d2" }}>
                    <Icon fontSize="small">email</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Name">
                  <IconButton size="small" onClick={() => handleChangeNameClick(user)} sx={{ color: "#1976d2" }}>
                    <Icon fontSize="small">badge</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Change Location">
                  <IconButton size="small" onClick={() => handleChangeLocationClick(user)} sx={{ color: "#1976d2" }}>
                    <Icon fontSize="small">location_on</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Account Manager">
                  <IconButton size="small" onClick={() => handleDeleteClick(user)} sx={{ color: "#d32f2f" }}>
                    <Icon fontSize="small">delete</Icon>
                  </IconButton>
                </Tooltip>
              </MDBox>
            );
          },
        },
      ],
      rows: rawUsers,
    });
  }, [rawUsers, handleDeleteClick, handleResetPasswordClick, handleChangeEmailClick, handleChangeNameClick, handleChangeLocationClick, navigate]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3} lineHeight={1}>
            <MDTypography variant="h5" fontWeight="medium">Account Managers</MDTypography>
            <MDTypography variant="button" color="text">
              {rawUsers.length} account manager{rawUsers.length !== 1 ? "s" : ""} found
            </MDTypography>
          </MDBox>
          <DataTable table={tableData} canSearch entriesPerPage={{ defaultValue: 25 }} />
        </Card>
      </MDBox>
      <Footer />

      <DeleteUserDialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} onConfirm={handleDeleteConfirm} user={selectedUser} loading={deleting} error={deleteError} />
      <ResetPasswordDialog open={resetPasswordDialogOpen} onClose={handleCloseResetPasswordDialog} onConfirm={handleResetPasswordConfirm} user={selectedUser} loading={resetPasswordLoading} error={resetPasswordError} />
      <ChangeEmailDialog open={changeEmailDialogOpen} onClose={handleCloseChangeEmailDialog} onConfirm={handleChangeEmailConfirm} user={selectedUser} loading={changeEmailLoading} error={changeEmailError} />
      <ChangeNameDialog open={changeNameDialogOpen} onClose={handleCloseChangeNameDialog} onConfirm={handleChangeNameConfirm} user={selectedUser} loading={changeNameLoading} error={changeNameError} />
      <ChangeLocationDialog open={changeLocationDialogOpen} onClose={handleCloseChangeLocationDialog} onConfirm={handleChangeLocationConfirm} user={selectedUser} loading={changeLocationLoading} error={changeLocationError} />

      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={() => setSuccessMessage("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSuccessMessage("")} severity="success" sx={{ width: "100%" }}>{successMessage}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default AllAccountManagers;
