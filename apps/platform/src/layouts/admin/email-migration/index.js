import { useState } from "react";
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

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

/**
 * Super admin tool for the one-off "You've moved to the new Model Cloud" service email
 * (contains the "Continue Opt-In" button). Always shows a dry run before anything can be sent.
 */
function EmailMigration() {
  const { user } = useAuth();
  const [onlyEmail, setOnlyEmail] = useState("");
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // last dry-run result
  const [result, setResult] = useState(null); // last send result
  const [error, setError] = useState("");

  const payload = (extra) => ({
    ...(onlyEmail.trim() ? { onlyEmail: onlyEmail.trim() } : {}),
    limit: Number(limit) || 50,
    ...extra,
  });

  const run = async (data, onDone) => {
    setBusy(true);
    setError("");
    try {
      onDone(await callCloudFunctionStrict("sendMigrationOptInEmails", data));
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDryRun = () => {
    setResult(null);
    run(payload({ dryRun: true }), setPreview);
  };

  const handleSend = () => {
    run(payload({ dryRun: false }), (res) => {
      setResult(res);
      setPreview(null); // force a fresh dry run before any further send
    });
  };

  const handleTest = () => {
    setPreview(null);
    run({ testEmail: user?.email }, (res) => setResult(res));
  };

  const wouldSend = preview?.wouldSendNow ?? 0;

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
          <Grid item xs={12} lg={5}>
            <Card sx={{ p: 3 }}>
              <MDTypography variant="h6" fontWeight="medium" mb={2}>
                1. Choose recipients
              </MDTypography>
              <TextField
                fullWidth
                size="small"
                label="Only this email address (optional)"
                helperText="Leave blank to target all legacy users who haven't confirmed and haven't been emailed."
                value={onlyEmail}
                onChange={(e) => {
                  setOnlyEmail(e.target.value);
                  setPreview(null);
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Max emails this run"
                inputProps={{ min: 1, max: 500 }}
                value={limit}
                onChange={(e) => {
                  setLimit(e.target.value);
                  setPreview(null);
                }}
                sx={{ mb: 3 }}
              />
              <MDBox display="flex" gap={1} flexWrap="wrap">
                <MDButton variant="gradient" color="info" disabled={busy} onClick={handleDryRun}>
                  Dry run
                </MDButton>
                <MDButton variant="outlined" color="dark" disabled={busy || !user?.email} onClick={handleTest}>
                  Send test to me
                </MDButton>
                {busy && <CircularProgress size={22} />}
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card sx={{ p: 3 }}>
              <MDTypography variant="h6" fontWeight="medium" mb={2}>
                2. Review and send
              </MDTypography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {!preview && !result && !error && (
                <Alert severity="info">Run a dry run to see who would receive the email.</Alert>
              )}

              {preview && (
                <>
                  <Alert severity={wouldSend > 0 ? "warning" : "info"} sx={{ mb: 2 }}>
                    {wouldSend > 0
                      ? `This run would email ${wouldSend} user${wouldSend !== 1 ? "s" : ""}.`
                      : "No users would be emailed with these settings."}
                  </Alert>
                  <MDTypography variant="body2" color="text" component="div">
                    Legacy users awaiting confirmation: <strong>{preview.totalLegacyUnconfirmed}</strong>
                    <br />
                    Already emailed: <strong>{preview.alreadyEmailed}</strong>
                    <br />
                    Remaining after this run: <strong>{preview.remainingAfterThisBatch}</strong>
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
                      disabled={busy || wouldSend === 0}
                      onClick={() => {
                        if (window.confirm(`Send the migration email to ${wouldSend} user(s) now?`)) handleSend();
                      }}
                    >
                      Send to {wouldSend} user{wouldSend !== 1 ? "s" : ""}
                    </MDButton>
                  </MDBox>
                </>
              )}

              {result && (
                <Alert severity={result.failed > 0 ? "warning" : "success"}>
                  {result.test
                    ? result.sent
                      ? "Test email sent to your own address."
                      : `Test email not sent: ${result.reason}`
                    : `Sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}. ${result.remaining} remaining.`}
                  {result.skippedReasons && Object.keys(result.skippedReasons).length > 0 && (
                    <MDTypography variant="caption" display="block">
                      Skipped: {JSON.stringify(result.skippedReasons)}
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
