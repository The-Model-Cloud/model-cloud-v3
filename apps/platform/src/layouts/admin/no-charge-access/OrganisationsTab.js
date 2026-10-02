import { useState } from "react";
import { Link } from "react-router-dom";
import { callCloudFunctionStrict } from "utils/api";

import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import { DEFAULT_UNTIL, ORG_TIERS, TIER_LABEL, endingSoon, errorMessage, fmt } from "./utils";

function OrganisationsTab({ organisations, reload, notify }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tier, setTier] = useState("professional");
  const [until, setUntil] = useState(DEFAULT_UNTIL);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const granted = organisations.filter((o) => o.noCharge);

  const openDialog = () => {
    setSelected(null);
    setTier("professional");
    setUntil(DEFAULT_UNTIL);
    setReason("");
    setError("");
    setOpen(true);
  };

  const submit = async () => {
    if (!selected) return setError("Choose an organisation");
    if (!until) return setError("Choose an end date");
    setSaving(true);
    setError("");
    try {
      const result = await callCloudFunctionStrict(
        "grantComplimentaryOrganisation",
        { organisationId: selected.id, tier, until, reason },
        { timeout: 5 * 60 * 1000 }
      );
      const skipped = result.skipped || [];
      notify({
        severity: skipped.length ? "warning" : "success",
        text:
          `${selected.name} is on no-charge ${TIER_LABEL[tier]} until ${fmt(until)}. ${result.granted} member${result.granted === 1 ? "" : "s"} updated.` +
          (skipped.length ? ` Skipped ${skipped.length}: ${skipped.map((s) => `${s.name || s.uid} (${s.reason})`).join("; ")}` : ""),
      });
      setOpen(false);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (o) => {
    if (!window.confirm(`End no-charge access for ${o.name}? The organisation and its members go back to their previous tier / Free immediately.`)) return;
    try {
      await callCloudFunctionStrict("revokeComplimentaryOrganisation", { organisationId: o.id }, { timeout: 5 * 60 * 1000 });
      notify({ severity: "success", text: `${o.name} is no longer on no-charge access.` });
      reload();
    } catch (err) {
      notify({ severity: "error", text: errorMessage(err) });
    }
  };

  return (
    <>
      <Card sx={{ p: 3 }}>
        <MDBox display="flex" alignItems="center" mb={2} gap={2} flexWrap="wrap">
          <MDTypography variant="body2" color="text" sx={{ flex: 1, minWidth: 260 }}>
            Put a whole organisation on a paid tier at no charge. It sets the organisation&apos;s tier and gives every client
            and account manager in it the same no-charge plan. For individual clients, use a voucher instead.
          </MDTypography>
          <MDButton variant="gradient" color="info" onClick={openDialog}>
            <Icon sx={{ mr: 0.5 }}>add</Icon>
            Grant to organisation
          </MDButton>
        </MDBox>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Organisation</strong></TableCell>
                <TableCell><strong>Tier</strong></TableCell>
                <TableCell><strong>Ends</strong></TableCell>
                <TableCell><strong>Reason</strong></TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {granted.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>
                    <MDTypography component={Link} to={`/admin/organisations/${o.id}`} variant="button" fontWeight="medium" color="info">
                      {o.name}
                    </MDTypography>
                  </TableCell>
                  <TableCell>{TIER_LABEL[o.tier] || o.tier}</TableCell>
                  <TableCell>
                    {fmt(o.noCharge.until)}
                    {endingSoon(o.noCharge.untilDate) && <Chip size="small" color="warning" label="Ending soon" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{o.noCharge.reason || "—"}</TableCell>
                  <TableCell align="right">
                    <MDButton variant="text" color="error" size="small" onClick={() => revoke(o)}>End</MDButton>
                  </TableCell>
                </TableRow>
              ))}
              {granted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <MDTypography variant="body2" color="text" textAlign="center" py={2}>
                      No organisations on no-charge access.
                    </MDTypography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Grant no-charge access to an organisation</DialogTitle>
        <DialogContent>
          <MDBox display="flex" flexDirection="column" gap={2} pt={1}>
            <Autocomplete
              options={organisations}
              value={selected}
              onChange={(_, v) => setSelected(v)}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label="Organisation" size="small" />}
            />
            <TextField select size="small" label="Tier" value={tier} onChange={(e) => setTier(e.target.value)} SelectProps={{ sx: { height: 40 } }}>
              {ORG_TIERS.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="date"
              label="Free until"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Last day of free access. Members are reminded 30 days before, then move to Free."
            />
            <TextField size="small" label="Reason (internal)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 2026 win-back offer" />
            <Alert severity="info">
              Anyone in the organisation already paying through Stripe is skipped and listed afterwards. Give them a voucher
              from the Clients tab instead.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="dark" onClick={() => setOpen(false)} disabled={saving}>Cancel</MDButton>
          <MDButton variant="gradient" color="info" onClick={submit} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : "Grant"}
          </MDButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default OrganisationsTab;
