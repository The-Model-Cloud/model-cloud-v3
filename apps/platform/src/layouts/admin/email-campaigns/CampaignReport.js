import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { callCloudFunctionStrict } from "utils/api";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import LinearProgress from "@mui/material/LinearProgress";
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

import { STATUS_META, audienceLabel, categoryLabel, fmtDateTime, pct } from "./constants";

const REFRESH_MS = 15000;

const RECIPIENT_STATUS = {
  queued: { label: "Queued", color: "default" },
  sending: { label: "Sending", color: "warning" },
  sent: { label: "Sent", color: "success" },
  skipped: { label: "Skipped", color: "default" },
  failed: { label: "Failed", color: "error" },
};

function Stat({ value, label, help }) {
  return (
    <Card sx={{ p: 2, height: "100%" }}>
      <MDTypography variant="h4" fontWeight="bold">{value}</MDTypography>
      <MDTypography variant="button" fontWeight="medium" display="block">{label}</MDTypography>
      {help && <MDTypography variant="caption" color="text" display="block">{help}</MDTypography>}
    </Card>
  );
}

/** Results page for a campaign that has been scheduled or sent. */
function CampaignReport({ campaignId, onChanged }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = () =>
    callCloudFunctionStrict("emailCampaignGet", { id: campaignId, withRecipients: true })
      .then(setData)
      .catch((err) => setError(err.message || "Could not load the report."));

  useEffect(() => {
    load();
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the numbers live while the campaign is going out
  const status = data?.campaign.status;
  useEffect(() => {
    if (!["scheduled", "sending"].includes(status)) return undefined;
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn, name, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      await callCloudFunctionStrict(fn, { id: campaignId });
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message || `Could not ${name}.`);
    } finally {
      setBusy(false);
    }
  };

  const recipients = data?.recipients;
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (recipients || [])
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => !term || (r.name || "").toLowerCase().includes(term) || (r.email || "").toLowerCase().includes(term))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [recipients, statusFilter, search]);

  if (!data) {
    return error ? <Alert severity="error">{error}</Alert> : null;
  }

  const c = data.campaign;
  const counts = c.counts || {};
  const meta = STATUS_META[c.status] || { label: c.status, color: "default" };
  const processed = (counts.sent || 0) + (counts.failed || 0) + (counts.skipped || 0);
  const live = ["scheduled", "sending"].includes(c.status);

  return (
    <>
      <MDBox mb={3} display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <MDBox>
          <MDBox display="flex" alignItems="center" gap={1} mb={0.5}>
            <MDTypography variant="h4" fontWeight="medium">{c.name}</MDTypography>
            <Chip size="small" label={meta.label} color={meta.color} />
          </MDBox>
          <MDTypography variant="body2" color="text" display="block">Subject: {c.subject}</MDTypography>
          <MDTypography variant="caption" color="text" display="block">
            {audienceLabel(c.audience)} · {categoryLabel(c.category)}
            {c.scheduledAt ? ` · ${c.status === "scheduled" ? "Scheduled for" : "Started"} ${fmtDateTime(c.startedAt || c.scheduledAt)}` : ""}
            {c.completedAt ? ` · Finished ${fmtDateTime(c.completedAt)}` : ""}
          </MDTypography>
        </MDBox>
        <MDBox display="flex" gap={1}>
          {c.status === "paused" && (
            <MDButton variant="gradient" color="info" size="small" disabled={busy} onClick={() => act("emailCampaignSend", "resume")}>
              Resume
            </MDButton>
          )}
          {["scheduled", "sending", "paused"].includes(c.status) && (
            <MDButton
              variant="outlined" color="error" size="small" disabled={busy}
              onClick={() => act("emailCampaignCancel", "cancel", "Cancel this campaign? Anyone already emailed stays emailed, and nobody else will be sent to.")}
            >
              Cancel campaign
            </MDButton>
          )}
          <MDButton variant="outlined" color="secondary" size="small" onClick={() => navigate("/admin/email/campaigns")}>
            Back to campaigns
          </MDButton>
        </MDBox>
      </MDBox>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {c.status === "paused" && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Sending was paused ({c.pauseReason === "emails_disabled" ? "system-wide emails are switched off in Platform Settings" : c.pauseReason}).
          Fix that, then click Resume.
        </Alert>
      )}
      {live && counts.recipients > 0 && (
        <Card sx={{ p: 2, mb: 3 }}>
          <MDTypography variant="body2" color="text" mb={1}>
            Sending: {processed} of {counts.recipients} processed
          </MDTypography>
          <LinearProgress variant="determinate" value={Math.min(100, (processed / counts.recipients) * 100)} />
        </Card>
      )}
      {c.status === "scheduled" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Waiting for the scheduled time. The recipient list is taken at that moment, so it reflects anyone who opts out before then.
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}><Stat value={counts.recipients ?? 0} label="Recipients" help="Eligible when sending started" /></Grid>
        <Grid item xs={6} md={3}><Stat value={counts.sent ?? 0} label="Sent" help={`${counts.skipped || 0} skipped, ${counts.failed || 0} failed`} /></Grid>
        <Grid item xs={6} md={3}><Stat value={counts.delivered ?? 0} label="Delivered" help={pct(counts.delivered, counts.sent)} /></Grid>
        <Grid item xs={6} md={3}><Stat value={pct(counts.opened, counts.sent)} label="Opened" help={`${counts.opened || 0} people (approximate)`} /></Grid>
        <Grid item xs={6} md={3}><Stat value={pct(counts.clicked, counts.sent)} label="Clicked" help={`${counts.clicked || 0} people`} /></Grid>
        <Grid item xs={6} md={3}><Stat value={counts.visitors ?? 0} label="Visited the site" help={`${counts.visits || 0} visits in total`} /></Grid>
        <Grid item xs={6} md={3}><Stat value={counts.bounced ?? 0} label="Bounced" help={`${counts.dropped || 0} dropped`} /></Grid>
        <Grid item xs={6} md={3}><Stat value={counts.unsubscribed ?? 0} label="Unsubscribed" help={`${counts.spam || 0} marked as spam`} /></Grid>
      </Grid>
      <MDTypography variant="caption" color="text" display="block" mb={3}>
        Open rates are approximate: some mail apps (such as Apple Mail) load images automatically, which counts as an open.
        Clicks and site visits are the more reliable measures. Delivery, open, click and bounce figures need the SendGrid webhook to be connected.
      </MDTypography>

      {data.topLinks?.length > 0 && (
        <Card sx={{ p: 2, mb: 3 }}>
          <MDTypography variant="h6" fontWeight="medium" mb={1}>Most clicked links</MDTypography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Link</strong></TableCell>
                  <TableCell align="right"><strong>Clicks</strong></TableCell>
                  <TableCell align="right"><strong>People</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topLinks.map((l) => (
                  <TableRow key={l.url}>
                    <TableCell sx={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis" }}>{l.url}</TableCell>
                    <TableCell align="right">{l.clicks}</TableCell>
                    <TableCell align="right">{l.people}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Card sx={{ p: 2 }}>
        <MDBox display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
          <MDTypography variant="h6" fontWeight="medium">Recipients</MDTypography>
          <TextField
            size="small" placeholder="Search name or email" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ minWidth: 220 }}
          />
          <TextField
            select size="small" label="Status" value={statusFilter} sx={{ minWidth: 140 }}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} SelectProps={{ sx: { height: 36 } }}
          >
            <MenuItem value="all">All</MenuItem>
            {Object.entries(RECIPIENT_STATUS).map(([key, s]) => <MenuItem key={key} value={key}>{s.label}</MenuItem>)}
          </TextField>
          <MDTypography variant="caption" color="text">{rows.length} shown</MDTypography>
        </MDBox>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Delivered</strong></TableCell>
                <TableCell><strong>Opened</strong></TableCell>
                <TableCell><strong>Clicked</strong></TableCell>
                <TableCell><strong>Visited</strong></TableCell>
                <TableCell><strong>Notes</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((r) => {
                const s = RECIPIENT_STATUS[r.status] || { label: r.status, color: "default" };
                const notes = [r.reason, r.bouncedAt && "bounced", r.spamAt && "spam report", r.unsubscribedAt && "unsubscribed"].filter(Boolean).join(", ");
                const yes = (v) => (v ? "Yes" : "—");
                return (
                  <TableRow key={r.uid} hover>
                    <TableCell>{r.name || "—"}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell><Chip size="small" label={s.label} color={s.color} /></TableCell>
                    <TableCell>{yes(r.deliveredAt)}</TableCell>
                    <TableCell>{r.openCount ? `Yes (${r.openCount})` : "—"}</TableCell>
                    <TableCell>{r.clickCount ? `Yes (${r.clickCount})` : "—"}</TableCell>
                    <TableCell>{r.visitCount ? `Yes (${r.visitCount})` : "—"}</TableCell>
                    <TableCell>{notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <MDTypography variant="body2" color="text" textAlign="center" py={2}>
                      {c.status === "scheduled" ? "Recipients are listed once sending starts." : "No recipients match."}
                    </MDTypography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={rows.length} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage} rowsPerPageOptions={[25, 50, 100]}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Card>
    </>
  );
}

export default CampaignReport;
