import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "config/firebase";
import { callCloudFunctionStrict } from "utils/api";
import { useAuth } from "context/AuthContext";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DefaultLineChart from "examples/Charts/LineCharts/DefaultLineChart";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

const LISTS = [
  { key: "bounces", label: "Bounces", help: "Address rejected the email. SendGrid won't try these again." },
  { key: "blocks", label: "Blocks", help: "The receiving server refused the email (often temporary or a reputation issue)." },
  { key: "spam_reports", label: "Spam reports", help: "The recipient marked an email as spam." },
  { key: "invalid_emails", label: "Invalid addresses", help: "The address doesn't exist or is badly formed." },
  { key: "unsubscribes", label: "Unsubscribes", help: "Unsubscribed via SendGrid." },
];

const num = (n) => (n || 0).toLocaleString("en-GB");
const rate = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—");
const fmt = (value) => {
  const d = typeof value === "number" ? new Date(value) : new Date(value || "");
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const profilePath = (u) => (u.role === "model" ? `/admin/model/${u.uid}/settings` : `/admin/user/${u.uid}/settings`);

const STATUS_CHIP = {
  delivered: { label: "Delivered", color: "success" },
  not_delivered: { label: "Not delivered", color: "error" },
  processing: { label: "Processing", color: "warning" },
  processed: { label: "Processing", color: "warning" },
};

function Stat({ value, label, help, color }) {
  return (
    <Card sx={{ p: 2, height: "100%" }}>
      <MDTypography variant="h4" fontWeight="bold" color={color}>{value}</MDTypography>
      <MDTypography variant="button" fontWeight="medium" display="block">{label}</MDTypography>
      {help && <MDTypography variant="caption" color="text" display="block">{help}</MDTypography>}
    </Card>
  );
}

function EmailDelivery() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super admin";

  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(30);
  const [usersByEmail, setUsersByEmail] = useState(new Map());

  // Overview
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");

  // Activity
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activityPage, setActivityPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Suppressions
  const [listKey, setListKey] = useState("bounces");
  const [listData, setListData] = useState({});
  const [listCounts, setListCounts] = useState(null);
  const [listError, setListError] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listPage, setListPage] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // email -> user, so addresses can link to the person's profile
  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const map = new Map();
        snap.docs.forEach((d) => {
          const u = d.data();
          if (u.email) {
            map.set(u.email.toLowerCase(), { uid: d.id, role: u.role, name: `${u.firstName || ""} ${u.lastName || ""}`.trim() });
          }
        });
        setUsersByEmail(map);
      })
      .catch((err) => console.error("Could not load users for linking:", err));
  }, []);

  useEffect(() => {
    setStats(null);
    setStatsError("");
    callCloudFunctionStrict("sendgridStats", { days })
      .then(setStats)
      .catch((err) => setStatsError(err.message || "Could not load stats."));
  }, [days]);

  const loadActivity = () => {
    setActivityLoading(true);
    setActivityError("");
    callCloudFunctionStrict("sendgridActivity", { days, limit: 500, ...(statusFilter !== "all" ? { status: statusFilter } : {}) })
      .then((res) => {
        setActivity(res);
        setActivityPage(0);
      })
      .catch((err) => setActivityError(err.message || "Could not load activity."))
      .finally(() => setActivityLoading(false));
  };

  useEffect(() => {
    if (tab === 1) loadActivity();
  }, [tab, days, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadList = (key) => {
    setListLoading(true);
    setListError("");
    callCloudFunctionStrict("sendgridSuppressions", { type: key })
      .then((res) => {
        setListCounts(res.counts);
        setListData((prev) => ({ ...prev, [key]: res.list }));
        setListPage(0);
      })
      .catch((err) => setListError(err.message || "Could not load the list."))
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    if (tab === 2) loadList(listKey);
  }, [tab, listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = (msgId) => {
    setDetail({ msgId });
    setDetailLoading(true);
    callCloudFunctionStrict("sendgridMessage", { msgId })
      .then(setDetail)
      .catch((err) => setDetail({ msgId, error: err.message || "Could not load this email." }))
      .finally(() => setDetailLoading(false));
  };

  const handleSync = async () => {
    if (!window.confirm("Copy SendGrid's bounces, invalid addresses, spam reports and unsubscribes into the platform's own suppression list? Spam reporters and unsubscribers will also be marked as opted out.")) return;
    setSyncing(true);
    setSyncResult(null);
    setListError("");
    try {
      setSyncResult(await callCloudFunctionStrict("sendgridSyncSuppressions", {}, { timeout: 540000 }));
    } catch (err) {
      setListError(err.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const personCell = (email) => {
    const u = usersByEmail.get((email || "").toLowerCase());
    return (
      <>
        {u ? (
          <MDTypography component={Link} to={profilePath(u)} variant="button" fontWeight="medium" color="info" display="block">
            {u.name || email}
          </MDTypography>
        ) : null}
        <MDTypography variant="caption" color="text" display="block">{email}</MDTypography>
      </>
    );
  };

  // ---- derived ----
  const totals = stats?.totals || {};
  const failed = (totals.bounces || 0) + (totals.blocks || 0);
  const failRate = totals.requests > 0 ? failed / totals.requests : 0;

  const chart = useMemo(() => {
    const series = stats?.series || [];
    return {
      labels: series.map((s) => new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })),
      datasets: [
        { label: "Delivered", color: "success", data: series.map((s) => s.delivered || 0) },
        { label: "Opened", color: "info", data: series.map((s) => s.unique_opens || 0) },
        { label: "Clicked", color: "primary", data: series.map((s) => s.unique_clicks || 0) },
        { label: "Bounced", color: "error", data: series.map((s) => (s.bounces || 0) + (s.blocks || 0)) },
      ],
    };
  }, [stats]);

  const activityRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (activity?.messages || []).filter(
      (m) => !term || (m.email || "").toLowerCase().includes(term) || (m.subject || "").toLowerCase().includes(term) ||
        (usersByEmail.get((m.email || "").toLowerCase())?.name || "").toLowerCase().includes(term)
    );
  }, [activity, search, usersByEmail]);

  const currentList = listData[listKey] || [];
  const listMeta = LISTS.find((l) => l.key === listKey);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3} display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">Email Delivery</MDTypography>
            <MDTypography variant="body2" color="text">
              What happened to the emails we sent: delivered, opened, clicked, bounced and reported as spam. Live from SendGrid.
            </MDTypography>
          </MDBox>
          {tab !== 2 && (
            <TextField select size="small" label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ minWidth: 150 }} SelectProps={{ sx: { height: 36 } }}>
              {RANGES.map((r) => <MenuItem key={r.days} value={r.days}>{r.label}</MenuItem>)}
            </TextField>
          )}
        </MDBox>

        <Card sx={{ mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Overview" />
            <Tab label="Activity" />
            <Tab label="Bounces and reports" />
          </Tabs>
        </Card>

        {/* ───────────────── Overview ───────────────── */}
        {tab === 0 && (
          <>
            {statsError && <Alert severity="error" sx={{ mb: 2 }}>{statsError}</Alert>}
            {!stats && !statsError && <MDBox display="flex" justifyContent="center" py={5}><CircularProgress /></MDBox>}
            {stats && (
              <>
                {failRate > 0.05 && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    {rate(failed, totals.requests)} of emails in this period bounced or were blocked ({num(failed)} of {num(totals.requests)}).
                    A rate above about 5% can harm your sender reputation and push future emails to spam.
                    Open the <strong>Bounces and reports</strong> tab and use <strong>Sync to platform</strong> so these addresses are never emailed again, then consider cleaning the list.
                  </Alert>
                )}

                <Grid container spacing={2} mb={3}>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.requests)} label="Sent" help="Emails handed to SendGrid" /></Grid>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.delivered)} label="Delivered" help={`${rate(totals.delivered, totals.requests)} of sent`} color="success" /></Grid>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.unique_opens)} label="Opened" help={`${rate(totals.unique_opens, totals.delivered)} of delivered. Approximate, and only tracked on marketing email.`} /></Grid>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.unique_clicks)} label="Clicked" help={`${rate(totals.unique_clicks, totals.delivered)} of delivered`} /></Grid>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.bounces)} label="Bounced" help={`${rate(totals.bounces, totals.requests)} of sent`} color={totals.bounces ? "error" : undefined} /></Grid>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.blocks)} label="Blocked" help="Refused by the receiving server" color={totals.blocks ? "error" : undefined} /></Grid>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.spam_reports)} label="Spam reports" help="Marked as spam by the recipient" color={totals.spam_reports ? "error" : undefined} /></Grid>
                  <Grid item xs={6} md={4} lg={3}><Stat value={num(totals.unsubscribes)} label="Unsubscribes" help={`${num(totals.deferred)} deferred`} /></Grid>
                </Grid>

                <MDBox mb={3}>
                  <DefaultLineChart title="Emails per day" description="Delivered, opened, clicked and bounced or blocked" height="20rem" chart={chart} />
                </MDBox>

                {stats.byCategory?.length > 0 && (
                  <Card sx={{ p: 2 }}>
                    <MDTypography variant="h6" fontWeight="medium" mb={1}>By type of email</MDTypography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell align="right"><strong>Sent</strong></TableCell>
                            <TableCell align="right"><strong>Delivered</strong></TableCell>
                            <TableCell align="right"><strong>Opened</strong></TableCell>
                            <TableCell align="right"><strong>Clicked</strong></TableCell>
                            <TableCell align="right"><strong>Bounced</strong></TableCell>
                            <TableCell align="right"><strong>Blocked</strong></TableCell>
                            <TableCell align="right"><strong>Spam</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stats.byCategory.map((c) => (
                            <TableRow key={c.name} hover>
                              <TableCell>{c.name}</TableCell>
                              <TableCell align="right">{num(c.requests)}</TableCell>
                              <TableCell align="right">{num(c.delivered)}</TableCell>
                              <TableCell align="right">{num(c.unique_opens)}</TableCell>
                              <TableCell align="right">{num(c.unique_clicks)}</TableCell>
                              <TableCell align="right">{num(c.bounces)}</TableCell>
                              <TableCell align="right">{num(c.blocks)}</TableCell>
                              <TableCell align="right">{num(c.spam_reports)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* ───────────────── Activity ───────────────── */}
        {tab === 1 && (
          <Card sx={{ p: 2 }}>
            <MDBox display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
              <TextField size="small" placeholder="Search name, email or subject" value={search} onChange={(e) => { setSearch(e.target.value); setActivityPage(0); }} sx={{ minWidth: 260 }} />
              <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }} SelectProps={{ sx: { height: 36 } }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="not_delivered">Not delivered</MenuItem>
              </TextField>
              <MDButton variant="outlined" color="info" size="small" onClick={loadActivity} disabled={activityLoading}>
                <Icon sx={{ mr: 0.5 }}>refresh</Icon>Refresh
              </MDButton>
              {activityLoading && <CircularProgress size={20} />}
              <MDTypography variant="caption" color="text">{activityRows.length} shown</MDTypography>
            </MDBox>
            {activityError && <Alert severity="error" sx={{ mb: 2 }}>{activityError}</Alert>}
            {activity?.truncated && <Alert severity="info" sx={{ mb: 2 }}>Showing the most recent 500 emails. Narrow the period or status to see others.</Alert>}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Last event</strong></TableCell>
                    <TableCell><strong>Recipient</strong></TableCell>
                    <TableCell><strong>Subject</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Opens</strong></TableCell>
                    <TableCell align="right"><strong>Clicks</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activityRows.slice(activityPage * 25, activityPage * 25 + 25).map((m) => {
                    const s = STATUS_CHIP[m.status] || { label: m.status, color: "default" };
                    return (
                      <TableRow key={m.msgId} hover sx={{ cursor: "pointer" }} onClick={() => openDetail(m.msgId)}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(m.lastEventTime)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>{personCell(m.email)}</TableCell>
                        <TableCell>{m.subject}</TableCell>
                        <TableCell><Chip size="small" label={s.label} color={s.color} /></TableCell>
                        <TableCell align="right">{m.opens}</TableCell>
                        <TableCell align="right">{m.clicks}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!activityLoading && activityRows.length === 0 && (
                    <TableRow><TableCell colSpan={6}><MDTypography variant="body2" color="text" textAlign="center" py={2}>No emails match.</MDTypography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={activityRows.length} page={activityPage} onPageChange={(_, p) => setActivityPage(p)} rowsPerPage={25} rowsPerPageOptions={[25]} />
            <MDTypography variant="caption" color="text">Click a row to see everything that happened to that email. SendGrid limits this feed to a few requests a minute, so results are cached briefly.</MDTypography>
          </Card>
        )}

        {/* ───────────────── Suppressions ───────────────── */}
        {tab === 2 && (
          <>
            <Grid container spacing={2} mb={3}>
              {LISTS.map((l) => (
                <Grid item xs={6} md={4} lg key={l.key}>
                  <Card
                    onClick={() => setListKey(l.key)}
                    sx={{ p: 2, cursor: "pointer", height: "100%", border: "2px solid", borderColor: listKey === l.key ? "info.main" : "transparent" }}
                  >
                    <MDTypography variant="h4" fontWeight="bold">{listCounts ? num(listCounts[l.key]) : "…"}</MDTypography>
                    <MDTypography variant="button" fontWeight="medium" display="block">{l.label}</MDTypography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Card sx={{ p: 2 }}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
                <MDTypography variant="body2" color="text">{listMeta?.help}</MDTypography>
                {isSuperAdmin && (
                  <MDButton variant="gradient" color="info" size="small" disabled={syncing} onClick={handleSync}>
                    {syncing ? "Syncing..." : "Sync to platform"}
                  </MDButton>
                )}
              </MDBox>
              {listError && <Alert severity="error" sx={{ mb: 2 }}>{listError}</Alert>}
              {syncResult && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Sync finished: {syncResult.added} addresses added to the platform suppression list, {syncResult.alreadySuppressed} already there,
                  {" "}{syncResult.optedOut} users marked as opted out, and {syncResult.flagged} users flagged
                  as having an email address that doesn&apos;t work (they&apos;ll see a banner asking them to update it).
                </Alert>
              )}
              {listLoading ? (
                <MDBox display="flex" justifyContent="center" py={4}><CircularProgress /></MDBox>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Recipient</strong></TableCell>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Reason</strong></TableCell>
                          <TableCell><strong>Code</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentList.slice(listPage * 25, listPage * 25 + 25).map((r) => (
                          <TableRow key={r.email} hover>
                            <TableCell>{personCell(r.email)}</TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(r.created)}</TableCell>
                            <TableCell sx={{ maxWidth: 480 }}><MDTypography variant="caption" color="text">{r.reason || "—"}</MDTypography></TableCell>
                            <TableCell>{r.status || "—"}</TableCell>
                          </TableRow>
                        ))}
                        {currentList.length === 0 && (
                          <TableRow><TableCell colSpan={4}><MDTypography variant="body2" color="text" textAlign="center" py={2}>Nothing in this list.</MDTypography></TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination component="div" count={currentList.length} page={listPage} onPageChange={(_, p) => setListPage(p)} rowsPerPage={25} rowsPerPageOptions={[25]} />
                </>
              )}
            </Card>
          </>
        )}
      </MDBox>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detail?.subject || "Email details"}</DialogTitle>
        <DialogContent dividers>
          {detailLoading && <MDBox display="flex" justifyContent="center" py={3}><CircularProgress /></MDBox>}
          {detail?.error && <Alert severity="error">{detail.error}</Alert>}
          {detail?.events && (
            <>
              <MDBox mb={2}>{personCell(detail.email)}</MDBox>
              {detail.events.map((e, i) => (
                <MDBox key={i} mb={1.5}>
                  <MDTypography variant="button" fontWeight="medium" display="block" sx={{ textTransform: "capitalize" }}>
                    {String(e.event).replace(/_/g, " ")} <MDTypography variant="caption" color="text">· {fmt(e.at)}</MDTypography>
                  </MDTypography>
                  {e.reason && <MDTypography variant="caption" color="text" display="block">{e.reason}</MDTypography>}
                  {e.url && <MDTypography variant="caption" color="text" display="block">Clicked: {e.url}</MDTypography>}
                </MDBox>
              ))}
              {detail.events.length === 0 && <MDTypography variant="body2" color="text">No event history available.</MDTypography>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={() => setDetail(null)}>Close</MDButton>
        </DialogActions>
      </Dialog>
      <Footer />
    </DashboardLayout>
  );
}

export default EmailDelivery;
