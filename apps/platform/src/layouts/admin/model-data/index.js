import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "context/AuthContext";

// Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "config/firebase";

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
import Icon from "@mui/material/Icon";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

// Statistics Card
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

// Gender configuration
const GENDER_CONFIG = {
  Woman: { icon: "female", color: "info" },
  Man: { icon: "male", color: "primary" },
  Transwoman: { icon: "transgender", color: "secondary" },
  Transman: { icon: "transgender", color: "warning" },
  "Non-binary person": { icon: "wc", color: "success" },
  Other: { icon: "person", color: "dark" },
  Unknown: { icon: "help", color: "dark" },
};

export default function ModelData() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(true);

  const allowedRoles = ["admin", "super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return;
    if (!user || !isAuthorised) {
      navigate("/dashboard");
    }
  }, [loading, user, isAuthorised, navigate]);

  // Fetch all models
  const fetchModels = async () => {
    if (!isAuthorised) return;

    setLoadingModels(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "model"));
      const snapshot = await getDocs(q);
      const modelsList = snapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        ...docSnap.data(),
      }));
      setModels(modelsList);
    } catch (error) {
      console.error("Error fetching models:", error);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [isAuthorised]);

  // Computed statistics
  const stats = useMemo(() => {
    const genderCounts = models.reduce((acc, model) => {
      const gender = model.gender || "Unknown";
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    const missingAvatar = models.filter(
      (m) => !m.profileAvatar || m.profileAvatar === ""
    );

    const missingPortfolio = models.filter(
      (m) => !m.portfolioImages || m.portfolioImages.length === 0
    );

    const missingDigitals = models.filter(
      (m) => !m.digitalImages || m.digitalImages.length === 0
    );

    const totalPortfolioImages = models.reduce(
      (sum, m) => sum + (m.portfolioImages?.length || 0),
      0
    );

    const totalDigitalImages = models.reduce(
      (sum, m) => sum + (m.digitalImages?.length || 0),
      0
    );

    return {
      total: models.length,
      genderCounts,
      missingAvatar,
      missingPortfolio,
      missingDigitals,
      totalPortfolioImages,
      totalDigitalImages,
    };
  }, [models]);

  // Models with media issues (for the table)
  const modelsWithMediaIssues = useMemo(() => {
    let filtered = models.map((m) => ({
      uid: m.uid,
      name: `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Unknown",
      email: m.email || "",
      portfolioCount: m.portfolioImages?.length || 0,
      digitalsCount: m.digitalImages?.length || 0,
    }));

    // Filter by search
    if (mediaSearch) {
      const search = mediaSearch.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.email.toLowerCase().includes(search)
      );
    }

    // Filter incomplete only
    if (showIncompleteOnly) {
      filtered = filtered.filter(
        (m) => m.portfolioCount === 0 || m.digitalsCount === 0
      );
    }

    return filtered;
  }, [models, mediaSearch, showIncompleteOnly]);

  if (loading || loadingModels) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox
          p={3}
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
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
          <Alert severity="error">
            You do not have permission to access this page.
          </Alert>
        </MDBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={4} pb={3}>
        {/* Page Header */}
        <MDBox mb={3} ml={1} display="flex" justifyContent="space-between" alignItems="flex-start">
          <MDBox>
            <MDTypography variant="h4" fontWeight="bold">
              Model Data
            </MDTypography>
            <MDTypography variant="button" color="text">
              Overview of model profile completeness and statistics
            </MDTypography>
          </MDBox>
          <MDButton
            variant="outlined"
            color="info"
            onClick={fetchModels}
            disabled={loadingModels}
            startIcon={<Icon>refresh</Icon>}
          >
            {loadingModels ? "Refreshing..." : "Refresh"}
          </MDButton>
        </MDBox>

        {/* Summary Statistics Row */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={4}>
            <ComplexStatisticsCard
              color="dark"
              icon="people"
              title="Total Models"
              count={stats.total}
              percentage={{ label: "in system" }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <ComplexStatisticsCard
              color="success"
              icon="photo_library"
              title="Portfolio Images"
              count={stats.totalPortfolioImages}
              percentage={{
                amount: stats.missingPortfolio.length,
                color: stats.missingPortfolio.length > 0 ? "warning" : "success",
                label: "models missing",
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <ComplexStatisticsCard
              color="info"
              icon="add_a_photo"
              title="Digital Images"
              count={stats.totalDigitalImages}
              percentage={{
                amount: stats.missingDigitals.length,
                color: stats.missingDigitals.length > 0 ? "warning" : "success",
                label: "models missing",
              }}
            />
          </Grid>
        </Grid>

        {/* Gender Breakdown Row */}
        <MDBox mb={1} ml={1}>
          <MDTypography variant="h6" fontWeight="medium">
            Models by Gender
          </MDTypography>
        </MDBox>
        <Grid container spacing={3} mb={3}>
          {Object.entries(GENDER_CONFIG).map(([gender, config]) => {
            const count = stats.genderCounts[gender] || 0;
            if (gender === "Unknown" && count === 0) return null;
            return (
              <Grid item xs={6} sm={4} md={2} key={gender}>
                <ComplexStatisticsCard
                  color={config.color}
                  icon={config.icon}
                  title={gender}
                  count={count}
                  percentage={{
                    amount:
                      stats.total > 0
                        ? `${((count / stats.total) * 100).toFixed(1)}%`
                        : "0%",
                    color: config.color,
                    label: "of total",
                  }}
                />
              </Grid>
            );
          })}
        </Grid>

        {/* Missing Avatar Section */}
        <Card sx={{ mb: 3 }}>
          <MDBox p={3}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ cursor: "pointer" }}
              onClick={() => setAvatarExpanded(!avatarExpanded)}
            >
              <MDBox display="flex" alignItems="center">
                <Icon color="warning" sx={{ mr: 1 }}>
                  account_circle
                </Icon>
                <MDTypography variant="h6">Missing Profile Avatar</MDTypography>
                <Chip
                  label={stats.missingAvatar.length}
                  color={stats.missingAvatar.length > 0 ? "warning" : "success"}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </MDBox>
              <Icon>{avatarExpanded ? "expand_less" : "expand_more"}</Icon>
            </MDBox>

            <Collapse in={avatarExpanded}>
              <MDBox mt={2}>
                {stats.missingAvatar.length === 0 ? (
                  <Alert severity="success">
                    All models have a profile avatar uploaded.
                  </Alert>
                ) : (
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.missingAvatar.map((model) => (
                          <TableRow key={model.uid}>
                            <TableCell>
                              <Link
                                to={`/admin/model/${model.uid}/settings`}
                                style={{
                                  color: "#1976d2",
                                  textDecoration: "none",
                                }}
                              >
                                {`${model.firstName || ""} ${model.lastName || ""}`.trim() ||
                                  "Unknown"}
                              </Link>
                            </TableCell>
                            <TableCell>{model.email || "-"}</TableCell>
                            <TableCell align="right">
                              <IconButton
                                component={Link}
                                to={`/admin/model/${model.uid}/settings`}
                                size="small"
                                color="primary"
                              >
                                <Icon>edit</Icon>
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </MDBox>
            </Collapse>
          </MDBox>
        </Card>

        {/* Portfolio/Digitals Section */}
        <Card>
          <MDBox p={3}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
              flexWrap="wrap"
              gap={2}
            >
              <MDBox display="flex" alignItems="center">
                <Icon color="info" sx={{ mr: 1 }}>
                  collections
                </Icon>
                <MDTypography variant="h6">Portfolio & Digitals</MDTypography>
              </MDBox>
              <MDBox display="flex" alignItems="center" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showIncompleteOnly}
                      onChange={(e) => setShowIncompleteOnly(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show incomplete only"
                />
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon>search</Icon>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 200 }}
                />
              </MDBox>
            </MDBox>

            <MDBox display="flex" gap={2} mb={2}>
              <Chip
                label={`${modelsWithMediaIssues.length} models shown`}
                size="small"
                variant="outlined"
              />
              {showIncompleteOnly && (
                <Chip
                  label={`${stats.missingPortfolio.length} missing portfolio`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
              {showIncompleteOnly && (
                <Chip
                  label={`${stats.missingDigitals.length} missing digitals`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </MDBox>

            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">Portfolio</TableCell>
                    <TableCell align="center">Digitals</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modelsWithMediaIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <MDTypography variant="body2" color="text">
                          {showIncompleteOnly
                            ? "All models have complete media!"
                            : "No models found"}
                        </MDTypography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    modelsWithMediaIssues.map((model) => {
                      const isMissingBoth =
                        model.portfolioCount === 0 && model.digitalsCount === 0;
                      const isIncomplete =
                        model.portfolioCount === 0 || model.digitalsCount === 0;

                      return (
                        <TableRow key={model.uid}>
                          <TableCell>
                            <Link
                              to={`/admin/model/${model.uid}/settings`}
                              style={{
                                color: "#1976d2",
                                textDecoration: "none",
                              }}
                            >
                              {model.name}
                            </Link>
                          </TableCell>
                          <TableCell>{model.email}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                model.portfolioCount === 0
                                  ? "Missing"
                                  : model.portfolioCount
                              }
                              size="small"
                              color={
                                model.portfolioCount === 0 ? "error" : "success"
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                model.digitalsCount === 0
                                  ? "Missing"
                                  : model.digitalsCount
                              }
                              size="small"
                              color={
                                model.digitalsCount === 0 ? "error" : "success"
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                isMissingBoth
                                  ? "Missing Both"
                                  : isIncomplete
                                    ? "Incomplete"
                                    : "Complete"
                              }
                              size="small"
                              color={
                                isMissingBoth
                                  ? "error"
                                  : isIncomplete
                                    ? "warning"
                                    : "success"
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              component={Link}
                              to={`/admin/model/${model.uid}/settings`}
                              size="small"
                              color="primary"
                            >
                              <Icon>edit</Icon>
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </MDBox>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
