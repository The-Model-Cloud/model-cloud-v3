import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "config/firebase";
import { sendJobMatchEmails } from "utils/api";
import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// MUI
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Icon from "@mui/material/Icon";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const CATEGORIES = selectData.skills; // shared with model profile

function NotifyModels() {
  // --- Filter state ---
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [skipApplicants, setSkipApplicants] = useState(true);

  // --- Jobs state ---
  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [loadingJobs, setLoadingJobs] = useState(false);

  // --- Send state ---
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null); // { current, total }
  const [results, setResults] = useState([]); // per-job results
  const [confirmed, setConfirmed] = useState(false);

  // Load open jobs on mount
  useEffect(() => {
    const loadJobs = async () => {
      setLoadingJobs(true);
      try {
        const snap = await getDocs(
          query(collection(db, "jobs"), where("status", "==", "open"))
        );
        const jobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort by creation date descending
        jobs.sort((a, b) => (b.createdAt || "") > (a.createdAt || "") ? 1 : -1);
        setAllJobs(jobs);
        // Select all by default
        setSelectedJobIds(new Set(jobs.map((j) => j.id)));
      } catch (err) {
        console.error("Failed to load jobs:", err);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, []);

  // Apply filters whenever inputs or jobs change
  useEffect(() => {
    let result = [...allJobs];

    if (selectedCategories.length > 0) {
      result = result.filter((job) =>
        job.categories?.some((c) => selectedCategories.includes(c))
      );
    }

    if (locationFilter.trim()) {
      const term = locationFilter.trim().toLowerCase();
      result = result.filter((job) =>
        job.location?.toLowerCase().includes(term) ||
        job.title?.toLowerCase().includes(term)
      );
    }

    setFilteredJobs(result);
    // Keep only selections that are still in the filtered list
    setSelectedJobIds((prev) => {
      const filteredIds = new Set(result.map((j) => j.id));
      return new Set([...prev].filter((id) => filteredIds.has(id)));
    });
  }, [allJobs, selectedCategories, locationFilter]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setConfirmed(false);
    setResults([]);
  };

  const toggleJob = (id) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setConfirmed(false);
    setResults([]);
  };

  const selectAllFiltered = () => {
    setSelectedJobIds(new Set(filteredJobs.map((j) => j.id)));
    setConfirmed(false);
    setResults([]);
  };

  const deselectAll = () => {
    setSelectedJobIds(new Set());
    setConfirmed(false);
    setResults([]);
  };

  const selectedJobs = filteredJobs.filter((j) => selectedJobIds.has(j.id));

  const handleSend = async () => {
    if (selectedJobs.length === 0) return;
    setIsSending(true);
    setSendProgress({ current: 0, total: selectedJobs.length });
    setResults([]);

    const newResults = [];
    for (let i = 0; i < selectedJobs.length; i++) {
      const job = selectedJobs[i];
      setSendProgress({ current: i + 1, total: selectedJobs.length });
      try {
        const result = await sendJobMatchEmails(job.id, skipApplicants);
        newResults.push({ job, result, error: null });
      } catch (err) {
        newResults.push({ job, result: null, error: err.message });
      }
      setResults([...newResults]);
    }

    setIsSending(false);
    setSendProgress(null);
    setConfirmed(false);
  };

  const totalEmailsSent = results.reduce((sum, r) => sum + (r.result?.modelEmailsSent || 0), 0);
  const totalMatches = results.reduce((sum, r) => sum + (r.result?.matchingModels || 0), 0);
  const failedCount = results.filter((r) => r.error || !r.result?.success).length;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Notify Models of Matching Jobs
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Select which open jobs to notify matching models about. Filters help narrow the job list — then cherry-pick individual jobs before sending.
          </MDTypography>
        </MDBox>

        <Grid container spacing={3}>
          {/* ── Filters panel ────────────────────────────────────── */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ p: 3, height: "100%" }}>
              <MDTypography variant="h6" fontWeight="medium" mb={2}>
                Filters
              </MDTypography>

              {/* Location / keyword filter */}
              <MDBox mb={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Location or keyword"
                  value={locationFilter}
                  onChange={(e) => { setLocationFilter(e.target.value); setConfirmed(false); setResults([]); }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon fontSize="small">search</Icon>
                      </InputAdornment>
                    ),
                    endAdornment: locationFilter ? (
                      <InputAdornment position="end">
                        <Icon
                          fontSize="small"
                          sx={{ cursor: "pointer", opacity: 0.5 }}
                          onClick={() => { setLocationFilter(""); setConfirmed(false); setResults([]); }}
                        >
                          close
                        </Icon>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </MDBox>

              {/* Category filter */}
              <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
                Categories
              </MDTypography>
              <MDTypography variant="caption" color="text" display="block" mb={1}>
                Leave all unchecked to include every category.
              </MDTypography>
              <MDBox display="flex" flexWrap="wrap" gap={0.5} mb={3}>
                {CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    size="small"
                    clickable
                    color={selectedCategories.includes(cat) ? "info" : "default"}
                    onClick={() => toggleCategory(cat)}
                    sx={{ fontSize: "0.7rem" }}
                  />
                ))}
              </MDBox>

              <Divider sx={{ mb: 2 }} />

              {/* Options */}
              <MDTypography variant="caption" fontWeight="bold" color="text" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
                Options
              </MDTypography>
              <MDBox>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={skipApplicants}
                      onChange={(e) => setSkipApplicants(e.target.checked)}
                    />
                  }
                  label={
                    <MDTypography variant="button" fontWeight="regular">
                      Skip models who already applied
                    </MDTypography>
                  }
                />
              </MDBox>
            </Card>
          </Grid>

          {/* ── Job list ─────────────────────────────────────────── */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ p: 3 }}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <MDTypography variant="h6" fontWeight="medium">
                  {loadingJobs
                    ? "Loading jobs..."
                    : `${filteredJobs.length} open job${filteredJobs.length !== 1 ? "s" : ""}${selectedCategories.length > 0 || locationFilter ? " (filtered)" : ""}`
                  }
                </MDTypography>
                {!loadingJobs && filteredJobs.length > 0 && (
                  <MDBox display="flex" gap={1}>
                    <MDButton variant="outlined" color="info" size="small" onClick={selectAllFiltered}>
                      Select all
                    </MDButton>
                    <MDButton variant="outlined" color="secondary" size="small" onClick={deselectAll}>
                      Deselect all
                    </MDButton>
                  </MDBox>
                )}
              </MDBox>

              {loadingJobs ? (
                <MDBox display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={32} />
                </MDBox>
              ) : filteredJobs.length === 0 ? (
                <Alert severity="info">No open jobs match the current filters.</Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 480 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell><strong>Job</strong></TableCell>
                        <TableCell><strong>Location</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Categories</strong></TableCell>
                        {results.length > 0 && <TableCell><strong>Result</strong></TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredJobs.map((job) => {
                        const jobResult = results.find((r) => r.job.id === job.id);
                        const isSelected = selectedJobIds.has(job.id);
                        return (
                          <TableRow
                            key={job.id}
                            hover
                            selected={isSelected}
                            sx={{ cursor: "pointer", opacity: isSending && !isSelected ? 0.5 : 1 }}
                            onClick={() => !isSending && toggleJob(job.id)}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={isSelected}
                                disabled={isSending}
                                onChange={() => toggleJob(job.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="button" fontWeight="medium" display="block">
                                {job.title}
                              </MDTypography>
                              {job.reference && (
                                <MDTypography variant="caption" color="text">
                                  {job.reference}
                                </MDTypography>
                              )}
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="caption" color="text">
                                {job.location || "—"}
                              </MDTypography>
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="caption" color="text" sx={{ whiteSpace: "nowrap" }}>
                                {job.dateFrom || "—"}
                              </MDTypography>
                            </TableCell>
                            <TableCell>
                              <MDBox display="flex" flexWrap="wrap" gap={0.5}>
                                {(job.categories || []).map((c) => (
                                  <Chip key={c} label={c} size="small" sx={{ fontSize: "0.65rem" }} />
                                ))}
                              </MDBox>
                            </TableCell>
                            {results.length > 0 && (
                              <TableCell>
                                {jobResult ? (
                                  jobResult.error || !jobResult.result?.success ? (
                                    <Tooltip title={jobResult.error || jobResult.result?.reason || "Failed"}>
                                      <Chip label="Failed" color="error" size="small" />
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title={`${jobResult.result.matchingModels} matches · ${jobResult.result.modelEmailsSent} emails sent`}>
                                      <Chip
                                        label={`${jobResult.result.modelEmailsSent} sent`}
                                        color="success"
                                        size="small"
                                      />
                                    </Tooltip>
                                  )
                                ) : isSelected ? (
                                  <CircularProgress size={14} />
                                ) : (
                                  <MDTypography variant="caption" color="text">—</MDTypography>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>

            {/* ── Send panel ───────────────────────────────────────── */}
            {!loadingJobs && selectedJobs.length > 0 && (
              <Card sx={{ p: 3, mt: 3 }}>
                {/* Progress bar while sending */}
                {isSending && sendProgress && (
                  <MDBox mb={2}>
                    <MDBox display="flex" justifyContent="space-between" mb={0.5}>
                      <MDTypography variant="caption" color="text">
                        Sending {sendProgress.current} of {sendProgress.total}...
                      </MDTypography>
                    </MDBox>
                    <LinearProgress
                      variant="determinate"
                      value={(sendProgress.current / sendProgress.total) * 100}
                    />
                  </MDBox>
                )}

                {/* Results summary after send */}
                {results.length > 0 && !isSending && (
                  <Alert
                    severity={failedCount > 0 ? "warning" : "success"}
                    sx={{ mb: 2 }}
                  >
                    {failedCount === 0
                      ? `All done — ${totalMatches} matching models found across ${results.length} job${results.length !== 1 ? "s" : ""}, ${totalEmailsSent} email${totalEmailsSent !== 1 ? "s" : ""} sent.`
                      : `Completed with ${failedCount} error${failedCount !== 1 ? "s" : ""} — ${totalEmailsSent} email${totalEmailsSent !== 1 ? "s" : ""} sent from ${results.length - failedCount} job${results.length - failedCount !== 1 ? "s" : ""}.`
                    }
                  </Alert>
                )}

                <MDBox display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <MDTypography variant="body2" color="text">
                    <strong>{selectedJobs.length}</strong> job{selectedJobs.length !== 1 ? "s" : ""} selected
                    {skipApplicants ? " · existing applicants will be skipped" : " · all matching models will be notified"}
                  </MDTypography>

                  {!confirmed ? (
                    <MDButton
                      variant="gradient"
                      color="info"
                      disabled={isSending}
                      onClick={() => setConfirmed(true)}
                    >
                      <Icon sx={{ mr: 1 }}>send</Icon>
                      Send Notifications
                    </MDButton>
                  ) : (
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <MDTypography variant="body2" color="text" fontWeight="medium">
                        Email matching models for all {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""}?
                      </MDTypography>
                      <MDButton
                        variant="gradient"
                        color="error"
                        size="small"
                        disabled={isSending}
                        startIcon={isSending ? <CircularProgress size={14} color="inherit" /> : null}
                        onClick={handleSend}
                      >
                        {isSending ? "Sending..." : "Yes, Send"}
                      </MDButton>
                      <MDButton
                        variant="outlined"
                        color="secondary"
                        size="small"
                        disabled={isSending}
                        onClick={() => setConfirmed(false)}
                      >
                        Cancel
                      </MDButton>
                    </MDBox>
                  )}
                </MDBox>
              </Card>
            )}
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default NotifyModels;
