import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from "firebase/auth";
import { auth } from "config/firebase";
import { callCloudFunctionStrict } from "utils/api";
import { useAuth } from "context/AuthContext";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const AUTH_ERRORS = {
  "auth/wrong-password": "That password is incorrect.",
  "auth/invalid-credential": "That password is incorrect.",
  "auth/email-already-in-use": "That email address is already used by another account.",
  "auth/invalid-new-email": "That doesn't look like a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/requires-recent-login": "Please sign out, sign in again, and then retry.",
};

/**
 * Shown to users whose email address has bounced (users/{uid}.emailBounced, set by the SendGrid webhook
 * or sync). They cannot receive job alerts, messages or password resets, so we ask them to change it.
 *
 * Changing the address uses Firebase's "verify before update" flow: a link goes to the NEW address and the
 * login email only changes once it is clicked, so a typo can never lock someone out of their account.
 */
function EmailBounceBanner() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  // The flag only counts while it refers to the address they currently have
  const bounced =
    user?.email && user?.emailBounced?.email && user.emailBounced.email.toLowerCase() === user.email.toLowerCase();
  if (!bounced) return null;

  const usesPassword = auth.currentUser?.providerData?.some((p) => p.providerId === "password");

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError("");
    setPassword("");
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const check = await callCloudFunctionStrict("checkEmailAddress", { email: newEmail });
      if (!check.ok) {
        setError(`${check.reason}${check.suggestion ? ` Did you mean ${check.suggestion}?` : ""}`);
        return;
      }
      if (check.email === user.email.toLowerCase()) {
        setError("That is the address we couldn't deliver to. Please enter a different one.");
        return;
      }

      const current = auth.currentUser;
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
      await verifyBeforeUpdateEmail(current, check.email, { url: `${window.location.origin}/sign-in` });
      setSentTo(check.email);
    } catch (err) {
      console.error("Email change failed:", err.code || err.message);
      setError(AUTH_ERRORS[err.code] || "Something went wrong. Please try again or contact support@themodel.cloud.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Alert
        severity="warning"
        sx={{ mb: 3 }}
        action={
          <MDButton variant="gradient" color="warning" size="small" onClick={() => setOpen(true)}>
            Update email address
          </MDButton>
        }
      >
        <AlertTitle>We can&apos;t deliver emails to {user.email}</AlertTitle>
        Emails to this address have been rejected, so you may be missing job alerts, messages and password
        resets. Please update your email address.
      </Alert>

      <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>Update your email address</DialogTitle>
        <DialogContent>
          {sentTo ? (
            <MDBox py={1}>
              <MDTypography variant="body2" color="text" mb={1}>
                We&apos;ve sent a verification link to <strong>{sentTo}</strong>.
              </MDTypography>
              <MDTypography variant="body2" color="text">
                Click the link in that email to finish the change. Your email address won&apos;t change until you do,
                so keep using your current one to sign in until then. Check your spam folder if it doesn&apos;t arrive.
              </MDTypography>
            </MDBox>
          ) : !usesPassword ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              Your account signs in with another provider, so we can&apos;t change the address here. Please contact
              support@themodel.cloud and we&apos;ll update it for you.
            </Alert>
          ) : (
            <MDBox pt={1} display="flex" flexDirection="column" gap={2}>
              <MDTypography variant="body2" color="text">
                Enter the address where you&apos;d like to receive emails. We&apos;ll send a link there to confirm it.
              </MDTypography>
              <TextField
                label="New email address"
                type="email"
                size="small"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={busy}
              />
              <TextField
                label="Your current password"
                type="password"
                size="small"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                helperText="We ask for this to confirm it's you."
              />
              {error && <Alert severity="error">{error}</Alert>}
            </MDBox>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={close} disabled={busy}>
            {sentTo ? "Close" : "Cancel"}
          </MDButton>
          {!sentTo && usesPassword && (
            <MDButton variant="gradient" color="info" onClick={submit} disabled={busy || !newEmail.trim() || !password}>
              {busy ? "Sending..." : "Send verification link"}
            </MDButton>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

export default EmailBounceBanner;
