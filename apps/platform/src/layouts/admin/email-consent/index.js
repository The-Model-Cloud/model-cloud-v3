import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import Tooltip from "@mui/material/Tooltip";
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

// Admin profile views: models have their own settings route, everyone else shares the user one
const profilePath = (u) => (u.role === "model" ? `/admin/model/${u.uid}/settings` : `/admin/user/${u.uid}/settings`);

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function EmailConsent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all"); // all | bounced
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
              // Flag set by the SendGrid webhook/sync; only counts while it refers to their current address
              bounced: !!(data.emailBounced?.email && data.email && data.emailBounced.email.toLowerCase() === data.email.toLowerCase()),
              bounceReason: data.emailBounced?.reason || "",
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

  const bouncedCount = useMemo(() => groupFiltered.filter((u) => u.bounced).length, [groupFiltered]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groupFiltered
      .filter((u) => statusFilter === "all" || u.status === statusFilter)
      .filter((u) => deliveryFilter === "all" || u.bounced)
      .filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groupFiltered, statusFilter, deliveryFilter, search]);

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const exportCsv = () => {
    const header = ["Name", "Email", "Role", "Consent status", "Source", "Consent date", "Migration email sent", "Email bounced", "Bounce reason"];
    const lines = rows.map((u) =>
      [u.name, u.email, u.role, STATUS_BY_KEY[u.status]?.label || u.status, u.source, fmt(u.date), fmt(u.migrationEmailSentAt), u.bounced ? "Yes" : "", u.bounceReason]
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

            {bouncedCount > 0 && (
              <Alert
                severity="warning"
                sx={{ mb: 3 }}
                action={
                  deliveryFilter === "all" ? (
                    <MDButton variant="text" color="warning" size="small" onClick={() => { setDeliveryFilter("bounced"); setPage(0); }}>
                      Show them
                    </MDButton>
                  ) : null
                }
              >
                <strong>{bouncedCount}</strong> {bouncedCount === 1 ? "account has" : "accounts have"} an email address that
                bounced, so they can&apos;t receive any email from us. They are shown a banner asking them to update it
                when they next sign in. Use the &quot;Email address&quot; filter and Export CSV to review them.
              </Alert>
            )}

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
                <TextField
                  select
                  size="small"
                  label="Email address"
                  value={deliveryFilter}
                  onChange={(e) => {
                    setDeliveryFilter(e.target.value);
                    setPage(0);
                  }}
                  sx={{ minWidth: 190 }}
                  SelectProps={{ sx: { height: 36 } }}
                >
                  <MenuItem value="all">Any</MenuItem>
                  <MenuItem value="bounced">Bouncing ({bouncedCount})</MenuItem>
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
                        <TableCell>
                          {u.name ? (
                            <MDTypography
                              component={Link}
                              to={profilePath(u)}
                              variant="button"
                              fontWeight="medium"
                              color="info"
                            >
                              {u.name}
                            </MDTypography>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {u.email || "—"}
                          {u.bounced && (
                            <Tooltip title={u.bounceReason || "Emails to this address were rejected"}>
                              <Chip size="small" color="error" label="Bounced" sx={{ ml: 1 }} />
                            </Tooltip>
                          )}
                        </TableCell>
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
