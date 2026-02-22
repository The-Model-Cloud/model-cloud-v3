import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

// Firebase
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "config/firebase";

// Admin logging
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

// API functions
import { deleteUserAuth } from "utils/api";

// UI Components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import Icon from "@mui/material/Icon";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

// Protected organisations that should never be deleted
const PROTECTED_COMPANIES = ["The Model Cloud", "Storm Web Design Ltd"];

function CircularProgressWithLabel({ value, current, total }) {
  return (
    <Box position="relative" display="inline-flex" flexDirection="column" alignItems="center">
      <Box position="relative" display="inline-flex">
        <CircularProgress variant="determinate" value={value} size={80} color="error" />
        <Box
          top={0}
          left={0}
          bottom={0}
          right={0}
          position="absolute"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="caption" component="div" color="text.secondary">
            {`${Math.round(value)}%`}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" mt={1}>
        {current} of {total} deleted
      </Typography>
    </Box>
  );
}

export default function DeleteAllOrganisations() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [organisations, setOrganisations] = useState([]);
  const [protectedOrganisations, setProtectedOrganisations] = useState([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ deleted: 0, failed: 0, usersDeleted: 0 });
  const [completed, setCompleted] = useState(false);

  const allowedRoles = ["super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return;
    if (!user || !isAuthorised) {
      navigate("/dashboard");
    }
  }, [loading, user, isAuthorised, navigate]);

  // Fetch all organisations
  useEffect(() => {
    const fetchOrganisations = async () => {
      if (!isAuthorised) return;

      try {
        const snapshot = await getDocs(collection(db, "organisations"));
        const allOrganisations = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Separate protected organisations from deletable organisations
        const deletableOrganisations = allOrganisations.filter(
          (org) => !PROTECTED_COMPANIES.includes(org.companyName)
        );
        const protectedList = allOrganisations.filter((org) =>
          PROTECTED_COMPANIES.includes(org.companyName)
        );

        setOrganisations(deletableOrganisations);
        setProtectedOrganisations(protectedList);
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoadingOrganisations(false);
      }
    };

    fetchOrganisations();
  }, [isAuthorised]);

  const handleDelete = async () => {
    setConfirmModalOpen(false);
    setDeleting(true);
    setProgress(0);
    setCurrentCount(0);
    setResults([]);
    setStats({ deleted: 0, failed: 0, usersDeleted: 0 });
    setCompleted(false);

    const feedback = [];
    let deletedCount = 0;
    let failedCount = 0;
    let totalUsersDeleted = 0;

    // Log the action before starting
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.DELETE_ALL_ORGANISATIONS || "DELETE_ALL_ORGANISATIONS",
        description: `Started deletion of ${organisations.length} organisations`,
        details: {
          totalOrganisations: organisations.length,
          organisationIds: organisations.map((o) => o.id),
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    // Delete organisations one by one
    for (let i = 0; i < organisations.length; i++) {
      const org = organisations[i];
      let usersDeletedForOrg = 0;
      let userDeleteErrors = [];

      try {
        // First, find and delete all users belonging to this organisation
        const usersQuery = query(
          collection(db, "users"),
          where("organisationId", "==", org.id)
        );
        const usersSnapshot = await getDocs(usersQuery);

        // Delete each user in the organisation
        for (const userDoc of usersSnapshot.docs) {
          try {
            // Delete user document from Firestore
            await deleteDoc(doc(db, "users", userDoc.id));

            // Delete user from Firebase Authentication
            await deleteUserAuth(userDoc.id);

            usersDeletedForOrg++;
            totalUsersDeleted++;
          } catch (userError) {
            userDeleteErrors.push({
              uid: userDoc.id,
              error: userError.message,
            });
          }
        }

        // Delete the organisation document
        await deleteDoc(doc(db, "organisations", org.id));

        deletedCount++;
        feedback.push({
          id: org.id,
          companyName: org.companyName || "Unknown",
          tier: org.tier || "-",
          userCount: org.userCount || 0,
          usersDeleted: usersDeletedForOrg,
          status: "deleted",
          userErrors: userDeleteErrors.length > 0 ? userDeleteErrors : null,
        });
      } catch (error) {
        failedCount++;
        feedback.push({
          id: org.id,
          companyName: org.companyName || "Unknown",
          tier: org.tier || "-",
          userCount: org.userCount || 0,
          usersDeleted: usersDeletedForOrg,
          status: "failed",
          error: error.message,
        });
      }

      setCurrentCount(i + 1);
      setProgress(((i + 1) / organisations.length) * 100);
      setStats({ deleted: deletedCount, failed: failedCount, usersDeleted: totalUsersDeleted });
    }

    // Log completion
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.DELETE_ALL_ORGANISATIONS || "DELETE_ALL_ORGANISATIONS",
        description: `Completed deletion: ${deletedCount} orgs deleted, ${totalUsersDeleted} users deleted, ${failedCount} failed`,
        details: {
          totalOrganisations: organisations.length,
          deletedCount,
          failedCount,
          totalUsersDeleted,
          results: feedback,
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    setResults(feedback);
    setDeleting(false);
    setCompleted(true);
  };

  if (loading || loadingOrganisations) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox p={3} display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </MDBox>
      </DashboardLayout>
    );
  }

  if (!isAuthorised) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox p={3}>
          <Alert severity="error">You do not have permission to access this page.</Alert>
        </MDBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={4} pb={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" alignItems="center" mb={2}>
                  <Icon fontSize="large" color="error" sx={{ mr: 1 }}>
                    domain_disabled
                  </Icon>
                  <MDTypography variant="h4">Delete All Organisations</MDTypography>
                </MDBox>

                <MDTypography variant="body2" color="text" mb={3}>
                  This action will permanently delete all organisations and their associated users
                  from the system.
                  <strong style={{ color: "#d32f2f" }}> This action cannot be undone.</strong>
                </MDTypography>

                <Alert severity="error" sx={{ mb: 3 }}>
                  <strong>Warning:</strong> This will delete {organisations.length} organisations
                  and all their associated data including:
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Organisation documents</li>
                    <li>All users belonging to each organisation (Firestore + Auth)</li>
                    <li>Teams within each organisation</li>
                    <li>Organisation favourites and settings</li>
                  </ul>
                  <br />
                  <strong>Note:</strong> Images stored in Cloudinary will remain but will no longer
                  be linked to any organisation.
                </Alert>

                <MDBox display="flex" gap={2} alignItems="center" mb={3}>
                  <Chip
                    label={`${organisations.length} organisations to delete`}
                    color="error"
                    variant="outlined"
                    icon={<Icon>business</Icon>}
                  />
                  {protectedOrganisations.length > 0 && (
                    <Chip
                      label={`${protectedOrganisations.length} protected (will not be deleted)`}
                      color="success"
                      variant="outlined"
                      icon={<Icon>shield</Icon>}
                    />
                  )}
                </MDBox>

                {protectedOrganisations.length > 0 && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <strong>Protected Organisations:</strong> The following organisations and their
                    users will NOT be deleted:
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      {PROTECTED_COMPANIES.map((company) => (
                        <li key={company}>{company}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {!deleting && !completed && (
                  <MDButton
                    variant="gradient"
                    color="error"
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={organisations.length === 0}
                    startIcon={<Icon>delete_forever</Icon>}
                    size="large"
                  >
                    Delete All Organisations
                  </MDButton>
                )}

                {deleting && (
                  <MDBox textAlign="center" py={4}>
                    <CircularProgressWithLabel
                      value={progress}
                      current={currentCount}
                      total={organisations.length}
                    />
                    <MDTypography variant="body2" color="text" mt={2}>
                      Deleting organisations and users... Please do not close this page.
                    </MDTypography>
                  </MDBox>
                )}

                {completed && (
                  <Alert
                    severity={stats.failed > 0 ? "warning" : "success"}
                    sx={{ mb: 3 }}
                  >
                    Deletion completed: {stats.deleted} organisations deleted, {stats.usersDeleted}{" "}
                    users deleted, {stats.failed} failed
                  </Alert>
                )}
              </MDBox>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <Card sx={{ mt: 3 }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Deletion Results
                  </MDTypography>

                  <MDBox display="flex" gap={2} mb={3}>
                    <Chip
                      label={`${stats.deleted} Organisations Deleted`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${stats.usersDeleted} Users Deleted`}
                      color="info"
                      variant="outlined"
                    />
                    {stats.failed > 0 && (
                      <Chip label={`${stats.failed} Failed`} color="error" variant="outlined" />
                    )}
                  </MDBox>

                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Company Name</TableCell>
                          <TableCell>Tier</TableCell>
                          <TableCell>User Count</TableCell>
                          <TableCell>Users Deleted</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.map((res) => (
                          <TableRow key={res.id}>
                            <TableCell>{res.companyName}</TableCell>
                            <TableCell>{res.tier}</TableCell>
                            <TableCell>{res.userCount}</TableCell>
                            <TableCell>{res.usersDeleted}</TableCell>
                            <TableCell>
                              <Chip
                                label={res.status}
                                size="small"
                                color={res.status === "deleted" ? "success" : "error"}
                              />
                            </TableCell>
                            <TableCell>{res.error || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </MDBox>
              </Card>
            )}
          </Grid>
        </Grid>
      </MDBox>
      <Footer />

      {/* Confirmation Modal */}
      <Modal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
        <Box sx={modalStyle}>
          <MDTypography variant="h5" gutterBottom color="error">
            Confirm Deletion
          </MDTypography>
          <MDTypography variant="body2" color="text" mb={3}>
            Are you absolutely sure you want to delete <strong>{organisations.length}</strong>{" "}
            organisations and all their users? This action is <strong>permanent</strong> and cannot
            be undone.
            <br />
            <br />
            This action will be logged with your admin credentials.
          </MDTypography>
          <MDBox display="flex" justifyContent="flex-end" gap={2}>
            <MDButton
              variant="outlined"
              color="secondary"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </MDButton>
            <MDButton variant="gradient" color="error" onClick={handleDelete}>
              Confirm Delete All
            </MDButton>
          </MDBox>
        </Box>
      </Modal>
    </DashboardLayout>
  );
}
