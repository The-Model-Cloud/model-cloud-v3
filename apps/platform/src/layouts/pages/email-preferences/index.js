/**
 * Public email preferences page (no login required).
 *
 * Reached from links in emails: /email-preferences?t=<signed token>[&a=optin|unsubscribe]
 * Nothing changes on page load. Consent is only recorded when the user clicks a button,
 * so automated email link scanners cannot opt anyone in or out.
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import PageLayout from "examples/LayoutContainers/PageLayout";
import { callPublicCloudFunction } from "utils/api";

const STATUS_TEXT = {
  opted_in: "You're opted in to marketing emails from The Model Cloud.",
  opted_out: "You're unsubscribed from marketing emails. We'll still send essential account emails.",
  unconfirmed: "We don't yet have your confirmation to send you marketing emails.",
  not_opted_in: "You're not currently receiving marketing emails.",
};

function EmailPreferences() {
  const [params] = useSearchParams();
  const token = params.get("t");
  const intent = params.get("a");

  const [state, setState] = useState({ loading: true, error: "", info: null });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: "This link is invalid or incomplete.", info: null });
      return;
    }
    callPublicCloudFunction("emailPreferences", { token, action: "status" })
      .then((info) => setState({ loading: false, error: "", info }))
      .catch(() =>
        setState({ loading: false, error: "This link is invalid or the account no longer exists.", info: null })
      );
  }, [token]);

  const act = async (action, doneMessage) => {
    setSaving(true);
    setMessage("");
    try {
      const info = await callPublicCloudFunction("emailPreferences", { token, action, intent });
      setState({ loading: false, error: "", info });
      setMessage(doneMessage);
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const { info } = state;
  const optedIn = info?.consentStatus === "opted_in";

  return (
    <PageLayout>
      <Container maxWidth="sm">
        <MDBox pt={12} pb={6}>
          <Card>
            <MDBox p={4} textAlign="center">
              <MDTypography variant="h4" fontWeight="bold" mb={1}>
                Email preferences
              </MDTypography>

              {state.loading && (
                <MDBox py={4}>
                  <CircularProgress color="info" />
                </MDBox>
              )}

              {state.error && (
                <MDTypography variant="body2" color="error" mt={2}>
                  {state.error}
                </MDTypography>
              )}

              {info && (
                <>
                  <MDTypography variant="body2" color="text" mb={3}>
                    {info.firstName ? `Hi ${info.firstName}. ` : ""}
                    {STATUS_TEXT[info.consentStatus] || STATUS_TEXT.not_opted_in}
                  </MDTypography>

                  {message && (
                    <MDTypography variant="button" color="success" fontWeight="medium" display="block" mb={2}>
                      {message}
                    </MDTypography>
                  )}

                  {!optedIn && (
                    <MDButton
                      variant="gradient"
                      color="info"
                      disabled={saving}
                      onClick={() => act("opt_in", "Thanks, you're now opted in.")}
                      sx={{ mb: 2 }}
                      fullWidth
                    >
                      {intent === "optin" ? "Continue Opt-In" : "Opt in to marketing emails"}
                    </MDButton>
                  )}

                  {optedIn && (
                    <MDButton
                      variant={intent === "unsubscribe" ? "gradient" : "outlined"}
                      color={intent === "unsubscribe" ? "error" : "dark"}
                      disabled={saving}
                      onClick={() => act("opt_out", "You've been unsubscribed.")}
                      sx={{ mb: 2 }}
                      fullWidth
                    >
                      Unsubscribe from marketing emails
                    </MDButton>
                  )}

                  <MDTypography variant="caption" color="text" display="block" mt={3}>
                    Want to delete your account and data?{" "}
                    <MDTypography
                      component={Link}
                      to="/pages/account/settings"
                      variant="caption"
                      color="info"
                      fontWeight="medium"
                    >
                      Sign in to delete your account
                    </MDTypography>
                  </MDTypography>
                </>
              )}
            </MDBox>
          </Card>
        </MDBox>
      </Container>
    </PageLayout>
  );
}

export default EmailPreferences;
