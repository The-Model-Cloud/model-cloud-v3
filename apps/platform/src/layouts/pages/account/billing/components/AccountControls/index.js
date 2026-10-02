import { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import { callCloudFunctionStrict } from "utils/api";
import ConfirmDialog from "layouts/pages/account/billing/components/ConfirmDialog";

/** Save a base64 file returned by the server. */
const saveFile = ({ filename, base64 }, type) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function Row({ icon, title, description, children }) {
  return (
    <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap" py={2}>
      <MDBox display="flex" gap={1.5} sx={{ flex: 1, minWidth: 240 }}>
        <Icon color="secondary">{icon}</Icon>
        <MDBox>
          <MDTypography variant="button" fontWeight="medium" display="block">
            {title}
          </MDTypography>
          <MDTypography variant="caption" color="text">
            {description}
          </MDTypography>
        </MDBox>
      </MDBox>
      <MDBox display="flex" gap={1}>
        {children}
      </MDBox>
    </MDBox>
  );
}
Row.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The client's own controls over their data and account: download everything we hold, pause the account
 * (reversible), manage email preferences, or delete it permanently.
 */
function AccountControls({ paused, onError, onMessage }) {
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const result = await callCloudFunctionStrict("exportMyData", {}, { timeout: 5 * 60 * 1000 });
      saveFile(result, "application/json");
      onMessage("Your data has been downloaded.");
    } catch (err) {
      onError(err.message || "Could not export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const togglePause = async () => {
    setBusy(true);
    try {
      await callCloudFunctionStrict(paused ? "reactivateMyAccount" : "pauseMyAccount", {});
      // The account state is read when you sign in, so reload to pick it up everywhere
      window.location.reload();
    } catch (err) {
      setConfirm(false);
      onError(err.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <MDTypography variant="h6" fontWeight="medium">
        Your data &amp; account
      </MDTypography>
      <MDTypography variant="button" color="text">
        You are in control of your information and your account
      </MDTypography>

      <MDBox mt={1}>
        <Row
          icon="download"
          title="Download my data"
          description="Everything we hold about you (profile, jobs, invoices, payments, messages) as one file"
        >
          <MDButton variant="outlined" color="info" size="small" onClick={download} disabled={exporting}>
            {exporting ? "Preparing…" : "Download"}
          </MDButton>
        </Row>
        <Divider sx={{ my: 0 }} />
        <Row icon="mail" title="Email preferences" description="Choose which emails you receive, or unsubscribe from all of them">
          <MDButton variant="outlined" color="info" size="small" component={Link} to="/edit-profile?tab=notifications">
            Manage
          </MDButton>
        </Row>
        <Divider sx={{ my: 0 }} />
        <Row
          icon={paused ? "play_circle" : "pause_circle"}
          title={paused ? "Reactivate my account" : "Pause my account"}
          description={
            paused
              ? "Your account is paused. Reactivate it to post jobs and book models again."
              : "Take a break. Billing stops, open jobs are closed and marketing emails stop. Reactivate any time."
          }
        >
          <MDButton variant="outlined" color={paused ? "success" : "warning"} size="small" onClick={() => setConfirm(true)}>
            {paused ? "Reactivate" : "Pause"}
          </MDButton>
        </Row>
        <Divider sx={{ my: 0 }} />
        <Row
          icon="delete_forever"
          title="Delete my account"
          description="Permanently delete your account and personal data. This cannot be undone."
        >
          <MDButton variant="outlined" color="error" size="small" component={Link} to="/edit-profile?tab=delete-account">
            Delete…
          </MDButton>
        </Row>
      </MDBox>

      <ConfirmDialog
        open={confirm}
        title={paused ? "Reactivate your account?" : "Pause your account?"}
        confirmLabel={paused ? "Reactivate" : "Pause account"}
        confirmColor={paused ? "success" : "warning"}
        busy={busy}
        onClose={() => setConfirm(false)}
        onConfirm={togglePause}
      >
        {paused ? (
          <>
            Your account becomes active again, the jobs that were closed when you paused are reopened, and your membership
            invoices restart. If we stopped your membership billing when you paused, it is switched back on.
          </>
        ) : (
          <>
            <strong>What happens:</strong>
            <ul>
              <li>Membership billing stops. You keep your plan until the end of the period you have paid for.</li>
              <li>Your open jobs are closed. We reopen them if you come back.</li>
              <li>You can&apos;t post jobs or book models until you reactivate.</li>
              <li>We stop sending you marketing emails.</li>
              <li>Your profile, messages, invoices and history are kept.</li>
            </ul>
            If you have a booking in progress you need to complete or cancel it first. To remove your data entirely, delete your
            account instead.
          </>
        )}
      </ConfirmDialog>
    </Card>
  );
}

AccountControls.defaultProps = { paused: false };
AccountControls.propTypes = {
  paused: PropTypes.bool,
  onError: PropTypes.func.isRequired,
  onMessage: PropTypes.func.isRequired,
};

export default AccountControls;
