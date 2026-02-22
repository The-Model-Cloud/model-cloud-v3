import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

// API functions
import { getOrphanedCloudinaryFolders, deleteOrphanedCloudinaryFolders } from "utils/api";

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
import Checkbox from "@mui/material/Checkbox";

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
        {current} of {total} folders processed
      </Typography>
    </Box>
  );
}

export default function CleanupCloudinary() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [orphanedFolders, setOrphanedFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [scanError, setScanError] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ deleted: 0, failed: 0, resources: 0 });
  const [completed, setCompleted] = useState(false);
  const [validUserCount, setValidUserCount] = useState(0);
  const [validJobCount, setValidJobCount] = useState(0);
  const [summary, setSummary] = useState({ orphanedUserFolders: 0, orphanedJobFolders: 0, legacyFolders: 0 });

  const allowedRoles = ["super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return;
    if (!user || !isAuthorised) {
      navigate("/dashboard");
    }
  }, [loading, user, isAuthorised, navigate]);

  // Fetch orphaned folders
  const scanForOrphanedFolders = async () => {
    setLoadingFolders(true);
    setScanError(null);
    setCompleted(false);
    setResults([]);
    setSelectedFolders([]);

    try {
      const result = await getOrphanedCloudinaryFolders();
      if (result.success) {
        setOrphanedFolders(result.orphanedFolders || []);
        setValidUserCount(result.totalValidUsers || 0);
        setValidJobCount(result.totalValidJobs || 0);
        setSummary(result.summary || { orphanedUserFolders: 0, orphanedJobFolders: 0, legacyFolders: 0 });
        // Select all by default
        setSelectedFolders((result.orphanedFolders || []).map((f) => f.fullPath));
      } else {
        setScanError(result.error || "Failed to scan for orphaned folders");
      }
    } catch (error) {
      console.error("Error scanning for orphaned folders:", error);
      setScanError(error.message || "Failed to scan for orphaned folders");
    } finally {
      setLoadingFolders(false);
    }
  };

  // Initial scan on mount
  useEffect(() => {
    if (isAuthorised) {
      scanForOrphanedFolders();
    }
  }, [isAuthorised]);

  const handleToggleFolder = (folderPath) => {
    setSelectedFolders((prev) =>
      prev.includes(folderPath)
        ? prev.filter((f) => f !== folderPath)
        : [...prev, folderPath]
    );
  };

  const handleSelectAll = () => {
    if (selectedFolders.length === orphanedFolders.length) {
      setSelectedFolders([]);
    } else {
      setSelectedFolders(orphanedFolders.map((f) => f.fullPath));
    }
  };

  const handleDelete = async () => {
    setConfirmModalOpen(false);
    setDeleting(true);
    setProgress(0);
    setCurrentCount(0);
    setResults([]);
    setStats({ deleted: 0, failed: 0, resources: 0 });
    setCompleted(false);

    // Log the action before starting
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.CLEANUP_CLOUDINARY,
        description: `Started Cloudinary cleanup of ${selectedFolders.length} orphaned folders`,
        details: {
          totalOrphaned: selectedFolders.length,
          orphanedFolders: selectedFolders,
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    // Delete in batches of 5 to show progress and avoid timeouts
    const batchSize = 5;
    const feedback = [];
    let deletedCount = 0;
    let failedCount = 0;
    let resourcesCount = 0;

    for (let i = 0; i < selectedFolders.length; i += batchSize) {
      const batch = selectedFolders.slice(i, i + batchSize);

      try {
        const result = await deleteOrphanedCloudinaryFolders(batch);

        if (result.success && result.results) {
          for (const res of result.results) {
            if (res.status === "deleted") {
              deletedCount++;
              resourcesCount += res.resourcesDeleted || 0;
              feedback.push({
                folderPath: res.folderPath,
                status: "deleted",
                resourcesDeleted: res.resourcesDeleted || 0,
              });
            } else {
              failedCount++;
              feedback.push({
                folderPath: res.folderPath,
                status: "failed",
                error: res.message,
              });
            }
          }
        }
      } catch (error) {
        // Mark all in this batch as failed
        for (const folderPath of batch) {
          failedCount++;
          feedback.push({
            folderPath,
            status: "failed",
            error: error.message,
          });
        }
      }

      setCurrentCount(Math.min(i + batchSize, selectedFolders.length));
      setProgress(((Math.min(i + batchSize, selectedFolders.length)) / selectedFolders.length) * 100);
      setStats({ deleted: deletedCount, failed: failedCount, resources: resourcesCount });
    }

    // Log completion
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.CLEANUP_CLOUDINARY,
        description: `Completed Cloudinary cleanup: ${deletedCount} folders, ${resourcesCount} resources deleted`,
        details: {
          totalOrphaned: selectedFolders.length,
          deletedCount,
          failedCount,
          resourcesCount,
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

  const getTotalResources = () => {
    return orphanedFolders
      .filter((f) => selectedFolders.includes(f.fullPath))
      .reduce((sum, f) => sum + (f.resourceCount || 0), 0);
  };

  if (loading || loadingFolders) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox p={3} display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <MDBox textAlign="center">
            <CircularProgress />
            <MDTypography variant="body2" color="text" mt={2}>
              Scanning Cloudinary for orphaned folders...
            </MDTypography>
            <MDTypography variant="caption" color="text">
              This may take a moment
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
                    cloud_off
                  </Icon>
                  <MDTypography variant="h4">Cleanup Cloudinary Storage</MDTypography>
                </MDBox>

                <MDTypography variant="body2" color="text" mb={3}>
                  This tool identifies Cloudinary folders that belong to users who no longer exist
                  in the database. These orphaned folders waste storage space and should be cleaned up.
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
                    <li>Scans Cloudinary folders under <code>users/models/</code> and <code>users/clients/</code></li>
                    <li>Checks job folders under <code>users/clients/*/jobs/</code> for deleted jobs</li>
                    <li>Compares folder names with existing users and job references in Firestore</li>
                    <li>Deletes all images and folders when you confirm</li>
                  </ul>
                  <br />
                  <strong>Note:</strong> This only affects Cloudinary storage. User accounts and jobs in
                  Firebase are NOT affected.
                </Alert>

                <MDBox display="flex" gap={2} alignItems="center" mb={3} flexWrap="wrap">
                  <Chip
                    label={`${validUserCount} valid users`}
                    color="success"
                    variant="outlined"
                    icon={<Icon>people</Icon>}
                  />
                  <Chip
                    label={`${validJobCount} valid jobs`}
                    color="success"
                    variant="outlined"
                    icon={<Icon>work</Icon>}
                  />
                  {summary.orphanedUserFolders > 0 && (
                    <Chip
                      label={`${summary.orphanedUserFolders} orphaned user folders`}
                      color="error"
                      variant="outlined"
                      icon={<Icon>person_off</Icon>}
                    />
                  )}
                  {summary.orphanedJobFolders > 0 && (
                    <Chip
                      label={`${summary.orphanedJobFolders} orphaned job folders`}
                      color="warning"
                      variant="outlined"
                      icon={<Icon>work_off</Icon>}
                    />
                  )}
                  {summary.legacyFolders > 0 && (
                    <Chip
                      label={`${summary.legacyFolders} legacy folders`}
                      color="info"
                      variant="outlined"
                      icon={<Icon>history</Icon>}
                    />
                  )}
                  {orphanedFolders.length === 0 && (
                    <Chip
                      label="No orphaned folders"
                      color="success"
                      variant="outlined"
                      icon={<Icon>check_circle</Icon>}
                    />
                  )}
                  <MDButton
                    variant="outlined"
                    color="info"
                    onClick={scanForOrphanedFolders}
                    disabled={deleting}
                    startIcon={<Icon>refresh</Icon>}
                    size="small"
                  >
                    Rescan
                  </MDButton>
                </MDBox>

                {orphanedFolders.length === 0 && !completed && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    No orphaned Cloudinary folders found. All folders belong to existing users and jobs.
                  </Alert>
                )}

                {!deleting && !completed && orphanedFolders.length > 0 && (
                  <>
                    <MDBox mb={3}>
                      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <MDTypography variant="h6">
                          Orphaned Folders Found
                        </MDTypography>
                        <MDButton
                          variant="text"
                          color="info"
                          onClick={handleSelectAll}
                          size="small"
                        >
                          {selectedFolders.length === orphanedFolders.length ? "Deselect All" : "Select All"}
                        </MDButton>
                      </MDBox>
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedFolders.length === orphanedFolders.length}
                                  indeterminate={selectedFolders.length > 0 && selectedFolders.length < orphanedFolders.length}
                                  onChange={handleSelectAll}
                                />
                              </TableCell>
                              <TableCell>Folder Name</TableCell>
                              <TableCell>Path</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell align="right">Resources</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orphanedFolders.map((folder) => (
                              <TableRow
                                key={folder.fullPath}
                                hover
                                onClick={() => handleToggleFolder(folder.fullPath)}
                                sx={{ cursor: "pointer" }}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={selectedFolders.includes(folder.fullPath)}
                                    onChange={() => handleToggleFolder(folder.fullPath)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <MDTypography variant="button" fontWeight="medium">
                                    {folder.folderName}
                                  </MDTypography>
                                </TableCell>
                                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                  {folder.fullPath}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={
                                      folder.type === "job"
                                        ? "Job"
                                        : folder.type === "legacy"
                                        ? "Legacy"
                                        : folder.parentFolder.includes("models")
                                        ? "Model"
                                        : "Client"
                                    }
                                    size="small"
                                    color={
                                      folder.type === "job"
                                        ? "warning"
                                        : folder.type === "legacy"
                                        ? "info"
                                        : folder.parentFolder.includes("models")
                                        ? "primary"
                                        : "secondary"
                                    }
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Chip
                                    label={folder.resourceCount || 0}
                                    size="small"
                                    color={folder.resourceCount > 0 ? "warning" : "default"}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </MDBox>

                    {selectedFolders.length > 0 && (
                      <MDBox display="flex" alignItems="center" gap={2}>
                        <MDButton
                          variant="gradient"
                          color="error"
                          onClick={() => setConfirmModalOpen(true)}
                          startIcon={<Icon>delete_forever</Icon>}
                          size="large"
                        >
                          Delete {selectedFolders.length} Selected Folders ({getTotalResources()} resources)
                        </MDButton>
                      </MDBox>
                    )}
                  </>
                )}

                {deleting && (
                  <MDBox textAlign="center" py={4}>
                    <CircularProgressWithLabel
                      value={progress}
                      current={currentCount}
                      total={selectedFolders.length}
                    />
                    <MDTypography variant="body2" color="text" mt={2}>
                      Deleting Cloudinary folders... Please do not close this page.
                    </MDTypography>
                  </MDBox>
                )}

                {completed && (
                  <Alert
                    severity={stats.failed > 0 ? "warning" : "success"}
                    sx={{ mb: 3 }}
                  >
                    Cleanup completed: {stats.deleted} folders deleted, {stats.resources} resources removed
                    {stats.failed > 0 && `, ${stats.failed} failed`}
                  </Alert>
                )}
              </MDBox>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <Card sx={{ mt: 3 }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Cleanup Results
                  </MDTypography>

                  <MDBox display="flex" gap={2} mb={3}>
                    <Chip
                      label={`${stats.deleted} Folders Deleted`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${stats.resources} Resources Removed`}
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
                          <TableCell>Folder Path</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Resources Deleted</TableCell>
                          <TableCell>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.map((res) => (
                          <TableRow key={res.folderPath}>
                            <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                              {res.folderPath}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={res.status}
                                size="small"
                                color={res.status === "deleted" ? "success" : "error"}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {res.resourcesDeleted || "-"}
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
            Confirm Cloudinary Cleanup
          </MDTypography>
          <MDTypography variant="body2" color="text" mb={3}>
            Are you absolutely sure you want to delete{" "}
            <strong>{selectedFolders.length}</strong> orphaned folders containing{" "}
            <strong>{getTotalResources()}</strong> resources from Cloudinary?
            <br />
            <br />
            These folders belong to users who no longer exist in the database. All images and
            files in these folders will be <strong>permanently deleted</strong>.
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
              Confirm Delete
            </MDButton>
          </MDBox>
        </Box>
      </Modal>
    </DashboardLayout>
  );
}
