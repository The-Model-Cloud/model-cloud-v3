import { useState } from "react";
import { useAuth } from "context/AuthContext";
import { callCloudFunctionStrict } from "utils/api";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";

/**
 * Shown on every page while the client has paused their account (users/{uid}.accountStatus === "paused").
 * One click reactivates it.
 */
function PausedAccountBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user?.accountStatus !== "paused") return null;

  const reactivate = async () => {
    setBusy(true);
    setError("");
    try {
      await callCloudFunctionStrict("reactivateMyAccount", {});
      window.location.reload();
    } catch (err) {
      setError(err.message || "Could not reactivate your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <MDBox mb={3}>
      <Alert
        severity="warning"
        action={
          <MDButton variant="gradient" color="warning" size="small" onClick={reactivate} disabled={busy}>
            {busy ? "Reactivating…" : "Reactivate"}
          </MDButton>
        }
      >
        <AlertTitle>Your account is paused</AlertTitle>
        You can&apos;t post jobs or book models while it is paused, and we&apos;ve stopped membership billing and marketing
        emails. Reactivate to carry on where you left off.
        {error && <MDBox mt={1}>{error}</MDBox>}
      </Alert>
    </MDBox>
  );
}

export default PausedAccountBanner;
