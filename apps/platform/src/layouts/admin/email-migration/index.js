import { useRef, useState } from "react";
import { callCloudFunctionStrict } from "utils/api";
import { useAuth } from "context/AuthContext";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// MUI
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const BATCH_SIZE = 100;
const AUDIENCE_LABELS = { all: "all users", models: "models", clients: "clients" };

/**
 * Super admin tool for the one-off "You've moved to the new Model Cloud" service email
 * (contains the "Continue Opt-In" button). A dry run is always required before anything is sent.
 */
function EmailMigration() {
  const { user } = useAuth();

  // Step 1: backfill
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillPreview, setBackfillPreview] = useState(null);
  const [backfillResult, setBackfillResult] = useState(null);
  const [backfillError, setBackfillError] = useState("");

  // Steps 2 and 3: recipients and send
  const [audience, setAudience] = useState("models");
  const [onlyEmail, setOnlyEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null); // { done, total }
  const [error, setError] = useState("");
  const stopRef = useRef(false);

  const runBackfill = async (dryRun) => {
    setBackfillBusy(true);
    setBackfillError("");
    try {
      const res = await callCloudFunctionStrict("backfillMarketingConsent", { dryRun });
      if (dryRun) {
        setBackfillPreview(res);
        setBackfillResult(null);
      } else {
        setBackfillResult(res);
        setBackfillPreview(null);
      }
    } catch (err) {
      setBackfillError(err.message || "Request failed");
    } finally {
      setBackfillBusy(false);
    }
  };

  const single = onlyEmail.trim();
  const basePayload = () => (single ? { onlyEmail: single } : { audience });

  const invalidate = () => {
    setPreview(null);
    setResult(null);
  };

  const handleDryRun = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setPreview(
        await callCloudFunctionStrict("sendMigrationOptInEmails", { ...basePayload(), dryRun: true, limit: BATCH_SIZE })
      );
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      setResult(await callCloudFunctionStrict("sendMigrationOptInEmails", { testEmail: user?.email }));
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  // Sends in batches of BATCH_SIZE, following a cursor so each user is only ever attempted once per run.
  const handleSend = async () => {
    const sendTotal = single ? 1 : preview.audienceTotal;
    setBusy(true);
    setError("");
    setResult(null);
    stopRef.current = false;
    setProgress({ done: 0, total: sendTotal });

    const totals = { sent: 0, skipped: 0, failed: 0, skippedReasons: {} };
    let afterUid = "";
    let stopped = false;
    try {
      for (;;) {
        const res = await callCloudFunctionStrict("sendMigrationOptInEmails", {
          ...basePayload(),
          dryRun: false,
          limit: BATCH_SIZE,
          afterUid,
        });
        totals.sent += res.sent;
        totals.skipped += res.skipped;
        totals.failed += res.failed;
        Object.entries(res.skippedReasons || {}).forEach(([k, n]) => {
          totals.skippedReasons[k] = (totals.skippedReasons[k] || 0) + n;
        });
        setProgress({ done: totals.sent + totals.skipped + totals.failed, total: sendTotal });

        afterUid = res.lastUid;
        if (single || res.remaining === 0) break;
        if (stopRef.current) {
          stopped = true;
          break;
        }
      }
      setResult({ ...totals, stopped });
    } catch (err) {
      setError(`${err.message || "Request failed"} (sent so far: ${totals.sent}). Run a dry run to see what is left.`);
      setResult({ ...totals, stopped: true });
    } finally {
      setBusy(false);
      setProgress(null);
      setPreview(null); // force a fresh dry run before any further send
    }
  };

  const total = single ? preview?.wouldSendNow ?? 0 : preview?.audienceTotal ?? 0;
  const counts = preview?.pendingByAudience;
  const optionLabel = (key, label) =>
    `${label}${counts ? ` (${key === "all" ? counts.models + counts.clients : counts[key]} still to email)` : ""}`;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Email Migration: Continue Opt-In
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Sends the one-off service email to migrated users, asking them to confirm they want
            marketing emails. Nothing is sent until you have run a dry run and confirmed the count.
          </MDTypography>
        </MDBox>

        <Grid container spacing={3}>
          {/* ── Step 1: backfill ───────────────────────────────── */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <MDTypography variant="h6" fontWeight="medium" mb={1}>
                Step 1: Prepare consent records
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={2}>
                Marks every existing account created before 1 March 2026 as a legacy user who has not
                yet confirmed marketing consent. They cannot receive marketing until they click
                Continue Opt-In. Accounts created from 1 March 2026 are left alone, and anyone who
                already has a consent record is never changed. Safe to run more than once.
              </MDTypography>

              {backfillError && <Alert severity="error" sx={{ mb: 2 }}>{backfillError}</Alert>}

              {backfillPreview && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Dry run: {backfillPreview.totalUsers} users in total.{" "}
                  <strong>{backfillPreview.tagLegacy} would be marked as legacy</strong>
                  {Object.keys(backfillPreview.byRole || {}).length > 0 &&
                    ` (${Object.entries(backfillPreview.byRole).map(([r, n]) => `${n} ${r}`).join(", ")})`}
                  . Skipped: {backfillPreview.alreadyHasConsent} already have consent,{" "}
                  {backfillPreview.postCutoff} created since 1 March 2026, {backfillPreview.noEmail} have no email.
                </Alert>
              )}

              {backfillResult && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Done: {backfillResult.written} accounts marked as legacy.
                </Alert>
              )}

              <MDBox display="flex" gap={1} alignItems="center">
                <MDButton variant="gradient" color="info" disabled={backfillBusy} onClick={() => runBackfill(true)}>
                  Dry run
                </MDButton>
                <MDButton
                  variant="gradient"
                  color="error"
                  disabled={backfillBusy || !backfillPreview || backfillPreview.tagLegacy === 0}
                  onClick={() => {
                    if (window.confirm(`Mark ${backfillPreview.tagLegacy} accounts as legacy now?`)) runBackfill(false);
                  }}
                >
                  Apply to {backfillPreview?.tagLegacy ?? 0} accounts
                </MDButton>
                {backfillBusy && <CircularProgress size={22} />}
              </MDBox>
            </Card>
          </Grid>

          {/* ── Step 2: recipients ─────────────────────────────── */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ p: 3 }}>
              <MDTypography variant="h6" fontWeight="medium" mb={1}>
                Step 2: Choose recipients
              </MDTypography>
              <RadioGroup
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value);
                  invalidate();
                }}
              >
                <FormControlLabel
                  value="models"
                  control={<Radio size="small" />}
                  disabled={!!single}
                  label={optionLabel("models", "Models")}
                />
                <FormControlLabel
                  value="clients"
                  control={<Radio size="small" />}
                  disabled={!!single}
                  label={optionLabel("clients", "Clients (includes account managers)")}
                />
                <FormControlLabel
                  value="all"
                  control={<Radio size="small" />}
                  disabled={!!single}
                  label={optionLabel("all", "Everyone (models and clients)")}
                />
              </RadioGroup>
              <MDTypography variant="caption" color="text" display="block" mb={2}>
                Admins are never included. Users already emailed are skipped, so it is safe to run
                again.
              </MDTypography>

              <TextField
                fullWidth
                size="small"
                label="Or send to one email address only (testing)"
                helperText="When filled in, the audience above is ignored."
                value={onlyEmail}
                onChange={(e) => {
                  setOnlyEmail(e.target.value);
                  invalidate();
                }}
                sx={{ mb: 3 }}
              />

              <MDBox display="flex" gap={1} flexWrap="wrap" alignItems="center">
                <MDButton variant="gradient" color="info" disabled={busy} onClick={handleDryRun}>
                  Dry run
                </MDButton>
                <MDButton variant="outlined" color="dark" disabled={busy || !user?.email} onClick={handleTest}>
                  Send test to me
                </MDButton>
                {busy && !progress && <CircularProgress size={22} />}
              </MDBox>
            </Card>
          </Grid>

          {/* ── Step 3: review and send ────────────────────────── */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ p: 3 }}>
              <MDTypography variant="h6" fontWeight="medium" mb={2}>
                Step 3: Review and send
              </MDTypography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              {!preview && !result && !error && !progress && (
                <Alert severity="info">Run a dry run to see who would receive the email.</Alert>
              )}

              {preview && (
                <>
                  <Alert severity={total > 0 ? "warning" : "info"} sx={{ mb: 2 }}>
                    {total > 0
                      ? `This would email ${total} user${total !== 1 ? "s" : ""}${single ? "" : ` (${AUDIENCE_LABELS[audience]}), ${BATCH_SIZE} at a time`}.`
                      : "No users would be emailed with these settings."}
                  </Alert>
                  <MDTypography variant="body2" color="text" component="div">
                    Legacy users awaiting confirmation: <strong>{preview.totalLegacyUnconfirmed}</strong>
                    <br />
                    Already emailed: <strong>{preview.alreadyEmailed}</strong>
                  </MDTypography>
                  {preview.targets?.map((t) => (
                    <MDTypography key={t.uid} variant="caption" color="text" display="block" mt={1}>
                      {t.email} ({t.uid}): consent {t.consent?.status || "not set"}
                      {t.consent?.source ? ` via ${t.consent.source}` : ""}
                    </MDTypography>
                  ))}
                  <MDBox mt={3}>
                    <MDButton
                      variant="gradient"
                      color="error"
                      disabled={busy || total === 0}
                      onClick={() => {
                        const who = single ? single : `${total} ${AUDIENCE_LABELS[audience]}`;
                        if (window.confirm(`Send the migration email to ${who} now?`)) handleSend();
                      }}
                    >
                      Send to {total} user{total !== 1 ? "s" : ""}
                    </MDButton>
                  </MDBox>
                </>
              )}

              {progress && (
                <MDBox>
                  <MDTypography variant="body2" color="text" mb={1}>
                    Sending... {progress.done} of {progress.total} processed
                  </MDTypography>
                  <LinearProgress
                    variant="determinate"
                    value={progress.total ? Math.min(100, (progress.done / progress.total) * 100) : 0}
                    sx={{ mb: 2 }}
                  />
                  <MDButton variant="outlined" color="error" size="small" onClick={() => (stopRef.current = true)}>
                    Stop after this batch
                  </MDButton>
                </MDBox>
              )}

              {result && (
                <Alert severity={result.failed > 0 || result.stopped ? "warning" : "success"}>
                  {result.test
                    ? result.sent
                      ? "Test email sent to your own address."
                      : `Test email not sent: ${result.reason}`
                    : `${result.stopped ? "Stopped. " : "Finished. "}Sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}.`}
                  {result.skippedReasons && Object.keys(result.skippedReasons).length > 0 && (
                    <MDTypography variant="caption" display="block">
                      Skipped: {JSON.stringify(result.skippedReasons)}
                    </MDTypography>
                  )}
                  {!result.test && (result.stopped || result.failed > 0) && (
                    <MDTypography variant="caption" display="block">
                      Run a dry run to see who is still to email. Sent users are never emailed twice.
                    </MDTypography>
                  )}
                </Alert>
              )}
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default EmailMigration;
