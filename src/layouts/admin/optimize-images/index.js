import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

// API functions
import { getModelsImageStats, optimizeModelImages } from "utils/api";

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
import LinearProgress from "@mui/material/LinearProgress";
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
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

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
  maxHeight: "90vh",
  overflow: "auto",
};

// Helper to format bytes to human readable
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function CircularProgressWithLabel({ value, current, total }) {
  return (
    <Box position="relative" display="inline-flex" flexDirection="column" alignItems="center">
      <Box position="relative" display="inline-flex">
        <CircularProgress variant="determinate" value={value} size={80} color="info" />
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
        {current} of {total} models processed
      </Typography>
    </Box>
  );
}

export default function OptimizeImages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // State for models data
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [scanError, setScanError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Optimization options
  const [optimizeProfile, setOptimizeProfile] = useState(true);
  const [optimizePortfolio, setOptimizePortfolio] = useState(true);
  const [optimizeDigitals, setOptimizeDigitals] = useState(true);
  const [quality, setQuality] = useState("auto:good");
  const [maxProfileWidth, setMaxProfileWidth] = useState(800);
  const [maxPortfolioWidth, setMaxPortfolioWidth] = useState(2000);
  const [maxDigitalWidth, setMaxDigitalWidth] = useState(1600);

  // Processing state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [results, setResults] = useState(null);
  const [completed, setCompleted] = useState(false);

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState({});

  const allowedRoles = ["admin", "super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return;
    if (!user || !isAuthorised) {
      navigate("/dashboard");
    }
  }, [loading, user, isAuthorised, navigate]);

  // Fetch models with image stats
  const fetchImageStats = async () => {
    setLoadingModels(true);
    setScanError(null);
    setCompleted(false);
    setResults(null);
    setSelectedModels([]);

    try {
      const result = await getModelsImageStats();
      if (result.success) {
        setModels(result.models || []);
        setSummary(result.summary || null);
        // Don't pre-select any models - let user choose
        setSelectedModels([]);
      } else {
        setScanError(result.error || "Failed to fetch image statistics");
      }
    } catch (error) {
      console.error("Error fetching image stats:", error);
      setScanError(error.message || "Failed to fetch image statistics");
    } finally {
      setLoadingModels(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (isAuthorised) {
      fetchImageStats();
    }
  }, [isAuthorised]);

  const handleToggleModel = (uid) => {
    setSelectedModels((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAll = () => {
    const filteredModels = getFilteredModels();
    if (selectedModels.length === filteredModels.length) {
      setSelectedModels([]);
    } else {
      setSelectedModels(filteredModels.map((m) => m.uid));
    }
  };

  const handleSelectWithManyImages = () => {
    // Select models with more than 10 total images (likely candidates for optimization)
    const withManyImages = models
      .filter((m) => {
        const total =
          (m.profileAvatar?.hasImage ? 1 : 0) +
          (m.portfolioImages?.count || 0) +
          (m.digitalImages?.count || 0);
        return total > 10;
      })
      .map((m) => m.uid);
    setSelectedModels(withManyImages);
  };

  const toggleExpandRow = (uid) => {
    setExpandedRows((prev) => ({
      ...prev,
      [uid]: !prev[uid],
    }));
  };

  const getFilteredModels = () => {
    if (!searchTerm) return models;
    const term = searchTerm.toLowerCase();
    return models.filter(
      (m) =>
        m.firstName?.toLowerCase().includes(term) ||
        m.lastName?.toLowerCase().includes(term) ||
        m.email?.toLowerCase().includes(term)
    );
  };

  const handleOptimize = async () => {
    setConfirmModalOpen(false);
    setOptimizing(true);
    setProgress(0);
    setCurrentCount(0);
    setResults(null);
    setCompleted(false);

    // Log the action before starting
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.OPTIMIZE_IMAGES,
        description: `Started image optimization for ${selectedModels.length} models`,
        details: {
          totalModels: selectedModels.length,
          options: {
            optimizeProfile,
            optimizePortfolio,
            optimizeDigitals,
            quality,
            maxProfileWidth,
            maxPortfolioWidth,
            maxDigitalWidth,
          },
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    // Process in batches to show progress
    const batchSize = 5;
    let processedCount = 0;
    let totalSavedBytes = 0;
    const allResults = {
      modelsProcessed: 0,
      profileImages: { optimized: 0, failed: 0, savedBytes: 0 },
      portfolioImages: { optimized: 0, failed: 0, savedBytes: 0 },
      digitalImages: { optimized: 0, failed: 0, savedBytes: 0 },
      errors: [],
      details: [],
    };

    for (let i = 0; i < selectedModels.length; i += batchSize) {
      const batch = selectedModels.slice(i, i + batchSize);

      try {
        const result = await optimizeModelImages({
          modelUids: batch,
          optimizeProfile,
          optimizePortfolio,
          optimizeDigitals,
          quality,
          maxProfileWidth,
          maxProfileHeight: maxProfileWidth, // Keep square
          maxPortfolioWidth,
          maxPortfolioHeight: maxPortfolioWidth,
          maxDigitalWidth,
          maxDigitalHeight: maxDigitalWidth,
        });

        if (result.success) {
          allResults.modelsProcessed += result.modelsProcessed || 0;
          allResults.profileImages.optimized += result.profileImages?.optimized || 0;
          allResults.profileImages.failed += result.profileImages?.failed || 0;
          allResults.profileImages.savedBytes += result.profileImages?.savedBytes || 0;
          allResults.portfolioImages.optimized += result.portfolioImages?.optimized || 0;
          allResults.portfolioImages.failed += result.portfolioImages?.failed || 0;
          allResults.portfolioImages.savedBytes += result.portfolioImages?.savedBytes || 0;
          allResults.digitalImages.optimized += result.digitalImages?.optimized || 0;
          allResults.digitalImages.failed += result.digitalImages?.failed || 0;
          allResults.digitalImages.savedBytes += result.digitalImages?.savedBytes || 0;
          if (result.errors) allResults.errors.push(...result.errors);
          if (result.details) allResults.details.push(...result.details);
          totalSavedBytes += result.totalSavedBytes || 0;
        }
      } catch (error) {
        console.error("Batch optimization error:", error);
        allResults.errors.push({ batch, error: error.message });
      }

      processedCount = Math.min(i + batchSize, selectedModels.length);
      setCurrentCount(processedCount);
      setProgress((processedCount / selectedModels.length) * 100);
    }

    allResults.totalSavedBytes = totalSavedBytes;
    setResults(allResults);
    setOptimizing(false);
    setCompleted(true);

    // Log completion
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        action: ADMIN_ACTIONS.OPTIMIZE_IMAGES,
        description: `Completed image optimization: ${formatBytes(totalSavedBytes)} saved`,
        details: {
          modelsProcessed: allResults.modelsProcessed,
          totalSavedBytes,
          profileImages: allResults.profileImages,
          portfolioImages: allResults.portfolioImages,
          digitalImages: allResults.digitalImages,
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }
  };

  const getSelectedImageCount = () => {
    return models
      .filter((m) => selectedModels.includes(m.uid))
      .reduce(
        (sum, m) =>
          sum +
          (m.profileAvatar?.hasImage ? 1 : 0) +
          (m.portfolioImages?.count || 0) +
          (m.digitalImages?.count || 0),
        0
      );
  };

  if (loading || loadingModels) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox p={3} display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <MDBox textAlign="center">
            <CircularProgress />
            <MDTypography variant="body2" color="text" mt={2}>
              Analyzing model images...
            </MDTypography>
            <MDTypography variant="caption" color="text">
              This may take a moment for large databases
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

  const filteredModels = getFilteredModels();

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={4} pb={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" alignItems="center" mb={2}>
                  <Icon fontSize="large" color="info" sx={{ mr: 1 }}>
                    photo_size_select_large
                  </Icon>
                  <MDTypography variant="h4">Optimize Model Images</MDTypography>
                </MDBox>

                <MDTypography variant="body2" color="text" mb={3}>
                  This tool analyzes and optimizes images stored in Cloudinary to reduce file sizes
                  and improve page load times. Large images (especially profile avatars) can
                  significantly slow down the Browse Models page.
                </MDTypography>

                {scanError && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    <strong>Error:</strong> {scanError}
                  </Alert>
                )}

                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>What this does:</strong>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>
                      <strong>Profile Images:</strong> Resized to max {maxProfileWidth}px for faster
                      thumbnail loading
                    </li>
                    <li>
                      <strong>Portfolio Images:</strong> Resized to max {maxPortfolioWidth}px with
                      quality optimization
                    </li>
                    <li>
                      <strong>Digital Images:</strong> Resized to max {maxDigitalWidth}px with
                      quality optimization
                    </li>
                    <li>Applies automatic format selection (WebP/AVIF when supported)</li>
                    <li>Updates Firestore with optimized image URLs</li>
                  </ul>
                </Alert>

                {/* Summary Stats */}
                {summary && (
                  <MDBox display="flex" gap={2} alignItems="center" mb={3} flexWrap="wrap">
                    <Chip
                      label={`${summary.totalModels} models with images`}
                      color="primary"
                      variant="outlined"
                      icon={<Icon>people</Icon>}
                    />
                    <Chip
                      label={`${summary.totalProfileImages} profile images`}
                      color="info"
                      variant="outlined"
                      icon={<Icon>account_circle</Icon>}
                    />
                    <Chip
                      label={`${summary.totalPortfolioImages} portfolio images`}
                      color="secondary"
                      variant="outlined"
                      icon={<Icon>collections</Icon>}
                    />
                    <Chip
                      label={`${summary.totalDigitalImages} digitals`}
                      color="warning"
                      variant="outlined"
                      icon={<Icon>photo_camera</Icon>}
                    />
                    <Chip
                      label={`${summary.totalImages} total images`}
                      color="error"
                      icon={<Icon>photo_library</Icon>}
                    />
                    <MDButton
                      variant="outlined"
                      color="info"
                      onClick={fetchImageStats}
                      disabled={optimizing}
                      startIcon={<Icon>refresh</Icon>}
                      size="small"
                    >
                      Rescan
                    </MDButton>
                  </MDBox>
                )}

                {/* Optimization Options */}
                {!optimizing && !completed && models.length > 0 && (
                  <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
                    <MDTypography variant="h6" gutterBottom>
                      Optimization Settings
                    </MDTypography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={optimizeProfile}
                              onChange={(e) => setOptimizeProfile(e.target.checked)}
                            />
                          }
                          label="Optimize Profile Images"
                        />
                        {optimizeProfile && (
                          <MDBox mt={1}>
                            <TextField
                              label="Max Width (px)"
                              type="number"
                              size="small"
                              value={maxProfileWidth}
                              onChange={(e) => setMaxProfileWidth(Math.min(1200, Math.max(400, parseInt(e.target.value) || 400)))}
                              inputProps={{ min: 400, max: 1200, step: 100 }}
                              sx={{ width: 140 }}
                            />
                          </MDBox>
                        )}
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={optimizePortfolio}
                              onChange={(e) => setOptimizePortfolio(e.target.checked)}
                            />
                          }
                          label="Optimize Portfolio Images"
                        />
                        {optimizePortfolio && (
                          <MDBox mt={1}>
                            <TextField
                              label="Max Width (px)"
                              type="number"
                              size="small"
                              value={maxPortfolioWidth}
                              onChange={(e) => setMaxPortfolioWidth(Math.min(3000, Math.max(1200, parseInt(e.target.value) || 1200)))}
                              inputProps={{ min: 1200, max: 3000, step: 200 }}
                              sx={{ width: 140 }}
                            />
                          </MDBox>
                        )}
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={optimizeDigitals}
                              onChange={(e) => setOptimizeDigitals(e.target.checked)}
                            />
                          }
                          label="Optimize Digital Images"
                        />
                        {optimizeDigitals && (
                          <MDBox mt={1}>
                            <TextField
                              label="Max Width (px)"
                              type="number"
                              size="small"
                              value={maxDigitalWidth}
                              onChange={(e) => setMaxDigitalWidth(Math.min(2400, Math.max(1000, parseInt(e.target.value) || 1000)))}
                              inputProps={{ min: 1000, max: 2400, step: 200 }}
                              sx={{ width: 140 }}
                            />
                          </MDBox>
                        )}
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Quality</InputLabel>
                          <Select
                            value={quality}
                            onChange={(e) => setQuality(e.target.value)}
                            label="Quality"
                          >
                            <MenuItem value="auto:best">Best (larger files)</MenuItem>
                            <MenuItem value="auto:good">Good (recommended)</MenuItem>
                            <MenuItem value="auto">Auto</MenuItem>
                            <MenuItem value="auto:low">Low (smallest files)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Card>
                )}

                {/* Search and Selection Controls */}
                {!optimizing && !completed && models.length > 0 && (
                  <MDBox mb={2}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Search models..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Icon>search</Icon>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <MDBox display="flex" gap={1} flexWrap="wrap">
                          <MDButton
                            variant="text"
                            color="info"
                            onClick={handleSelectAll}
                            size="small"
                          >
                            {selectedModels.length === filteredModels.length
                              ? "Deselect All"
                              : "Select All"}
                          </MDButton>
                          <MDButton
                            variant="text"
                            color="warning"
                            onClick={handleSelectWithManyImages}
                            size="small"
                          >
                            Select Models with 10+ Images
                          </MDButton>
                          <Chip
                            label={`${selectedModels.length} models selected`}
                            size="small"
                            color="primary"
                          />
                          <Chip
                            label={`${getSelectedImageCount()} total images`}
                            size="small"
                            color="secondary"
                          />
                        </MDBox>
                      </Grid>
                    </Grid>
                  </MDBox>
                )}

                {/* Models Table */}
                {!optimizing && !completed && models.length > 0 && (
                  <MDBox mb={3}>
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={
                                  selectedModels.length === filteredModels.length &&
                                  filteredModels.length > 0
                                }
                                indeterminate={
                                  selectedModels.length > 0 &&
                                  selectedModels.length < filteredModels.length
                                }
                                onChange={handleSelectAll}
                              />
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell>Model</TableCell>
                            <TableCell align="center">Profile</TableCell>
                            <TableCell align="center">Portfolio</TableCell>
                            <TableCell align="center">Digitals</TableCell>
                            <TableCell align="center">Total Images</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredModels.map((model) => {
                            const totalImages =
                              (model.profileAvatar?.hasImage ? 1 : 0) +
                              (model.portfolioImages?.count || 0) +
                              (model.digitalImages?.count || 0);

                            return (
                              <>
                                <TableRow
                                  key={model.uid}
                                  hover
                                  onClick={() => handleToggleModel(model.uid)}
                                  sx={{ cursor: "pointer" }}
                                >
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      checked={selectedModels.includes(model.uid)}
                                      onChange={() => handleToggleModel(model.uid)}
                                    />
                                  </TableCell>
                                  <TableCell padding="checkbox">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpandRow(model.uid);
                                      }}
                                    >
                                      <Icon>
                                        {expandedRows[model.uid]
                                          ? "keyboard_arrow_up"
                                          : "keyboard_arrow_down"}
                                      </Icon>
                                    </IconButton>
                                  </TableCell>
                                  <TableCell>
                                    <MDTypography variant="button" fontWeight="medium">
                                      {model.firstName} {model.lastName}
                                    </MDTypography>
                                    <MDTypography
                                      variant="caption"
                                      color="text"
                                      display="block"
                                    >
                                      {model.email}
                                    </MDTypography>
                                  </TableCell>
                                  <TableCell align="center">
                                    {model.profileAvatar?.hasImage ? (
                                      <Chip
                                        label="1"
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        icon={<Icon>account_circle</Icon>}
                                      />
                                    ) : (
                                      <MDTypography variant="caption" color="text">-</MDTypography>
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    {model.portfolioImages?.count > 0 ? (
                                      <Chip
                                        label={model.portfolioImages.count}
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                        icon={<Icon>collections</Icon>}
                                      />
                                    ) : (
                                      <MDTypography variant="caption" color="text">-</MDTypography>
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    {model.digitalImages?.count > 0 ? (
                                      <Chip
                                        label={model.digitalImages.count}
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        icon={<Icon>photo_camera</Icon>}
                                      />
                                    ) : (
                                      <MDTypography variant="caption" color="text">-</MDTypography>
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    <MDTypography variant="button" fontWeight="medium">
                                      {totalImages}
                                    </MDTypography>
                                  </TableCell>
                                </TableRow>
                                {/* Expandable Details Row */}
                                <TableRow>
                                  <TableCell
                                    colSpan={7}
                                    sx={{ py: 0, borderBottom: expandedRows[model.uid] ? 1 : 0 }}
                                  >
                                    <Collapse
                                      in={expandedRows[model.uid]}
                                      timeout="auto"
                                      unmountOnExit
                                    >
                                      <MDBox sx={{ py: 2, px: 3 }}>
                                        <Grid container spacing={2}>
                                          {model.profileAvatar?.url && (
                                            <Grid item xs={12} md={4}>
                                              <MDTypography variant="subtitle2" gutterBottom>
                                                Profile Image
                                              </MDTypography>
                                              <img
                                                src={model.profileAvatar.url}
                                                alt="Profile"
                                                style={{
                                                  width: 100,
                                                  height: 100,
                                                  objectFit: "cover",
                                                  borderRadius: 8,
                                                }}
                                              />
                                            </Grid>
                                          )}
                                          {model.portfolioImages?.count > 0 && (
                                            <Grid item xs={12} md={4}>
                                              <MDTypography variant="subtitle2" gutterBottom>
                                                Portfolio ({model.portfolioImages.count} images)
                                              </MDTypography>
                                            </Grid>
                                          )}
                                          {model.digitalImages?.count > 0 && (
                                            <Grid item xs={12} md={4}>
                                              <MDTypography variant="subtitle2" gutterBottom>
                                                Digitals ({model.digitalImages.count} images)
                                              </MDTypography>
                                            </Grid>
                                          )}
                                        </Grid>
                                      </MDBox>
                                    </Collapse>
                                  </TableCell>
                                </TableRow>
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </MDBox>
                )}

                {/* Optimize Button */}
                {!optimizing &&
                  !completed &&
                  selectedModels.length > 0 &&
                  (optimizeProfile || optimizePortfolio || optimizeDigitals) && (
                    <MDBox display="flex" alignItems="center" gap={2}>
                      <MDButton
                        variant="gradient"
                        color="info"
                        onClick={() => setConfirmModalOpen(true)}
                        startIcon={<Icon>auto_fix_high</Icon>}
                        size="large"
                      >
                        Optimize {selectedModels.length} Model{selectedModels.length !== 1 ? "s" : ""}{" "}
                        ({getSelectedImageCount()} images)
                      </MDButton>
                    </MDBox>
                  )}

                {/* Progress */}
                {optimizing && (
                  <MDBox textAlign="center" py={4}>
                    <CircularProgressWithLabel
                      value={progress}
                      current={currentCount}
                      total={selectedModels.length}
                    />
                    <MDTypography variant="body2" color="text" mt={2}>
                      Optimizing images... Please do not close this page.
                    </MDTypography>
                  </MDBox>
                )}

                {/* Results */}
                {completed && results && (
                  <Alert
                    severity={results.errors?.length > 0 ? "warning" : "success"}
                    sx={{ mb: 3 }}
                  >
                    Optimization completed: {results.modelsProcessed} models processed,{" "}
                    <strong>{formatBytes(results.totalSavedBytes)} saved!</strong>
                    {results.errors?.length > 0 && ` (${results.errors.length} errors)`}
                  </Alert>
                )}
              </MDBox>
            </Card>

            {/* Results Card */}
            {completed && results && (
              <Card sx={{ mt: 3 }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Optimization Results
                  </MDTypography>

                  <MDBox display="flex" gap={2} mb={3} flexWrap="wrap">
                    <Chip
                      label={`${results.profileImages?.optimized || 0} Profile Images Optimized`}
                      color="success"
                      variant="outlined"
                      icon={<Icon>account_circle</Icon>}
                    />
                    <Chip
                      label={`${results.portfolioImages?.optimized || 0} Portfolio Images Optimized`}
                      color="success"
                      variant="outlined"
                      icon={<Icon>collections</Icon>}
                    />
                    <Chip
                      label={`${results.digitalImages?.optimized || 0} Digitals Optimized`}
                      color="success"
                      variant="outlined"
                      icon={<Icon>photo_camera</Icon>}
                    />
                    <Chip
                      label={`${formatBytes(results.totalSavedBytes)} Total Saved`}
                      color="info"
                      icon={<Icon>savings</Icon>}
                    />
                  </MDBox>

                  <MDBox display="flex" gap={2} mb={3}>
                    <MDButton
                      variant="outlined"
                      color="info"
                      onClick={fetchImageStats}
                      startIcon={<Icon>refresh</Icon>}
                    >
                      Rescan to See Updated Stats
                    </MDButton>
                  </MDBox>

                  {results.errors?.length > 0 && (
                    <MDBox mt={2}>
                      <MDTypography variant="subtitle2" color="error" gutterBottom>
                        Errors ({results.errors.length})
                      </MDTypography>
                      <TableContainer sx={{ maxHeight: 200 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Model</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Error</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {results.errors.map((err, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{err.modelUid}</TableCell>
                                <TableCell>{err.type || "-"}</TableCell>
                                <TableCell>{err.error}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </MDBox>
                  )}
                </MDBox>
              </Card>
            )}

            {models.length === 0 && !loadingModels && (
              <Alert severity="info">No models with images found.</Alert>
            )}
          </Grid>
        </Grid>
      </MDBox>
      <Footer />

      {/* Confirmation Modal */}
      <Modal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
        <Box sx={modalStyle}>
          <MDTypography variant="h5" gutterBottom color="info">
            Confirm Image Optimization
          </MDTypography>
          <MDTypography variant="body2" color="text" mb={3}>
            You are about to optimize images for <strong>{selectedModels.length}</strong> models
            containing <strong>{getSelectedImageCount()}</strong> images.
            <br />
            <br />
            <strong>Settings:</strong>
            <ul style={{ marginTop: 8 }}>
              {optimizeProfile && <li>Profile images: max {maxProfileWidth}px</li>}
              {optimizePortfolio && <li>Portfolio images: max {maxPortfolioWidth}px</li>}
              {optimizeDigitals && <li>Digital images: max {maxDigitalWidth}px</li>}
              <li>Quality: {quality}</li>
            </ul>
            <br />
            The optimized images will replace the original URLs in Firestore. Original images in
            Cloudinary will remain as derived versions are created.
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
            <MDButton variant="gradient" color="info" onClick={handleOptimize}>
              Start Optimization
            </MDButton>
          </MDBox>
        </Box>
      </Modal>
    </DashboardLayout>
  );
}
