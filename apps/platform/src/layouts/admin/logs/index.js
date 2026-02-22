import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

// Firebase
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "config/firebase";

// UI Components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import Card from "@mui/material/Card";
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
import TablePagination from "@mui/material/TablePagination";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";

// Action type constants
import { ADMIN_ACTIONS } from "utils/adminLogs";

// Action type configurations for display
const ACTION_CONFIG = {
  DELETE_ALL_MODELS: { label: "Delete All Models", color: "error", icon: "delete_forever" },
  DELETE_ALL_CLIENTS: { label: "Delete All Clients", color: "error", icon: "delete_forever" },
  DELETE_ALL_JOBS: { label: "Delete All Jobs", color: "error", icon: "delete_forever" },
  DELETE_MODEL: { label: "Delete Model", color: "error", icon: "person_remove" },
  DELETE_USER: { label: "Delete User", color: "error", icon: "person_remove" },
  DELETE_CLIENT: { label: "Delete Client", color: "error", icon: "person_remove" },
  DELETE_ADMIN: { label: "Delete Admin", color: "error", icon: "person_remove" },
  DELETE_ORPHANED_AUTH_ACCOUNTS: { label: "Delete Auth Accounts", color: "warning", icon: "manage_accounts" },
  CLEANUP_CLOUDINARY: { label: "Cleanup Cloudinary", color: "warning", icon: "cloud_off" },
  IMPORT_MODELS: { label: "Import Models", color: "info", icon: "cloud_upload" },
  IMPORT_IMAGES: { label: "Import Images", color: "info", icon: "add_photo_alternate" },
  OPTIMIZE_IMAGES: { label: "Optimize Images", color: "success", icon: "photo_size_select_large" },
  EDIT_MODEL: { label: "Edit Model", color: "primary", icon: "edit" },
  RESET_USER_PASSWORD: { label: "Reset Password", color: "warning", icon: "lock_reset" },
  UPDATE_USER_EMAIL: { label: "Update Email", color: "primary", icon: "email" },
  UPDATE_USER_NAME: { label: "Update Name", color: "primary", icon: "badge" },
  UPDATE_USER_LOCATION: { label: "Update Location", color: "primary", icon: "location_on" },
};

// Format timestamp for display
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "-";

  let date;
  if (timestamp.toDate) {
    // Firestore Timestamp
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format relative time
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";

  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return "";
};

export default function AdminLogs() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const allowedRoles = ["super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  // Redirect if not authorized
  useEffect(() => {
    if (loading) return;
    if (!user || !isAuthorised) {
      navigate("/dashboard");
    }
  }, [loading, user, isAuthorised, navigate]);

  // Fetch admin logs
  useEffect(() => {
    const fetchLogs = async () => {
      if (!isAuthorised) return;

      try {
        const q = query(
          collection(db, "adminLogs"),
          orderBy("createdAt", "desc"),
          limit(1000) // Limit to last 1000 logs
        );
        const snapshot = await getDocs(q);
        const logsList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setLogs(logsList);
      } catch (error) {
        console.error("Error fetching admin logs:", error);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [isAuthorised]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    // Filter by action type
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.adminName?.toLowerCase().includes(search) ||
          log.adminEmail?.toLowerCase().includes(search) ||
          log.description?.toLowerCase().includes(search) ||
          log.action?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [logs, searchTerm, actionFilter]);

  // Get unique action types from logs for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Open log details dialog
  const handleLogClick = (log) => {
    setSelectedLog(log);
  };

  // Close log details dialog
  const handleCloseDialog = () => {
    setSelectedLog(null);
  };

  // Render action chip
  const renderActionChip = (action) => {
    const config = ACTION_CONFIG[action] || { label: action, color: "default", icon: "info" };
    return (
      <Chip
        icon={<Icon fontSize="small">{config.icon}</Icon>}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  if (loading || loadingLogs) {
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
        <MDBox mb={3} ml={1}>
          <MDTypography variant="h4" fontWeight="bold">
            Admin Activity Logs
          </MDTypography>
          <MDTypography variant="button" color="text">
            View all administrative actions performed on the platform
          </MDTypography>
        </MDBox>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <MDBox p={2} display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon>search</Icon>
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Action Type</InputLabel>
              <Select
                value={actionFilter}
                label="Action Type"
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Actions</MenuItem>
                {uniqueActions.map((action) => (
                  <MenuItem key={action} value={action}>
                    {ACTION_CONFIG[action]?.label || action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <MDBox flex={1} />

            <Chip
              label={`${filteredLogs.length} logs`}
              color="info"
              variant="outlined"
            />
          </MDBox>
        </Card>

        {/* Logs Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <MDBox py={3}>
                        <Icon color="disabled" sx={{ fontSize: 48, mb: 1 }}>
                          history
                        </Icon>
                        <MDTypography variant="body2" color="text">
                          No logs found
                        </MDTypography>
                      </MDBox>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((log) => (
                      <TableRow
                        key={log.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleLogClick(log)}
                      >
                        <TableCell>
                          <MDBox>
                            <MDTypography variant="caption" fontWeight="medium">
                              {formatTimestamp(log.createdAt)}
                            </MDTypography>
                            <MDTypography
                              variant="caption"
                              color="text"
                              display="block"
                            >
                              {formatRelativeTime(log.createdAt)}
                            </MDTypography>
                          </MDBox>
                        </TableCell>
                        <TableCell>
                          <MDBox>
                            <MDTypography variant="button" fontWeight="medium">
                              {log.adminName || "Unknown"}
                            </MDTypography>
                            <MDTypography
                              variant="caption"
                              color="text"
                              display="block"
                            >
                              {log.adminEmail}
                            </MDTypography>
                          </MDBox>
                        </TableCell>
                        <TableCell>{renderActionChip(log.action)}</TableCell>
                        <TableCell>
                          <MDTypography
                            variant="body2"
                            sx={{
                              maxWidth: 400,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {log.description}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="info">
                            <Icon>visibility</Icon>
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredLogs.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Card>
      </MDBox>

      {/* Log Details Dialog */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedLog && (
          <>
            <DialogTitle>
              <MDBox display="flex" alignItems="center" justifyContent="space-between">
                <MDBox display="flex" alignItems="center" gap={2}>
                  <Icon color="info">receipt_long</Icon>
                  <MDTypography variant="h6">Log Details</MDTypography>
                </MDBox>
                <IconButton onClick={handleCloseDialog} size="small">
                  <Icon>close</Icon>
                </IconButton>
              </MDBox>
            </DialogTitle>
            <DialogContent dividers>
              <MDBox display="flex" flexDirection="column" gap={2}>
                {/* Action */}
                <MDBox>
                  <MDTypography variant="caption" color="text" fontWeight="bold">
                    ACTION
                  </MDTypography>
                  <MDBox mt={0.5}>{renderActionChip(selectedLog.action)}</MDBox>
                </MDBox>

                <Divider />

                {/* Timestamp */}
                <MDBox>
                  <MDTypography variant="caption" color="text" fontWeight="bold">
                    TIMESTAMP
                  </MDTypography>
                  <MDTypography variant="body2">
                    {formatTimestamp(selectedLog.createdAt)}
                    {selectedLog.timestamp && (
                      <MDTypography
                        variant="caption"
                        color="text"
                        component="span"
                        ml={1}
                      >
                        ({selectedLog.timestamp})
                      </MDTypography>
                    )}
                  </MDTypography>
                </MDBox>

                <Divider />

                {/* Admin Info */}
                <MDBox>
                  <MDTypography variant="caption" color="text" fontWeight="bold">
                    PERFORMED BY
                  </MDTypography>
                  <MDTypography variant="body2">
                    {selectedLog.adminName || "Unknown"}
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    {selectedLog.adminEmail}
                  </MDTypography>
                  {selectedLog.adminUid && (
                    <MDTypography
                      variant="caption"
                      color="text"
                      display="block"
                      sx={{ fontFamily: "monospace" }}
                    >
                      UID: {selectedLog.adminUid}
                    </MDTypography>
                  )}
                </MDBox>

                <Divider />

                {/* Description */}
                <MDBox>
                  <MDTypography variant="caption" color="text" fontWeight="bold">
                    DESCRIPTION
                  </MDTypography>
                  <MDTypography variant="body2">
                    {selectedLog.description}
                  </MDTypography>
                </MDBox>

                {/* Details */}
                {selectedLog.details &&
                  Object.keys(selectedLog.details).length > 0 && (
                    <>
                      <Divider />
                      <MDBox>
                        <MDTypography variant="caption" color="text" fontWeight="bold">
                          ADDITIONAL DETAILS
                        </MDTypography>
                        <MDBox
                          mt={1}
                          p={2}
                          sx={{
                            backgroundColor: "grey.100",
                            borderRadius: 1,
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                            overflow: "auto",
                            maxHeight: 300,
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(selectedLog.details, null, 2)}
                          </pre>
                        </MDBox>
                      </MDBox>
                    </>
                  )}

                {/* Log ID */}
                <Divider />
                <MDBox>
                  <MDTypography variant="caption" color="text" fontWeight="bold">
                    LOG ID
                  </MDTypography>
                  <MDTypography
                    variant="caption"
                    sx={{ fontFamily: "monospace" }}
                  >
                    {selectedLog.id}
                  </MDTypography>
                </MDBox>
              </MDBox>
            </DialogContent>
            <DialogActions>
              <MDButton onClick={handleCloseDialog} color="dark">
                Close
              </MDButton>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}
