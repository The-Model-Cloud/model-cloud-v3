import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

// API functions
import { getOrphanedAuthAccounts, deleteOrphanedAuthAccounts } from "utils/api";

// Admin logging
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

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

export default function DeleteOrphanedAuthAccounts() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [orphanedAccounts, setOrphanedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [scanError, setScanError] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ deleted: 0, failed: 0, skipped: 0 });
  const [completed, setCompleted] = useState(false);
  const [firestoreUserCount, setFirestoreUserCount] = useState(0);

  const allowedRoles = ["super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return;
    if (!user || !isAuthorised) {
      navigate("/dashboard");
    }
  }, [loading, user, isAuthorised, navigate]);

  // Fetch orphaned accounts
  const scanForOrphanedAccounts = async () => {
    setLoadingAccounts(true);
    setScanError(null);
    setCompleted(false);
    setResults([]);

    try {
      const result = await getOrphanedAuthAccounts();
      if (result.success) {
        setOrphanedAccounts(result.orphanedAccounts || []);
        setFirestoreUserCount(result.totalFirestoreUsers || 0);
      } else {
        setScanError(result.error || "Failed to scan for orphaned accounts");
      }
    } catch (error) {
      console.error("Error scanning for orphaned accounts:", error);
      setScanError(error.message || "Failed to scan for orphaned accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Initial scan on mount
  useEffect(() => {
    if (isAuthorised) {
      scanForOrphanedAccounts();
    }
  }, [isAuthorised]);

  const handleDelete = async () => {
    setConfirmModalOpen(false);
    setDeleting(true);
    setProgress(0);
    setCurrentCount(0);
    setResults([]);
    setStats({ deleted: 0, failed: 0, skipped: 0 });
    setCompleted(false);

    // Log the action before starting
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.DELETE_ORPHANED_AUTH_ACCOUNTS,
        description: `Started deletion of ${orphanedAccounts.length} orphaned auth accounts`,
        details: {
          totalOrphaned: orphanedAccounts.length,
          orphanedUids: orphanedAccounts.map((a) => a.uid),
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    // Delete in batches of 10 to show progress
    const batchSize = 10;
    const allUids = orphanedAccounts.map((a) => a.uid);
    const feedback = [];
    let deletedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < allUids.length; i += batchSize) {
      const batch = allUids.slice(i, i + batchSize);

      try {
        const result = await deleteOrphanedAuthAccounts(batch);

        if (result.success && result.results) {
          for (const res of result.results) {
            const accountInfo = orphanedAccounts.find((a) => a.uid === res.uid) || {};
            if (res.status === "deleted") {
              deletedCount++;
              feedback.push({
                uid: res.uid,
                email: res.email || accountInfo.email || "Unknown",
                displayName: res.displayName || accountInfo.displayName || "",
                status: "deleted",
              });
            } else if (res.status === "skipped") {
              skippedCount++;
              feedback.push({
                uid: res.uid,
                email: accountInfo.email || "Unknown",
                displayName: accountInfo.displayName || "",
                status: "skipped",
                error: res.message,
              });
            } else if (res.status === "not_found") {
              deletedCount++; // Count as success since it's already gone
              feedback.push({
                uid: res.uid,
                email: accountInfo.email || "Unknown",
                displayName: accountInfo.displayName || "",
                status: "not_found",
              });
            } else {
              failedCount++;
              feedback.push({
                uid: res.uid,
                email: accountInfo.email || "Unknown",
                displayName: accountInfo.displayName || "",
                status: "failed",
                error: res.message,
              });
            }
          }
        }
      } catch (error) {
        // Mark all in this batch as failed
        for (const uid of batch) {
          const accountInfo = orphanedAccounts.find((a) => a.uid === uid) || {};
          failedCount++;
          feedback.push({
            uid,
            email: accountInfo.email || "Unknown",
            displayName: accountInfo.displayName || "",
            status: "failed",
            error: error.message,
          });
        }
      }

      setCurrentCount(Math.min(i + batchSize, allUids.length));
      setProgress(((Math.min(i + batchSize, allUids.length)) / allUids.length) * 100);
      setStats({ deleted: deletedCount, failed: failedCount, skipped: skippedCount });
    }

    // Log completion
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.DELETE_ORPHANED_AUTH_ACCOUNTS,
        description: `Completed deletion: ${deletedCount} deleted, ${failedCount} failed, ${skippedCount} skipped`,
        details: {
          totalOrphaned: orphanedAccounts.length,
          deletedCount,
          failedCount,
          skippedCount,
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

  if (loading || loadingAccounts) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox p={3} display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <MDBox textAlign="center">
            <CircularProgress />
            <MDTypography variant="body2" color="text" mt={2}>
              Scanning for orphaned authentication accounts...
            </MDTypography>
          </MDBox>
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
                    manage_accounts
                  </Icon>
                  <MDTypography variant="h4">Delete Authentication Accounts</MDTypography>
                </MDBox>

                <MDTypography variant="body2" color="text" mb={3}>
                  This tool identifies Firebase Authentication accounts that don&apos;t have
                  corresponding user documents in the Firestore database. These &quot;orphaned&quot;
                  accounts may have been created but their Firestore documents were deleted.
                  <strong style={{ color: "#d32f2f" }}> Deletion cannot be undone.</strong>
                </MDTypography>

                {scanError && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    <strong>Error:</strong> {scanError}
                  </Alert>
                )}

                <Alert severity="warning" sx={{ mb: 3 }}>
                  <strong>What this does:</strong>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Compares all Firebase Authentication accounts with Firestore user documents</li>
                    <li>Identifies accounts that exist in Auth but NOT in Firestore</li>
                    <li>Deletes these orphaned authentication accounts when you confirm</li>
                  </ul>
                  <br />
                  <strong>Note:</strong> This only affects Authentication accounts. Users with
                  valid Firestore documents will NOT be affected.
                </Alert>

                <MDBox display="flex" gap={2} alignItems="center" mb={3} flexWrap="wrap">
                  <Chip
                    label={`${firestoreUserCount} Firestore users`}
                    color="success"
                    variant="outlined"
                    icon={<Icon>people</Icon>}
                  />
                  <Chip
                    label={`${orphanedAccounts.length} orphaned auth accounts`}
                    color={orphanedAccounts.length > 0 ? "error" : "success"}
                    variant="outlined"
                    icon={<Icon>warning</Icon>}
                  />
                  <MDButton
                    variant="outlined"
                    color="info"
                    onClick={scanForOrphanedAccounts}
                    disabled={deleting}
                    startIcon={<Icon>refresh</Icon>}
                    size="small"
                  >
                    Rescan
                  </MDButton>
                </MDBox>

                {orphanedAccounts.length === 0 && !completed && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    No orphaned authentication accounts found. All Auth accounts have matching
                    Firestore documents.
                  </Alert>
                )}

                {!deleting && !completed && orphanedAccounts.length > 0 && (
                  <>
                    <MDBox mb={3}>
                      <MDTypography variant="h6" gutterBottom>
                        Orphaned Accounts Found
                      </MDTypography>
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Email</TableCell>
                              <TableCell>Display Name</TableCell>
                              <TableCell>UID</TableCell>
                              <TableCell>Created</TableCell>
                              <TableCell>Last Sign In</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orphanedAccounts.map((account) => (
                              <TableRow key={account.uid}>
                                <TableCell>{account.email}</TableCell>
                                <TableCell>{account.displayName || "-"}</TableCell>
                                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                  {account.uid.substring(0, 12)}...
                                </TableCell>
                                <TableCell>
                                  {account.createdAt
                                    ? new Date(account.createdAt).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {account.lastSignIn
                                    ? new Date(account.lastSignIn).toLocaleDateString()
                                    : "Never"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </MDBox>

                    <MDButton
                      variant="gradient"
                      color="error"
                      onClick={() => setConfirmModalOpen(true)}
                      disabled={orphanedAccounts.length === 0}
                      startIcon={<Icon>delete_forever</Icon>}
                      size="large"
                    >
                      Delete All Orphaned Accounts
                    </MDButton>
                  </>
                )}

                {deleting && (
                  <MDBox textAlign="center" py={4}>
                    <CircularProgressWithLabel
                      value={progress}
                      current={currentCount}
                      total={orphanedAccounts.length}
                    />
                    <MDTypography variant="body2" color="text" mt={2}>
                      Deleting orphaned accounts... Please do not close this page.
                    </MDTypography>
                  </MDBox>
                )}

                {completed && (
                  <Alert
                    severity={stats.failed > 0 ? "warning" : "success"}
                    sx={{ mb: 3 }}
                  >
                    Deletion completed: {stats.deleted} deleted, {stats.failed} failed
                    {stats.skipped > 0 && `, ${stats.skipped} skipped`}
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
                    {stats.skipped > 0 && (
                      <Chip label={`${stats.skipped} Skipped`} color="warning" variant="outlined" />
                    )}
                  </MDBox>

                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Email</TableCell>
                          <TableCell>Display Name</TableCell>
                          <TableCell>UID</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.map((res) => (
                          <TableRow key={res.uid}>
                            <TableCell>{res.email}</TableCell>
                            <TableCell>{res.displayName || "-"}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                              {res.uid.substring(0, 12)}...
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={res.status}
                                size="small"
                                color={
                                  res.status === "deleted" || res.status === "not_found"
                                    ? "success"
                                    : res.status === "skipped"
                                    ? "warning"
                                    : "error"
                                }
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
            Are you absolutely sure you want to delete{" "}
            <strong>{orphanedAccounts.length}</strong> orphaned authentication accounts?
            <br />
            <br />
            These accounts exist in Firebase Authentication but have no corresponding user
            document in Firestore. This action is <strong>permanent</strong> and cannot be undone.
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
