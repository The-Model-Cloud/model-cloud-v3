import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "config/firebase";
import { callCloudFunctionStrict } from "utils/api";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import ApplyVoucherDialog, { isVoucherUsable, voucherOffer } from "./ApplyVoucherDialog";
import { DEFAULT_UNTIL, USER_TIERS, errorMessage, fmt, toDate } from "./utils";

const EMPTY_FORM = {
  tier: "premium",
  mode: "days",
  days: "30",
  until: DEFAULT_UNTIL,
  maxRedemptions: "",
  code: "",
  codeExpiresAt: "",
  restrictedToEmail: "",
  campaign: "",
  note: "",
};

const copy = (text) => {
  try {
    navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Copy failed:", err);
  }
};

function VouchersTab({ vouchers, clients, reload, notify }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [created, setCreated] = useState(null); // code just created, to copy

  const [applyVoucher, setApplyVoucher] = useState(null);
  const [redemptionsFor, setRedemptionsFor] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogError("");
    setCreated(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setDialogError("");
    setSaving(true);
    try {
      const payload = {
        tier: form.tier,
        mode: form.mode,
        days: form.mode === "days" ? Number(form.days) : undefined,
        until: form.mode === "until" ? form.until : undefined,
        maxRedemptions: form.maxRedemptions === "" ? null : Number(form.maxRedemptions),
        code: form.code.trim() || undefined,
        codeExpiresAt: form.codeExpiresAt || undefined,
        restrictedToEmail: form.restrictedToEmail.trim() || undefined,
        campaign: form.campaign.trim(),
        note: form.note.trim(),
      };
      const result = await callCloudFunctionStrict("createVoucher", payload);
      setCreated(result.code);
      reload();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (v) => {
    try {
      await callCloudFunctionStrict("setVoucherActive", { code: v.code, active: !v.active });
      reload();
    } catch (err) {
      notify({ severity: "error", text: errorMessage(err) });
    }
  };

  const showRedemptions = async (v) => {
    setRedemptionsFor(v);
    setRedemptions([]);
    setRedemptionsLoading(true);
    try {
      const snap = await getDocs(collection(db, "vouchers", v.code, "redemptions"));
      const byUid = Object.fromEntries(clients.map((c) => [c.uid, c]));
      setRedemptions(
        snap.docs
          .map((d) => {
            const r = d.data();
            const c = byUid[r.userId];
            return {
              uid: r.userId,
              name: c ? c.name || c.email : r.userId,
              redeemedAt: toDate(r.redeemedAt),
              method: r.method,
              benefitUntil: toDate(r.benefitUntil),
              status: r.status,
            };
          })
          .sort((a, b) => (b.redeemedAt || 0) - (a.redeemedAt || 0))
      );
    } catch (err) {
      notify({ severity: "error", text: errorMessage(err) });
    } finally {
      setRedemptionsLoading(false);
    }
  };

  const status = (v) => {
    if (!v.active) return <Chip size="small" label="Deactivated" />;
    if (isVoucherUsable(v)) return <Chip size="small" color="success" label="Active" />;
    if (v.maxRedemptions != null && v.redemptionCount >= v.maxRedemptions) return <Chip size="small" color="warning" label="Fully used" />;
    return <Chip size="small" color="warning" label="Expired" />;
  };

  return (
    <>
      <Card sx={{ p: 3 }}>
        <MDBox display="flex" alignItems="center" mb={2} gap={2} flexWrap="wrap">
          <MDTypography variant="body2" color="text" sx={{ flex: 1, minWidth: 260 }}>
            A voucher is a code for a free period on a tier. Create it here, then apply it to a client from this tab or the
            Clients tab. Clients who are paying get free months on their current plan; everyone else gets the tier at no charge.
          </MDTypography>
          <MDButton variant="gradient" color="info" onClick={openCreate}>
            <Icon sx={{ mr: 0.5 }}>add</Icon>
            New voucher
          </MDButton>
        </MDBox>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Offer</strong></TableCell>
                <TableCell><strong>Used</strong></TableCell>
                <TableCell><strong>Code expires</strong></TableCell>
                <TableCell><strong>Campaign / note</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {vouchers.map((v) => (
                <TableRow key={v.code} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <MDTypography variant="button" fontWeight="medium">{v.code}</MDTypography>
                    <Tooltip title="Copy code">
                      <IconButton size="small" onClick={() => copy(v.code)}>
                        <Icon fontSize="small">content_copy</Icon>
                      </IconButton>
                    </Tooltip>
                    {v.restrictedToEmail && (
                      <MDTypography variant="caption" color="text" display="block">Only for {v.restrictedToEmail}</MDTypography>
                    )}
                  </TableCell>
                  <TableCell>{voucherOffer(v)}</TableCell>
                  <TableCell>
                    <MDButton variant="text" color="info" size="small" onClick={() => showRedemptions(v)} disabled={!v.redemptionCount}>
                      {v.redemptionCount || 0} / {v.maxRedemptions ?? "∞"}
                    </MDButton>
                  </TableCell>
                  <TableCell>{v.codeExpiresAt ? fmt(v.codeExpiresAt) : "Never"}</TableCell>
                  <TableCell>
                    {v.campaign || "—"}
                    {v.note && <MDTypography variant="caption" color="text" display="block">{v.note}</MDTypography>}
                  </TableCell>
                  <TableCell>{status(v)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <MDButton variant="text" color="info" size="small" onClick={() => setApplyVoucher(v)} disabled={!isVoucherUsable(v)}>
                      Apply to client
                    </MDButton>
                    <MDButton variant="text" color={v.active ? "error" : "success"} size="small" onClick={() => toggleActive(v)}>
                      {v.active ? "Deactivate" : "Reactivate"}
                    </MDButton>
                  </TableCell>
                </TableRow>
              ))}
              {vouchers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <MDTypography variant="body2" color="text" textAlign="center" py={2}>
                      No vouchers yet.
                    </MDTypography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onClose={() => !saving && setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{created ? "Voucher created" : "New voucher"}</DialogTitle>
        <DialogContent>
          {created ? (
            <MDBox display="flex" flexDirection="column" gap={2} pt={1}>
              <Alert severity="success">Share or apply this code. You can find it again in this list.</Alert>
              <MDBox display="flex" alignItems="center" gap={1}>
                <MDTypography variant="h4" fontWeight="bold">{created}</MDTypography>
                <MDButton variant="outlined" color="info" size="small" onClick={() => copy(created)}>
                  <Icon sx={{ mr: 0.5 }}>content_copy</Icon>
                  Copy
                </MDButton>
              </MDBox>
            </MDBox>
          ) : (
            <MDBox display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField select size="small" label="Tier" value={form.tier} onChange={set("tier")} SelectProps={{ sx: { height: 40 } }}>
                {USER_TIERS.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
                ))}
              </TextField>

              <ToggleButtonGroup
                exclusive
                size="small"
                value={form.mode}
                onChange={(_, value) => value && setForm((f) => ({ ...f, mode: value }))}
              >
                <ToggleButton value="days">A number of days</ToggleButton>
                <ToggleButton value="until">Free until a date</ToggleButton>
              </ToggleButtonGroup>

              {form.mode === "days" ? (
                <TextField
                  size="small"
                  type="number"
                  label="Days free"
                  value={form.days}
                  onChange={set("days")}
                  inputProps={{ min: 1, max: 366 }}
                  helperText="Counted from when the voucher is applied. Paying clients get this rounded up to whole months."
                />
              ) : (
                <TextField
                  size="small"
                  type="date"
                  label="Free until"
                  value={form.until}
                  onChange={set("until")}
                  InputLabelProps={{ shrink: true }}
                />
              )}

              <TextField
                size="small"
                type="number"
                label="Maximum uses"
                value={form.maxRedemptions}
                onChange={set("maxRedemptions")}
                inputProps={{ min: 1 }}
                helperText="Leave blank for unlimited. Use 1 for a code meant for one client."
              />
              <TextField
                size="small"
                label="Code (optional)"
                value={form.code}
                onChange={set("code")}
                helperText="Leave blank to generate one, or type your own such as COMEBACK2026"
              />
              <TextField
                size="small"
                type="date"
                label="Code expires (optional)"
                value={form.codeExpiresAt}
                onChange={set("codeExpiresAt")}
                InputLabelProps={{ shrink: true }}
                helperText="After this date the code can no longer be applied"
              />
              <TextField
                size="small"
                label="Only for this email (optional)"
                value={form.restrictedToEmail}
                onChange={set("restrictedToEmail")}
              />
              <TextField size="small" label="Campaign (optional)" value={form.campaign} onChange={set("campaign")} placeholder="e.g. 2026 win-back" />
              <TextField size="small" label="Internal note (optional)" value={form.note} onChange={set("note")} />
              {dialogError && <Alert severity="error">{dialogError}</Alert>}
            </MDBox>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {created ? (
            <MDButton variant="gradient" color="info" onClick={() => setCreateOpen(false)}>Done</MDButton>
          ) : (
            <>
              <MDButton variant="text" color="dark" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</MDButton>
              <MDButton variant="gradient" color="info" onClick={submitCreate} disabled={saving}>
                {saving ? <CircularProgress size={18} color="inherit" /> : "Create voucher"}
              </MDButton>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Redemptions */}
      <Dialog open={!!redemptionsFor} onClose={() => setRedemptionsFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Used by · {redemptionsFor?.code}</DialogTitle>
        <DialogContent>
          {redemptionsLoading ? (
            <MDBox display="flex" justifyContent="center" py={3}><CircularProgress /></MDBox>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>Applied</strong></TableCell>
                  <TableCell><strong>As</strong></TableCell>
                  <TableCell><strong>Free until</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {redemptions.map((r) => (
                  <TableRow key={r.uid}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{fmt(r.redeemedAt)}</TableCell>
                    <TableCell>{r.method === "stripe_coupon" ? "Free months" : r.method === "complimentary" ? "No charge" : r.status}</TableCell>
                    <TableCell>{fmt(r.benefitUntil)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="dark" onClick={() => setRedemptionsFor(null)}>Close</MDButton>
        </DialogActions>
      </Dialog>

      <ApplyVoucherDialog
        open={!!applyVoucher}
        voucher={applyVoucher}
        vouchers={vouchers}
        clients={clients}
        onClose={() => setApplyVoucher(null)}
        onDone={(message) => {
          setApplyVoucher(null);
          notify(message);
          reload();
        }}
      />
    </>
  );
}

export default VouchersTab;
