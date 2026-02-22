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

export default function DeleteAllClients() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [protectedClients, setProtectedClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ deleted: 0, failed: 0 });
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

  // Fetch all clients
  useEffect(() => {
    const fetchClients = async () => {
      if (!isAuthorised) return;

      try {
        const q = query(collection(db, "users"), where("role", "==", "client"));
        const snapshot = await getDocs(q);
        const allClients = snapshot.docs.map((docSnap) => ({
          uid: docSnap.id,
          ...docSnap.data(),
        }));

        // Separate protected clients from deletable clients
        const deletableClients = allClients.filter(
          (client) => !PROTECTED_COMPANIES.includes(client.companyName)
        );
        const protectedList = allClients.filter((client) =>
          PROTECTED_COMPANIES.includes(client.companyName)
        );

        setClients(deletableClients);
        setProtectedClients(protectedList);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [isAuthorised]);

  const handleDelete = async () => {
    setConfirmModalOpen(false);
    setDeleting(true);
    setProgress(0);
    setCurrentCount(0);
    setResults([]);
    setStats({ deleted: 0, failed: 0 });
    setCompleted(false);

    const feedback = [];
    let deletedCount = 0;
    let failedCount = 0;

    // Log the action before starting
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.DELETE_ALL_CLIENTS,
        description: `Started deletion of ${clients.length} client accounts`,
        details: {
          totalClients: clients.length,
          clientUids: clients.map((c) => c.uid),
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    // Delete clients one by one
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];

      try {
        // Delete user document from Firestore
        await deleteDoc(doc(db, "users", client.uid));

        // Delete user from Firebase Authentication
        const authResult = await deleteUserAuth(client.uid);
        const authDeleted = authResult.success;
        const authNotFound = authResult.notFound;

        deletedCount++;
        feedback.push({
          uid: client.uid,
          name: `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.companyName || "Unknown",
          email: client.email || "No email",
          company: client.companyName || "-",
          status: "deleted",
          authDeleted: authDeleted,
          authNotFound: authNotFound,
        });
      } catch (error) {
        failedCount++;
        feedback.push({
          uid: client.uid,
          name: `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.companyName || "Unknown",
          email: client.email || "No email",
          company: client.companyName || "-",
          status: "failed",
          error: error.message,
        });
      }

      setCurrentCount(i + 1);
      setProgress(((i + 1) / clients.length) * 100);
      setStats({ deleted: deletedCount, failed: failedCount });
    }

    // Log completion
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.DELETE_ALL_CLIENTS,
        description: `Completed deletion: ${deletedCount} deleted, ${failedCount} failed`,
        details: {
          totalClients: clients.length,
          deletedCount,
          failedCount,
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

  if (loading || loadingClients) {
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
                    business_center
                  </Icon>
                  <MDTypography variant="h4">Delete All Clients</MDTypography>
                </MDBox>

                <MDTypography variant="body2" color="text" mb={3}>
                  This action will permanently delete all user accounts with the role
                  &quot;client&quot; from the system.
                  <strong style={{ color: "#d32f2f" }}> This action cannot be undone.</strong>
                </MDTypography>

                <Alert severity="error" sx={{ mb: 3 }}>
                  <strong>Warning:</strong> This will delete {clients.length} client accounts and
                  all their associated data including:
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Firestore user documents</li>
                    <li>Firebase Authentication accounts</li>
                    <li>Company information and profiles</li>
                    <li>Jobs created by these clients</li>
                    <li>Favourite lists and model selections</li>
                    <li>Messages and notifications</li>
                  </ul>
                  <br />
                  <strong>Note:</strong> Images stored in Cloudinary will remain but will no longer
                  be linked to any user.
                </Alert>

                <MDBox display="flex" gap={2} alignItems="center" mb={3}>
                  <Chip
                    label={`${clients.length} clients to delete`}
                    color="error"
                    variant="outlined"
                    icon={<Icon>business</Icon>}
                  />
                  {protectedClients.length > 0 && (
                    <Chip
                      label={`${protectedClients.length} protected (will not be deleted)`}
                      color="success"
                      variant="outlined"
                      icon={<Icon>shield</Icon>}
                    />
                  )}
                </MDBox>

                {protectedClients.length > 0 && (
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
                    disabled={clients.length === 0}
                    startIcon={<Icon>delete_forever</Icon>}
                    size="large"
                  >
                    Delete All Clients
                  </MDButton>
                )}

                {deleting && (
                  <MDBox textAlign="center" py={4}>
                    <CircularProgressWithLabel
                      value={progress}
                      current={currentCount}
                      total={clients.length}
                    />
                    <MDTypography variant="body2" color="text" mt={2}>
                      Deleting clients... Please do not close this page.
                    </MDTypography>
                  </MDBox>
                )}

                {completed && (
                  <Alert
                    severity={stats.failed > 0 ? "warning" : "success"}
                    sx={{ mb: 3 }}
                  >
                    Deletion completed: {stats.deleted} deleted, {stats.failed} failed
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
                      label={`${stats.deleted} Deleted`}
                      color="success"
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
                          <TableCell>Name</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Auth Deleted</TableCell>
                          <TableCell>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.map((res) => (
                          <TableRow key={res.uid}>
                            <TableCell>{res.name}</TableCell>
                            <TableCell>{res.company}</TableCell>
                            <TableCell>{res.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={res.status}
                                size="small"
                                color={res.status === "deleted" ? "success" : "error"}
                              />
                            </TableCell>
                            <TableCell>
                              {res.status === "deleted" ? (
                                <Chip
                                  label={res.authNotFound ? "Not found" : res.authDeleted ? "Yes" : "Failed"}
                                  size="small"
                                  color={res.authNotFound ? "warning" : res.authDeleted ? "success" : "error"}
                                />
                              ) : "-"}
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
            Are you absolutely sure you want to delete <strong>{clients.length}</strong> client
            accounts? This action is <strong>permanent</strong> and cannot be undone.
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
