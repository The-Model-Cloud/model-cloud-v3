import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

// Firebase
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "config/firebase";

// Admin logging
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

// UI Components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
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
import Radio from "@mui/material/Radio";
import LinearProgress from "@mui/material/LinearProgress";
import Divider from "@mui/material/Divider";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  maxHeight: "80vh",
  overflow: "auto",
};

// Protected organisations that should never be merged into another org
const PROTECTED_COMPANIES = ["The Model Cloud", "Storm Web Design Ltd"];

export default function MergeOrganisations() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [organisations, setOrganisations] = useState([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Selection state
  const [primaryOrgId, setPrimaryOrgId] = useState(null);
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);

  // Preview state
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Merge state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState({ step: "", percent: 0 });
  const [results, setResults] = useState(null);
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

        // Sort by company name
        allOrganisations.sort((a, b) =>
          (a.companyName || "").localeCompare(b.companyName || "", undefined, {
            sensitivity: "base",
          })
        );

        setOrganisations(allOrganisations);
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoadingOrganisations(false);
      }
    };

    fetchOrganisations();
  }, [isAuthorised]);

  // Filter organisations by search term
  const filteredOrganisations = useMemo(() => {
    if (!searchTerm) return organisations;
    const term = searchTerm.toLowerCase();
    return organisations.filter((org) =>
      (org.companyName || "").toLowerCase().includes(term)
    );
  }, [organisations, searchTerm]);

  // Get primary org object
  const primaryOrg = useMemo(() => {
    return organisations.find((org) => org.id === primaryOrgId);
  }, [organisations, primaryOrgId]);

  // Get selected orgs to merge (excluding primary)
  const orgsToMerge = useMemo(() => {
    return organisations.filter(
      (org) => selectedOrgIds.includes(org.id) && org.id !== primaryOrgId
    );
  }, [organisations, selectedOrgIds, primaryOrgId]);

  // Check if an org is protected
  const isProtected = (org) => PROTECTED_COMPANIES.includes(org.companyName);

  // Handle selecting an org to merge
  const handleToggleOrg = (orgId) => {
    setSelectedOrgIds((prev) => {
      if (prev.includes(orgId)) {
        return prev.filter((id) => id !== orgId);
      }
      return [...prev, orgId];
    });
    setPreview(null);
  };

  // Handle selecting the primary org
  const handleSetPrimary = (orgId) => {
    setPrimaryOrgId(orgId);
    // Also add to selected if not already
    if (!selectedOrgIds.includes(orgId)) {
      setSelectedOrgIds((prev) => [...prev, orgId]);
    }
    setPreview(null);
  };

  // Load preview data
  const loadPreview = async () => {
    if (!primaryOrgId || orgsToMerge.length === 0) return;

    setLoadingPreview(true);
    try {
      const previewData = {
        users: 0,
        jobs: 0,
        teams: 0,
        favourites: 0,
        details: [],
      };

      for (const org of orgsToMerge) {
        const orgDetail = {
          id: org.id,
          companyName: org.companyName,
          users: 0,
          jobs: 0,
          teams: 0,
          favourites: 0,
        };

        // Count users
        const usersQuery = query(
          collection(db, "users"),
          where("organisationId", "==", org.id)
        );
        const usersSnapshot = await getDocs(usersQuery);
        orgDetail.users = usersSnapshot.size;
        previewData.users += usersSnapshot.size;

        // Count jobs
        const jobsQuery = query(
          collection(db, "jobs"),
          where("organisationId", "==", org.id)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        orgDetail.jobs = jobsSnapshot.size;
        previewData.jobs += jobsSnapshot.size;

        // Count teams
        const teamsSnapshot = await getDocs(
          collection(db, "organisations", org.id, "teams")
        );
        orgDetail.teams = teamsSnapshot.size;
        previewData.teams += teamsSnapshot.size;

        // Count favourites
        const favouritesQuery = query(
          collection(db, "favouriteLists"),
          where("organisationId", "==", org.id)
        );
        const favouritesSnapshot = await getDocs(favouritesQuery);
        orgDetail.favourites = favouritesSnapshot.size;
        previewData.favourites += favouritesSnapshot.size;

        previewData.details.push(orgDetail);
      }

      setPreview(previewData);
    } catch (error) {
      console.error("Error loading preview:", error);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Execute the merge
  const handleMerge = async () => {
    setConfirmModalOpen(false);
    setMerging(true);
    setProgress({ step: "Starting merge...", percent: 0 });
    setResults(null);
    setCompleted(false);

    const mergeResults = {
      usersUpdated: 0,
      jobsUpdated: 0,
      teamsTransferred: 0,
      favouritesUpdated: 0,
      orgsDeleted: 0,
      errors: [],
    };

    try {
      // Log the action before starting
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.MERGE_ORGANISATIONS || "MERGE_ORGANISATIONS",
        description: `Started merge of ${orgsToMerge.length} organisations into "${primaryOrg.companyName}"`,
        details: {
          primaryOrgId,
          primaryOrgName: primaryOrg.companyName,
          orgsToMerge: orgsToMerge.map((o) => ({ id: o.id, name: o.companyName })),
        },
      });

      const totalSteps = orgsToMerge.length;
      let currentStep = 0;

      for (const org of orgsToMerge) {
        currentStep++;
        const stepPercent = (currentStep / totalSteps) * 100;

        // Build team ID mapping for this org
        const teamIdMapping = {};

        // Step 1: Transfer teams
        setProgress({
          step: `Transferring teams from "${org.companyName}"...`,
          percent: stepPercent * 0.2,
        });

        try {
          const teamsSnapshot = await getDocs(
            collection(db, "organisations", org.id, "teams")
          );

          for (const teamDoc of teamsSnapshot.docs) {
            const teamData = teamDoc.data();
            // Create new team in primary org
            const newTeamRef = doc(collection(db, "organisations", primaryOrgId, "teams"));
            await setDoc(newTeamRef, {
              ...teamData,
              mergedFrom: org.id,
              mergedFromName: org.companyName,
              mergedAt: serverTimestamp(),
            });
            teamIdMapping[teamDoc.id] = newTeamRef.id;
            mergeResults.teamsTransferred++;
          }
        } catch (error) {
          mergeResults.errors.push({
            type: "teams",
            orgId: org.id,
            message: error.message,
          });
        }

        // Step 2: Update users
        setProgress({
          step: `Updating users from "${org.companyName}"...`,
          percent: stepPercent * 0.4,
        });

        try {
          const usersQuery = query(
            collection(db, "users"),
            where("organisationId", "==", org.id)
          );
          const usersSnapshot = await getDocs(usersQuery);

          for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const newTeamId = userData.teamId ? teamIdMapping[userData.teamId] || null : null;

            await updateDoc(doc(db, "users", userDoc.id), {
              organisationId: primaryOrgId,
              companyName: primaryOrg.companyName,
              teamId: newTeamId,
              updatedAt: serverTimestamp(),
            });
            mergeResults.usersUpdated++;
          }
        } catch (error) {
          mergeResults.errors.push({
            type: "users",
            orgId: org.id,
            message: error.message,
          });
        }

        // Step 3: Update jobs
        setProgress({
          step: `Updating jobs from "${org.companyName}"...`,
          percent: stepPercent * 0.6,
        });

        try {
          const jobsQuery = query(
            collection(db, "jobs"),
            where("organisationId", "==", org.id)
          );
          const jobsSnapshot = await getDocs(jobsQuery);

          for (const jobDoc of jobsSnapshot.docs) {
            const jobData = jobDoc.data();
            const newTeamId = jobData.teamId ? teamIdMapping[jobData.teamId] || null : null;

            await updateDoc(doc(db, "jobs", jobDoc.id), {
              organisationId: primaryOrgId,
              teamId: newTeamId,
              updatedAt: serverTimestamp(),
            });
            mergeResults.jobsUpdated++;
          }
        } catch (error) {
          mergeResults.errors.push({
            type: "jobs",
            orgId: org.id,
            message: error.message,
          });
        }

        // Step 4: Update favourite lists
        setProgress({
          step: `Updating favourites from "${org.companyName}"...`,
          percent: stepPercent * 0.8,
        });

        try {
          const favouritesQuery = query(
            collection(db, "favouriteLists"),
            where("organisationId", "==", org.id)
          );
          const favouritesSnapshot = await getDocs(favouritesQuery);

          for (const favDoc of favouritesSnapshot.docs) {
            const favData = favDoc.data();
            const newTeamId = favData.teamId ? teamIdMapping[favData.teamId] || null : null;

            await updateDoc(doc(db, "favouriteLists", favDoc.id), {
              organisationId: primaryOrgId,
              organisationName: primaryOrg.companyName,
              teamId: newTeamId,
              teamName: newTeamId ? favData.teamName : null,
              updatedAt: serverTimestamp(),
            });
            mergeResults.favouritesUpdated++;
          }
        } catch (error) {
          mergeResults.errors.push({
            type: "favourites",
            orgId: org.id,
            message: error.message,
          });
        }

        // Step 5: Delete old teams
        setProgress({
          step: `Cleaning up teams from "${org.companyName}"...`,
          percent: stepPercent * 0.9,
        });

        try {
          const teamsSnapshot = await getDocs(
            collection(db, "organisations", org.id, "teams")
          );
          for (const teamDoc of teamsSnapshot.docs) {
            await deleteDoc(doc(db, "organisations", org.id, "teams", teamDoc.id));
          }
        } catch (error) {
          mergeResults.errors.push({
            type: "deleteTeams",
            orgId: org.id,
            message: error.message,
          });
        }

        // Step 6: Delete the organisation
        setProgress({
          step: `Deleting organisation "${org.companyName}"...`,
          percent: stepPercent,
        });

        try {
          await deleteDoc(doc(db, "organisations", org.id));
          mergeResults.orgsDeleted++;
        } catch (error) {
          mergeResults.errors.push({
            type: "deleteOrg",
            orgId: org.id,
            message: error.message,
          });
        }
      }

      // Step 7: Recalculate userCount for primary org
      setProgress({ step: "Recalculating user count...", percent: 95 });

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("organisationId", "==", primaryOrgId)
        );
        const usersSnapshot = await getDocs(usersQuery);
        await updateDoc(doc(db, "organisations", primaryOrgId), {
          userCount: usersSnapshot.size,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        mergeResults.errors.push({
          type: "userCount",
          message: error.message,
        });
      }

      // Log completion
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.MERGE_ORGANISATIONS || "MERGE_ORGANISATIONS",
        description: `Completed merge: ${mergeResults.usersUpdated} users, ${mergeResults.jobsUpdated} jobs, ${mergeResults.teamsTransferred} teams, ${mergeResults.orgsDeleted} orgs deleted`,
        details: mergeResults,
      });

      setProgress({ step: "Merge complete!", percent: 100 });
    } catch (error) {
      console.error("Merge error:", error);
      mergeResults.errors.push({
        type: "general",
        message: error.message,
      });
    }

    setResults(mergeResults);
    setMerging(false);
    setCompleted(true);

    // Refresh organisations list
    const snapshot = await getDocs(collection(db, "organisations"));
    const allOrganisations = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    allOrganisations.sort((a, b) =>
      (a.companyName || "").localeCompare(b.companyName || "", undefined, {
        sensitivity: "base",
      })
    );
    setOrganisations(allOrganisations);
    setSelectedOrgIds([]);
    setPrimaryOrgId(null);
    setPreview(null);
  };

  // Reset selection
  const handleReset = () => {
    setSelectedOrgIds([]);
    setPrimaryOrgId(null);
    setPreview(null);
    setResults(null);
    setCompleted(false);
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
          {/* Left side - Organisation selection */}
          <Grid item xs={12} lg={7}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" alignItems="center" mb={2}>
                  <Icon fontSize="large" color="info" sx={{ mr: 1 }}>
                    merge
                  </Icon>
                  <MDTypography variant="h4">Merge Organisations</MDTypography>
                </MDBox>

                <MDTypography variant="body2" color="text" mb={3}>
                  Select organisations to merge. Choose one as the &quot;Primary&quot; organisation
                  (the one to keep), then select other organisations to merge into it.
                </MDTypography>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>How it works:</strong>
                  <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                    <li>All users from merged orgs will be moved to the primary org</li>
                    <li>All jobs will be reassigned to the primary org</li>
                    <li>Teams will be transferred to the primary org</li>
                    <li>Favourite lists will be updated</li>
                    <li>Merged organisations will be deleted</li>
                  </ul>
                </Alert>

                {/* Search */}
                <MDBox mb={3}>
                  <MDInput
                    fullWidth
                    label="Search organisations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <Icon sx={{ mr: 1, color: "text.secondary" }}>search</Icon>
                      ),
                    }}
                  />
                </MDBox>

                {/* Organisation list */}
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">Select</TableCell>
                        <TableCell padding="checkbox">Primary</TableCell>
                        <TableCell>Company Name</TableCell>
                        <TableCell>Tier</TableCell>
                        <TableCell>Users</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredOrganisations.map((org) => {
                        const orgIsProtected = isProtected(org);
                        const isSelected = selectedOrgIds.includes(org.id);
                        const isPrimary = primaryOrgId === org.id;

                        return (
                          <TableRow
                            key={org.id}
                            sx={{
                              bgcolor: isPrimary
                                ? "success.light"
                                : isSelected
                                ? "action.selected"
                                : "inherit",
                              "&:hover": { bgcolor: "action.hover" },
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleToggleOrg(org.id)}
                                disabled={orgIsProtected && !isPrimary}
                              />
                            </TableCell>
                            <TableCell padding="checkbox">
                              <Radio
                                checked={isPrimary}
                                onChange={() => handleSetPrimary(org.id)}
                                disabled={!isSelected}
                              />
                            </TableCell>
                            <TableCell>
                              <MDBox display="flex" alignItems="center" gap={1}>
                                {org.companyName || "Unknown"}
                                {orgIsProtected && (
                                  <Chip
                                    label="Protected"
                                    size="small"
                                    color="success"
                                    icon={<Icon>shield</Icon>}
                                  />
                                )}
                              </MDBox>
                            </TableCell>
                            <TableCell>{org.tier || "-"}</TableCell>
                            <TableCell>{org.userCount || 0}</TableCell>
                            <TableCell>
                              <Chip
                                label={org.status || "active"}
                                size="small"
                                color={org.status === "active" ? "success" : "default"}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <MDBox mt={2} display="flex" gap={2}>
                  <MDButton
                    variant="outlined"
                    color="secondary"
                    onClick={handleReset}
                    disabled={merging}
                  >
                    Reset Selection
                  </MDButton>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

          {/* Right side - Preview and actions */}
          <Grid item xs={12} lg={5}>
            {/* Selection summary */}
            <Card sx={{ mb: 3 }}>
              <MDBox p={3}>
                <MDTypography variant="h6" gutterBottom>
                  Selection Summary
                </MDTypography>

                {primaryOrg ? (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <strong>Primary:</strong> {primaryOrg.companyName}
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Select a primary organisation (the one to keep)
                  </Alert>
                )}

                {orgsToMerge.length > 0 ? (
                  <MDBox>
                    <MDTypography variant="body2" color="text" mb={1}>
                      <strong>Organisations to merge:</strong>
                    </MDTypography>
                    {orgsToMerge.map((org) => (
                      <Chip
                        key={org.id}
                        label={org.companyName}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                        onDelete={() => handleToggleOrg(org.id)}
                      />
                    ))}
                  </MDBox>
                ) : (
                  <MDTypography variant="body2" color="text">
                    Select organisations to merge into the primary
                  </MDTypography>
                )}

                {primaryOrgId && orgsToMerge.length > 0 && !preview && (
                  <MDBox mt={2}>
                    <MDButton
                      variant="outlined"
                      color="info"
                      onClick={loadPreview}
                      disabled={loadingPreview}
                      startIcon={
                        loadingPreview ? <CircularProgress size={16} /> : <Icon>preview</Icon>
                      }
                    >
                      {loadingPreview ? "Loading Preview..." : "Load Preview"}
                    </MDButton>
                  </MDBox>
                )}
              </MDBox>
            </Card>

            {/* Preview */}
            {preview && (
              <Card sx={{ mb: 3 }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Merge Preview
                  </MDTypography>

                  <MDBox display="flex" gap={2} flexWrap="wrap" mb={2}>
                    <Chip
                      label={`${preview.users} Users`}
                      color="primary"
                      icon={<Icon>people</Icon>}
                    />
                    <Chip
                      label={`${preview.jobs} Jobs`}
                      color="info"
                      icon={<Icon>work</Icon>}
                    />
                    <Chip
                      label={`${preview.teams} Teams`}
                      color="secondary"
                      icon={<Icon>groups</Icon>}
                    />
                    <Chip
                      label={`${preview.favourites} Favourites`}
                      color="warning"
                      icon={<Icon>star</Icon>}
                    />
                  </MDBox>

                  <Divider sx={{ my: 2 }} />

                  <MDTypography variant="body2" fontWeight="medium" mb={1}>
                    Details by organisation:
                  </MDTypography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Organisation</TableCell>
                          <TableCell align="right">Users</TableCell>
                          <TableCell align="right">Jobs</TableCell>
                          <TableCell align="right">Teams</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.details.map((detail) => (
                          <TableRow key={detail.id}>
                            <TableCell>{detail.companyName}</TableCell>
                            <TableCell align="right">{detail.users}</TableCell>
                            <TableCell align="right">{detail.jobs}</TableCell>
                            <TableCell align="right">{detail.teams}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <MDBox mt={3}>
                    <MDButton
                      variant="gradient"
                      color="error"
                      onClick={() => setConfirmModalOpen(true)}
                      disabled={merging}
                      startIcon={<Icon>merge</Icon>}
                      fullWidth
                    >
                      Merge Organisations
                    </MDButton>
                  </MDBox>
                </MDBox>
              </Card>
            )}

            {/* Progress */}
            {merging && (
              <Card sx={{ mb: 3 }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Merging in Progress
                  </MDTypography>
                  <MDBox mb={2}>
                    <LinearProgress variant="determinate" value={progress.percent} />
                  </MDBox>
                  <MDTypography variant="body2" color="text">
                    {progress.step}
                  </MDTypography>
                </MDBox>
              </Card>
            )}

            {/* Results */}
            {completed && results && (
              <Card>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Merge Results
                  </MDTypography>

                  <Alert
                    severity={results.errors.length > 0 ? "warning" : "success"}
                    sx={{ mb: 2 }}
                  >
                    {results.errors.length > 0
                      ? "Merge completed with some errors"
                      : "Merge completed successfully!"}
                  </Alert>

                  <MDBox display="flex" gap={2} flexWrap="wrap" mb={2}>
                    <Chip
                      label={`${results.usersUpdated} Users Updated`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${results.jobsUpdated} Jobs Updated`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${results.teamsTransferred} Teams Transferred`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${results.orgsDeleted} Orgs Deleted`}
                      color="error"
                      variant="outlined"
                    />
                  </MDBox>

                  {results.errors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <strong>Errors:</strong>
                      <ul style={{ marginTop: 8, marginBottom: 0 }}>
                        {results.errors.map((err, idx) => (
                          <li key={idx}>
                            {err.type}: {err.message}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
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
            Confirm Merge
          </MDTypography>
          <MDTypography variant="body2" color="text" mb={2}>
            You are about to merge <strong>{orgsToMerge.length}</strong> organisation(s) into{" "}
            <strong>&quot;{primaryOrg?.companyName}&quot;</strong>.
          </MDTypography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            This will:
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              <li>Move {preview?.users || 0} users to the primary organisation</li>
              <li>Reassign {preview?.jobs || 0} jobs</li>
              <li>Transfer {preview?.teams || 0} teams</li>
              <li>Update {preview?.favourites || 0} favourite lists</li>
              <li>
                <strong>Delete</strong> the following organisations:
                <ul>
                  {orgsToMerge.map((org) => (
                    <li key={org.id}>{org.companyName}</li>
                  ))}
                </ul>
              </li>
            </ul>
          </Alert>

          <MDTypography variant="body2" color="text" mb={3}>
            This action <strong>cannot be undone</strong>. This action will be logged with your
            admin credentials.
          </MDTypography>

          <MDBox display="flex" justifyContent="flex-end" gap={2}>
            <MDButton
              variant="outlined"
              color="secondary"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </MDButton>
            <MDButton variant="gradient" color="error" onClick={handleMerge}>
              Confirm Merge
            </MDButton>
          </MDBox>
        </Box>
      </Modal>
    </DashboardLayout>
  );
}
