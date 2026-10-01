import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "config/firebase";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// MUI
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Statuses in display order. "none" means the user has no marketingConsent record at all.
const STATUSES = [
  { key: "opted_in", label: "Opted in", color: "success", help: "Will receive marketing emails" },
  { key: "opted_out", label: "Opted out", color: "error", help: "Unsubscribed" },
  { key: "unconfirmed", label: "Awaiting confirmation", color: "warning", help: "Migrated users who haven't responded" },
  { key: "not_opted_in", label: "Signed up, not opted in", color: "default", help: "Didn't tick the sign-up box" },
  { key: "none", label: "No record", color: "default", help: "Backfill not applied yet, or signed up before the checkbox" },
];
const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

const ROLE_GROUPS = {
  model: "Models",
  client: "Clients",
  "account manager": "Clients",
  admin: "Admins",
  "super admin": "Admins",
};
const groupOf = (role) => ROLE_GROUPS[role] || "Other";

// Dates are stored as Firestore Timestamps or ISO strings
const toDate = (value) => {
  if (!value) return null;
  const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmt = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
};

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function EmailConsent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(
          snap.docs.map((d) => {
            const data = d.data();
            const consent = data.marketingConsent || {};
            return {
              uid: d.id,
              name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
              email: data.email || "",
              role: data.role || "",
              group: groupOf(data.role),
              status: consent.status || "none",
              source: consent.source || "",
              date: consent.date || null,
              migrationEmailSentAt: data.migrationOptInEmailSentAt || null,
            };
          })
        );
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Could not load users. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Counts per status, respecting the group filter so the cards match the table below
  const groupFiltered = useMemo(
    () => (groupFilter === "all" ? users : users.filter((u) => u.group === groupFilter)),
    [users, groupFilter]
  );
  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
    groupFiltered.forEach((u) => {
      c[STATUS_BY_KEY[u.status] ? u.status : "none"] += 1;
    });
    return c;
  }, [groupFiltered]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groupFiltered
      .filter((u) => statusFilter === "all" || u.status === statusFilter)
      .filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groupFiltered, statusFilter, search]);

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const exportCsv = () => {
    const header = ["Name", "Email", "Role", "Consent status", "Source", "Consent date", "Migration email sent"];
    const lines = rows.map((u) =>
      [u.name, u.email, u.role, STATUS_BY_KEY[u.status]?.label || u.status, u.source, fmt(u.date), fmt(u.migrationEmailSentAt)]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-consent-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectStatus = (key) => {
    setStatusFilter((prev) => (prev === key ? "all" : key));
    setPage(0);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Email Consent
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Who has opted in to marketing email, who has opted out, and who hasn&apos;t responded.
            Click a card to filter the list.
          </MDTypography>
        </MDBox>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <MDBox display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </MDBox>
        ) : (
          <>
            <Grid container spacing={2} mb={3}>
              {STATUSES.map((s) => (
                <Grid item xs={6} md={4} lg key={s.key}>
                  <Card
                    onClick={() => selectStatus(s.key)}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      height: "100%",
                      border: statusFilter === s.key ? "2px solid" : "2px solid transparent",
                      borderColor: statusFilter === s.key ? "info.main" : "transparent",
                    }}
                  >
                    <MDTypography variant="h3" fontWeight="bold">
                      {counts[s.key]}
                    </MDTypography>
                    <MDTypography variant="button" fontWeight="medium" display="block">
                      {s.label}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block">
                      {s.help}
                    </MDTypography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Card sx={{ p: 3 }}>
              <MDBox display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
                <TextField
                  size="small"
                  placeholder="Search name or email"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: 240 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon fontSize="small">search</Icon>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  select
                  size="small"
                  label="Group"
                  value={groupFilter}
                  onChange={(e) => {
                    setGroupFilter(e.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: 150 }}
                  SelectProps={{ sx: { height: 36 } }}
                >
                  <MenuItem value="all">Everyone</MenuItem>
                  <MenuItem value="Models">Models</MenuItem>
                  <MenuItem value="Clients">Clients (incl. account managers)</MenuItem>
                  <MenuItem value="Admins">Admins</MenuItem>
                </TextField>
                <MDTypography variant="button" color="text">
                  {rows.length} user{rows.length !== 1 ? "s" : ""}
                  {statusFilter !== "all" ? ` · ${STATUS_BY_KEY[statusFilter].label}` : ""}
                </MDTypography>
                <MDBox ml="auto">
                  <MDButton variant="outlined" color="info" size="small" onClick={exportCsv} disabled={rows.length === 0}>
                    <Icon sx={{ mr: 0.5 }}>download</Icon>
                    Export CSV
                  </MDButton>
                </MDBox>
              </MDBox>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Role</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Source</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Migration email</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pageRows.map((u) => (
                      <TableRow key={u.uid} hover>
                        <TableCell>{u.name || "—"}</TableCell>
                        <TableCell>{u.email || "—"}</TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>{u.role || "—"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={STATUS_BY_KEY[u.status]?.label || u.status}
                            color={STATUS_BY_KEY[u.status]?.color || "default"}
                          />
                        </TableCell>
                        <TableCell>{u.source || "—"}</TableCell>
                        <TableCell>{fmt(u.date) || "—"}</TableCell>
                        <TableCell>{u.migrationEmailSentAt ? `Sent ${fmt(u.migrationEmailSentAt)}` : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {pageRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <MDTypography variant="body2" color="text" textAlign="center" py={2}>
                            No users match these filters.
                          </MDTypography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={rows.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[25, 50, 100]}
              />
            </Card>
          </>
        )}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default EmailConsent;
