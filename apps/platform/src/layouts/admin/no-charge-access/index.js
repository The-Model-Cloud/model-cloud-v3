import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "config/firebase";
import { callCloudFunctionStrict } from "utils/api";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// MUI
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Icon from "@mui/material/Icon";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";

// MD components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import ClientsTab from "./ClientsTab";
import OrganisationsTab from "./OrganisationsTab";
import VouchersTab from "./VouchersTab";
import { buildClientRow, errorMessage, fmt, toDate } from "./utils";

function VouchersAndBilling() {
  const [tab, setTab] = useState(0);
  const [clients, setClients] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // { severity, text }

  // Extend-all dialog
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendUntil, setExtendUntil] = useState("");
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [clientSnap, voucherSnap, orgSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "in", ["client", "account manager"]))),
        getDocs(collection(db, "vouchers")),
        getDocs(collection(db, "organisations")),
      ]);

      setClients(clientSnap.docs.map(buildClientRow));

      setVouchers(
        voucherSnap.docs
          .map((d) => ({ ...d.data(), code: d.id }))
          .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))
      );

      setOrganisations(
        orgSnap.docs
          .map((d) => {
            const o = d.data();
            const noCharge = o.noCharge?.enabled ? { ...o.noCharge, untilDate: toDate(o.noCharge.until) } : null;
            return { id: d.id, name: o.name || d.id, tier: o.tier, noCharge };
          })
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      console.error("Failed to load vouchers and billing:", err);
      setError("Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const anyGrants = clients.some((c) => c.billing.key === "nocharge") || organisations.some((o) => o.noCharge);

  const submitExtend = async () => {
    if (!extendUntil) return setExtendError("Choose a new end date");
    setExtending(true);
    setExtendError("");
    try {
      const result = await callCloudFunctionStrict("extendComplimentaryAccess", { until: extendUntil }, { timeout: 9 * 60 * 1000 });
      setNotice({
        severity: "success",
        text: `Extended to ${fmt(extendUntil)}: ${result.users} client${result.users === 1 ? "" : "s"} and ${result.organisations} organisation${result.organisations === 1 ? "" : "s"}. Anyone already past that date was left alone. Clients with free months on a Stripe subscription are not affected.`,
      });
      setExtendOpen(false);
      load();
    } catch (err) {
      setExtendError(errorMessage(err));
    } finally {
      setExtending(false);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3} display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">
              Vouchers &amp; Billing
            </MDTypography>
            <MDTypography variant="body2" color="text">
              See which clients are paying, which have a voucher and when it ends. Create vouchers for free periods and apply
              them to clients. Clients are reminded 30 days before no-charge access ends.
            </MDTypography>
          </MDBox>
          <MDButton
            variant="outlined"
            color="info"
            onClick={() => {
              setExtendUntil("");
              setExtendError("");
              setExtendOpen(true);
            }}
            disabled={!anyGrants}
          >
            <Icon sx={{ mr: 0.5 }}>event_repeat</Icon>
            Extend all no-charge access
          </MDButton>
        </MDBox>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {notice && (
          <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
            {notice.text}
          </Alert>
        )}

        {loading ? (
          <MDBox display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </MDBox>
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
              <Tab label="Clients" />
              <Tab label="Vouchers" />
              <Tab label="Organisations" />
            </Tabs>

            {tab === 0 && <ClientsTab clients={clients} vouchers={vouchers} reload={load} notify={setNotice} />}
            {tab === 1 && <VouchersTab vouchers={vouchers} clients={clients} reload={load} notify={setNotice} />}
            {tab === 2 && <OrganisationsTab organisations={organisations} reload={load} notify={setNotice} />}
          </>
        )}
      </MDBox>

      <Dialog open={extendOpen} onClose={() => !extending && setExtendOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Extend all no-charge access</DialogTitle>
        <DialogContent>
          <MDBox display="flex" flexDirection="column" gap={2} pt={1}>
            <MDTypography variant="body2" color="text">
              Moves the end date of every current no-charge client and organisation to the date below. Anyone already later
              than that date is left alone, and their reminders are re-armed.
            </MDTypography>
            <TextField
              size="small"
              type="date"
              label="New end date"
              value={extendUntil}
              onChange={(e) => setExtendUntil(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            {extendError && <Alert severity="error">{extendError}</Alert>}
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MDButton variant="text" color="dark" onClick={() => setExtendOpen(false)} disabled={extending}>Cancel</MDButton>
          <MDButton variant="gradient" color="info" onClick={submitExtend} disabled={extending}>
            {extending ? <CircularProgress size={18} color="inherit" /> : "Extend"}
          </MDButton>
        </DialogActions>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default VouchersAndBilling;
