import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { callCloudFunctionStrict } from "utils/api";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import RichTextEditor from "components/RichTextEditor";

import { AUDIENCES, CATEGORIES } from "./constants";

/** Compose a draft campaign. `campaign` is null for a new one. */
function CampaignEditor({ campaign, onChanged }) {
  const navigate = useNavigate();

  const [name, setName] = useState(campaign?.name || "");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [preheader, setPreheader] = useState(campaign?.preheader || "");
  const [category, setCategory] = useState(campaign?.category || "newsletter");
  const [audience, setAudience] = useState(campaign?.audience || "all");
  const [html, setHtml] = useState(campaign?.html || "");
  const [scheduleMode, setScheduleMode] = useState("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const [audienceCount, setAudienceCount] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);

  // Live count of who would receive this, refreshed when the category or audience changes
  useEffect(() => {
    setAudienceCount(null);
    const timer = setTimeout(() => {
      callCloudFunctionStrict("emailCampaignAudienceCount", { category, audience })
        .then((res) => setAudienceCount(res.count))
        .catch(() => setAudienceCount(undefined));
    }, 300);
    return () => clearTimeout(timer);
  }, [category, audience]);

  const fields = () => ({ name, subject, preheader, category, audience, html });

  const run = async (label, fn) => {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    const res = await callCloudFunctionStrict("emailCampaignSave", { id: campaign?.id, ...fields() });
    return res.id;
  };

  const handleSave = () =>
    run("save", async () => {
      const id = await save();
      if (!campaign) navigate(`/admin/email/campaigns/${id}`, { replace: true });
      else setNotice("Draft saved.");
    });

  const handlePreview = () =>
    run("preview", async () => {
      setPreview(await callCloudFunctionStrict("emailCampaignPreview", fields()));
    });

  const handleTest = () =>
    run("test", async () => {
      const res = await callCloudFunctionStrict("emailCampaignSendTest", fields());
      if (res.sent) setNotice("Test email sent to your own address.");
      else setError(`Test email not sent: ${res.reason}`);
    });

  const handleSend = () =>
    run("send", async () => {
      let when;
      if (scheduleMode === "later") {
        when = Date.parse(scheduledAt);
        if (!scheduledAt || Number.isNaN(when) || when < Date.now()) {
          throw new Error("Choose a date and time in the future.");
        }
      }
      if (!subject.trim() || !html.trim()) throw new Error("Add a subject and some content first.");

      const who = `${audienceCount ?? "the selected"} people`;
      const prompt = when
        ? `Schedule this campaign for ${new Date(when).toLocaleString("en-GB")} to ${who}?`
        : `Send this campaign to ${who} now? This cannot be undone.`;
      if (!window.confirm(prompt)) return;

      const id = await save();
      await callCloudFunctionStrict("emailCampaignSend", { id, scheduledAt: when });
      navigate(`/admin/email/campaigns/${id}`, { replace: true });
      if (onChanged) onChanged(); // same URL for an existing draft, so ask the parent to reload it
    });

  const handleDelete = () =>
    run("delete", async () => {
      if (!window.confirm("Delete this draft?")) return;
      await callCloudFunctionStrict("emailCampaignDelete", { id: campaign.id });
      navigate("/admin/email/campaigns");
    });

  const disabled = !!busy;

  return (
    <>
      <MDBox mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <MDBox>
          <MDTypography variant="h4" fontWeight="medium">
            {campaign ? "Edit campaign" : "New campaign"}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Use {"{{firstName}}"} in the subject or body to greet people by name.
          </MDTypography>
        </MDBox>
        <MDButton variant="outlined" color="secondary" size="small" onClick={() => navigate("/admin/email/campaigns")}>
          Back to campaigns
        </MDButton>
      </MDBox>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3 }}>
            <TextField
              fullWidth size="small" label="Campaign name (internal, not shown to recipients)"
              value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }}
            />
            <TextField
              fullWidth size="small" label="Subject line"
              value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ mb: 2 }}
            />
            <TextField
              fullWidth size="small" label="Preview text (shown next to the subject in inboxes)"
              value={preheader} onChange={(e) => setPreheader(e.target.value)} sx={{ mb: 3 }}
            />
            <RichTextEditor value={html} onChange={setHtml} />
            <MDTypography variant="caption" color="text" display="block" mt={1}>
              Links to themodel.cloud are tracked automatically. An unsubscribe link and your address are
              added to the footer of every email.
            </MDTypography>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, mb: 3 }}>
            <MDTypography variant="h6" fontWeight="medium" mb={2}>Audience</MDTypography>
            <TextField
              select fullWidth size="small" label="Send to" value={audience}
              onChange={(e) => setAudience(e.target.value)} sx={{ mb: 2 }} SelectProps={{ sx: { height: 36 } }}
            >
              {AUDIENCES.map((a) => <MenuItem key={a.key} value={a.key}>{a.label}</MenuItem>)}
            </TextField>
            <TextField
              select fullWidth size="small" label="Category" value={category}
              onChange={(e) => setCategory(e.target.value)} sx={{ mb: 2 }} SelectProps={{ sx: { height: 36 } }}
              helperText="Only people with this category switched on in their settings will receive it."
            >
              {CATEGORIES.map((c) => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
            </TextField>
            <Alert severity={audienceCount === 0 ? "warning" : "info"} icon={false}>
              {audienceCount === null ? (
                <CircularProgress size={14} />
              ) : audienceCount === undefined ? (
                "Could not count recipients."
              ) : (
                <>
                  <strong>{audienceCount}</strong> {audienceCount === 1 ? "person" : "people"} would receive this
                  today. Unsubscribed and bounced addresses are excluded when sending.
                </>
              )}
            </Alert>
          </Card>

          <Card sx={{ p: 3 }}>
            <MDTypography variant="h6" fontWeight="medium" mb={1}>Send</MDTypography>
            <RadioGroup value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value)}>
              <FormControlLabel value="now" control={<Radio size="small" />} label="Send now" />
              <FormControlLabel value="later" control={<Radio size="small" />} label="Schedule for later" />
            </RadioGroup>
            {scheduleMode === "later" && (
              <TextField
                type="datetime-local" size="small" fullWidth value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)} sx={{ my: 1 }}
                InputLabelProps={{ shrink: true }} label="Send at (your local time)"
              />
            )}

            <MDBox display="flex" flexDirection="column" gap={1} mt={2}>
              <MDButton variant="gradient" color="error" disabled={disabled} onClick={handleSend}>
                {busy === "send" ? "Working..." : scheduleMode === "later" ? "Schedule campaign" : "Send campaign"}
              </MDButton>
              <MDButton variant="outlined" color="dark" disabled={disabled} onClick={handleTest}>
                {busy === "test" ? "Sending..." : "Send test to me"}
              </MDButton>
              <MDButton variant="outlined" color="info" disabled={disabled} onClick={handlePreview}>
                Preview
              </MDButton>
              <MDButton variant="outlined" color="info" disabled={disabled || !name.trim()} onClick={handleSave}>
                {busy === "save" ? "Saving..." : "Save draft"}
              </MDButton>
              {campaign && (
                <MDButton variant="text" color="error" size="small" disabled={disabled} onClick={handleDelete}>
                  Delete draft
                </MDButton>
              )}
            </MDBox>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>Preview: {preview?.subject}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <iframe
            title="Email preview"
            srcDoc={preview?.html || ""}
            sandbox=""
            style={{ width: "100%", height: "70vh", border: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={() => setPreview(null)}>Close</MDButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CampaignEditor;
