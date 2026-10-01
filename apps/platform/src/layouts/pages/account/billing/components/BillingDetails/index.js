import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "config/firebase";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Skeleton from "@mui/material/Skeleton";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const EMPTY = {
  companyName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
  country: "",
  vatNumber: "",
  billingEmail: "",
};

/**
 * The client's own billing details (company, address, VAT number). They are copied onto each invoice at the
 * moment it is issued, so changing them affects future invoices only.
 */
function BillingDetails({ uid }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { severity, text }

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        const data = snap.data() || {};
        setForm({ ...EMPTY, companyName: data.companyName || "", ...(data.billingDetails || {}) });
      })
      .catch((err) => console.error("Could not load billing details:", err))
      .finally(() => setLoading(false));
  }, [uid]);

  const field = (key, label, extra = {}) => (
    <Grid item xs={12} sm={extra.half ? 6 : 12}>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        {...extra.props}
      />
    </Grid>
  );

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim().slice(0, 200)]));
      await updateDoc(doc(db, "users", uid), { billingDetails: clean });
      setMessage({ severity: "success", text: "Saved. These details will appear on your next invoices." });
    } catch (err) {
      console.error("Could not save billing details:", err);
      setMessage({ severity: "error", text: "Could not save your details. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3}>
        <MDTypography variant="h6" fontWeight="medium">Billing details</MDTypography>
        <MDTypography variant="button" color="text" display="block" mb={2}>
          Shown on your invoices. Invoices already issued are not changed.
        </MDTypography>

        {loading ? (
          <>
            <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={40} />
          </>
        ) : (
          <Grid container spacing={1.5}>
            {field("companyName", "Company name")}
            {field("addressLine1", "Address line 1")}
            {field("addressLine2", "Address line 2")}
            {field("city", "Town / city", { half: true })}
            {field("postcode", "Postcode", { half: true })}
            {field("country", "Country")}
            {field("vatNumber", "VAT number (optional)")}
            {field("billingEmail", "Billing email (optional)", { props: { type: "email" } })}
            <Grid item xs={12}>
              {message && <Alert severity={message.severity} sx={{ mb: 1.5 }}>{message.text}</Alert>}
              <MDButton variant="gradient" color="info" size="small" disabled={saving} onClick={save}>
                {saving ? "Saving..." : "Save details"}
              </MDButton>
            </Grid>
          </Grid>
        )}
      </MDBox>
    </Card>
  );
}

BillingDetails.propTypes = { uid: PropTypes.string };

export default BillingDetails;
