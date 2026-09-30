import { useEffect, useState, useCallback, useMemo } from "react";
import { collection, query, orderBy, getDocs, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

// MD wrapper components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Auth
import { useAuth } from "context/AuthContext";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getRoleColor = (role) => {
  switch (role) {
    case "model": return "info";
    case "client": return "success";
    case "account manager": return "warning";
    case "admin": return "primary";
    case "super admin": return "error";
    default: return "default";
  }
};

const formatRole = (role) => {
  if (!role) return "Unknown";
  return role.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const getTimeAgo = (isoString) => {
  if (!isoString) return "—";
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatFullDate = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const DEVICE_ICONS = { Mobile: "phone_iphone", Tablet: "tablet", Desktop: "computer" };

const TIME_CUTOFFS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// ─── Filter options ──────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "active", label: "Active Only" },
  { value: "all", label: "All Sessions" },
  { value: "logged_out", label: "Logged Out" },
];

const TIME_OPTIONS = [
  { value: "1h", label: "Last Hour" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
];

// ─── Component ───────────────────────────────────────────────────────────────

function LoggedInUsers() {
  const { user: currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [timeFilter, setTimeFilter] = useState("24h");
  const [tableData, setTableData] = useState({ columns: [], rows: [] });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sessionsQuery = query(
        collection(db, "userSessions"),
        orderBy("loginAt", "desc"),
        limit(500)
      );
      const [sessionsSnap, usersSnap] = await Promise.all([
        getDocs(sessionsQuery),
        getDocs(collection(db, "users")),
      ]);

      setSessions(sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const map = {};
      usersSnap.docs.forEach((d) => {
        const data = d.data();
        map[d.id] = {
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          role: data.role || "",
          profileAvatar: data.profileAvatar || "",
        };
      });
      setUsersMap(map);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Session management ─────────────────────────────────────────────────────

  const handleEndSession = useCallback(async (sessionId) => {
    try {
      await updateDoc(doc(db, "userSessions", sessionId), {
        status: "logged_out",
        loggedOutAt: new Date().toISOString(),
        endedBy: "admin",
      });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, status: "logged_out", loggedOutAt: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  }, []);

  // ── Filtering & enrichment ─────────────────────────────────────────────────

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const cutoff = TIME_CUTOFFS[timeFilter];

    return sessions
      .filter((s) => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (cutoff && s.loginAt && now - new Date(s.loginAt) > cutoff) return false;
        return true;
      })
      .map((s) => {
        const userData = usersMap[s.uid] || {};
        return {
          ...s,
          name: userData.name || s.email?.split("@")[0] || "Unknown",
          role: userData.role || s.role || "",
        };
      });
  }, [sessions, statusFilter, timeFilter, usersMap]);

  const activeSessions = useMemo(() => sessions.filter((s) => s.status === "active"), [sessions]);

  // ── Table definition ───────────────────────────────────────────────────────

  useEffect(() => {
    setTableData({
      columns: [
        {
          Header: "User",
          accessor: "name",
          Cell: ({ row }) => {
            const { name, email } = row.original;
            return (
              <MDBox>
                <MDTypography variant="button" fontWeight="medium" display="block">
                  {name || "—"}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  {email || "—"}
                </MDTypography>
              </MDBox>
            );
          },
        },
        {
          Header: "Role",
          accessor: "role",
          Cell: ({ value }) => (
            <Chip
              label={formatRole(value)}
              color={getRoleColor(value)}
              size="small"
              variant="outlined"
            />
          ),
        },
        {
          Header: "Status",
          accessor: "status",
          Cell: ({ value }) => (
            <Chip
              label={value === "active" ? "Active" : "Logged Out"}
              color={value === "active" ? "success" : "default"}
              size="small"
              icon={
                <Icon sx={{ fontSize: "14px !important" }}>
                  {value === "active" ? "circle" : "cancel"}
                </Icon>
              }
            />
          ),
        },
        {
          Header: "Device",
          accessor: "deviceType",
          Cell: ({ value }) => {
            const icon = DEVICE_ICONS[value] || "devices";
            return (
              <MDBox display="flex" alignItems="center" gap={0.5}>
                <Icon sx={{ fontSize: "18px", color: "text.secondary" }}>{icon}</Icon>
                <MDTypography variant="caption">{value || "Unknown"}</MDTypography>
              </MDBox>
            );
          },
        },
        {
          Header: "Browser",
          accessor: "browser",
          Cell: ({ value }) => (
            <MDTypography variant="caption">{value || "—"}</MDTypography>
          ),
        },
        {
          Header: "OS",
          accessor: "os",
          Cell: ({ value }) => (
            <MDTypography variant="caption">{value || "—"}</MDTypography>
          ),
        },
        {
          Header: "Logged In",
          accessor: "loginAt",
          sortType: (rowA, rowB) => {
            const a = rowA.original.loginAt ? new Date(rowA.original.loginAt).getTime() : 0;
            const b = rowB.original.loginAt ? new Date(rowB.original.loginAt).getTime() : 0;
            return a - b;
          },
          Cell: ({ value }) => {
            if (!value) return "—";
            return (
              <Tooltip title={formatFullDate(value)}>
                <span style={{ cursor: "default" }}>{getTimeAgo(value)}</span>
              </Tooltip>
            );
          },
        },
        {
          Header: "Logged Out",
          accessor: "loggedOutAt",
          Cell: ({ row }) => {
            const { status, loggedOutAt } = row.original;
            if (status === "active") {
              return <MDTypography variant="caption" color="text">—</MDTypography>;
            }
            if (!loggedOutAt) return "—";
            return (
              <Tooltip title={formatFullDate(loggedOutAt)}>
                <span style={{ cursor: "default" }}>{getTimeAgo(loggedOutAt)}</span>
              </Tooltip>
            );
          },
        },
        {
          Header: "Actions",
          accessor: "actions",
          width: "8%",
          Cell: ({ row }) => {
            const { id, status, uid } = row.original;
            const isOwnSession = uid === currentUser?.uid;
            if (status !== "active" || isOwnSession) return null;
            return (
              <Tooltip title="Mark as Logged Out">
                <IconButton
                  size="small"
                  onClick={() => handleEndSession(id)}
                  sx={{ color: "#d32f2f" }}
                >
                  <Icon fontSize="small">logout</Icon>
                </IconButton>
              </Tooltip>
            );
          },
        },
      ],
      rows: filteredSessions,
    });
  }, [filteredSessions, handleEndSession, currentUser]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3} lineHeight={1}>
            {/* Header row */}
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
              mb={3}
            >
              <MDBox>
                <MDTypography variant="h5" fontWeight="medium">
                  Logged In Users
                </MDTypography>
                <MDTypography variant="button" color="text">
                  {activeSessions.length} active session
                  {activeSessions.length !== 1 ? "s" : ""}
                  {filteredSessions.length !== activeSessions.length &&
                    ` • ${filteredSessions.length} shown`}
                </MDTypography>
              </MDBox>

              <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Time Range</InputLabel>
                  <Select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    label="Time Range"
                  >
                    {TIME_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <MDButton
                  variant="outlined"
                  color="info"
                  size="small"
                  onClick={fetchData}
                  startIcon={<Icon>refresh</Icon>}
                >
                  Refresh
                </MDButton>
              </MDBox>
            </MDBox>

            {/* Table */}
            {loading ? (
              <MDBox display="flex" justifyContent="center" py={6}>
                <MDTypography variant="button" color="text">
                  Loading sessions…
                </MDTypography>
              </MDBox>
            ) : filteredSessions.length === 0 ? (
              <MDBox display="flex" justifyContent="center" py={6}>
                <MDTypography variant="button" color="text">
                  No sessions found for the selected filters.
                </MDTypography>
              </MDBox>
            ) : (
              <DataTable
                table={tableData}
                canSearch
                entriesPerPage={{ defaultValue: 25, entries: [10, 25, 50, 100] }}
              />
            )}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default LoggedInUsers;
