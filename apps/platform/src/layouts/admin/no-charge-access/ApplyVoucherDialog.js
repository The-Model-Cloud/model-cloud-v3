import { useEffect, useMemo, useState } from "react";
import { callCloudFunctionStrict } from "utils/api";

import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";

import { TIER_LABEL, errorMessage, fmt, toDate } from "./utils";

export const voucherOffer = (v) =>
  `${TIER_LABEL[v.tier] || v.tier}, ${v.mode === "until" ? `free until ${fmt(v.until)}` : `${v.days} day${v.days === 1 ? "" : "s"} free`}`;

/** A voucher can still be applied: switched on, code not expired, offer not over, redemptions left */
export const isVoucherUsable = (v) => {
  if (!v.active) return false;
  const codeExpires = toDate(v.codeExpiresAt);
  if (codeExpires && codeExpires <= new Date()) return false;
  if (v.mode === "until" && toDate(v.until) <= new Date()) return false;
  if (v.maxRedemptions != null && v.redemptionCount >= v.maxRedemptions) return false;
  return true;
};

/**
 * Apply a voucher to one client (admins only; a client-facing version can reuse the same server function later).
 * Pass `client` to fix the client, or `voucher` to fix the voucher; the other is chosen in the dialog.
 */
function ApplyVoucherDialog({ open, onClose, onDone, vouchers, clients, client = null, voucher = null }) {
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedVoucher(voucher);
      setSelectedClient(client);
      setError("");
    }
  }, [open, client, voucher]);

  const usable = useMemo(() => vouchers.filter(isVoucherUsable), [vouchers]);
  const target = client || selectedClient;
  const chosenVoucher = voucher || selectedVoucher;

  const submit = async () => {
    if (!chosenVoucher) return setError("Choose a voucher");
    if (!target) return setError("Choose a client");
    setSaving(true);
    setError("");
    try {
      const result = await callCloudFunctionStrict("redeemVoucher", { code: chosenVoucher.code, userId: target.uid });
      onDone({
        severity: "success",
        text:
          result.method === "stripe_coupon"
            ? `${chosenVoucher.code} applied to ${target.name || target.email}: free months taken off their next invoices, until about ${fmt(result.until)}. They stay on their current plan.`
            : `${chosenVoucher.code} applied to ${target.name || target.email}: no-charge ${TIER_LABEL[result.tier] || result.tier} until ${fmt(result.until)}.`,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>Apply a voucher</DialogTitle>
      <DialogContent>
        <MDBox display="flex" flexDirection="column" gap={2} pt={1}>
          {client ? (
            <TextField size="small" label="Client" value={`${client.name || client.email}${client.company ? ` · ${client.company}` : ""}`} disabled />
          ) : (
            <Autocomplete
              options={clients}
              value={selectedClient}
              onChange={(_, v) => setSelectedClient(v)}
              getOptionLabel={(o) => `${o.name || o.email}${o.company ? ` · ${o.company}` : ""} (${o.email})`}
              isOptionEqualToValue={(a, b) => a.uid === b.uid}
              renderOption={(props, o) => (
                <li {...props} key={o.uid}>
                  {o.name || o.email}
                  {o.company ? ` · ${o.company}` : ""}
                  <Chip size="small" color={o.billing.color} label={o.billing.label} sx={{ ml: 1 }} />
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Client" size="small" />}
            />
          )}

          {voucher ? (
            <TextField size="small" label="Voucher" value={`${voucher.code} · ${voucherOffer(voucher)}`} disabled />
          ) : (
            <Autocomplete
              options={usable}
              value={selectedVoucher}
              onChange={(_, v) => setSelectedVoucher(v)}
              getOptionLabel={(o) => `${o.code} · ${voucherOffer(o)}${o.campaign ? ` · ${o.campaign}` : ""}`}
              isOptionEqualToValue={(a, b) => a.code === b.code}
              noOptionsText="No usable vouchers. Create one in the Vouchers tab."
              renderInput={(params) => <TextField {...params} label="Voucher" size="small" />}
            />
          )}

          {target && (
            <Alert severity={target.paying ? "info" : "success"}>
              {target.paying
                ? "This client is paying through Stripe. The voucher is applied as free months on their current plan (a 100% Stripe coupon), so billing stays in place and their next invoices are free. Any free time they already have is extended."
                : "This client is not paying. They get the voucher's tier at no charge, with no Stripe subscription. Any no-charge time they already have is extended, never shortened."}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </MDBox>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="text" color="dark" onClick={onClose} disabled={saving}>
          Cancel
        </MDButton>
        <MDButton variant="gradient" color="info" onClick={submit} disabled={saving}>
          {saving ? <CircularProgress size={18} color="inherit" /> : "Apply voucher"}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

export default ApplyVoucherDialog;
