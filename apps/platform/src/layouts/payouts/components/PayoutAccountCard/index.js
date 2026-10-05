/**
 * Payout Account Card
 * Always shown on the Payouts page. Shows the connected bank, what Stripe needs next, and lets the model
 * manage the account: the Stripe Express dashboard (change bank, name, address) or Stripe's own form (to
 * supply details Stripe is asking for). Bank details are held by Stripe; we only show the name and last 4 digits.
 */

import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// API
import { createStripeDashboardLink, createStripeOnboardingLink } from "utils/api";

// What Stripe calls the things it can ask for, in plain English
const REQUIREMENT_LABELS = {
  external_account: "A bank account to pay you into",
  "individual.first_name": "Your first name",
  "individual.last_name": "Your last name",
  "individual.dob.day": "Your date of birth",
  "individual.dob.month": "Your date of birth",
  "individual.dob.year": "Your date of birth",
  "individual.address.line1": "Your home address",
  "individual.address.city": "Your home address",
  "individual.address.postal_code": "Your home address",
  "individual.email": "Your email address",
  "individual.phone": "Your phone number",
  "individual.id_number": "Your ID number",
  "individual.verification.document": "A photo of your ID document",
  "individual.verification.additional_document": "A document proving your address",
  "business_profile.url": "A website or social media link",
  "business_profile.mcc": "What type of work you do",
  "tos_acceptance.date": "Acceptance of Stripe's terms",
  "tos_acceptance.ip": "Acceptance of Stripe's terms",
};

const describeRequirements = (keys = []) => {
  const labels = keys.map(
    (key) => REQUIREMENT_LABELS[key] || key.replace(/^individual\./, "").replace(/[._]/g, " ")
  );
  return [...new Set(labels)];
};

// Why Stripe has paused payouts, in plain English
const describeDisabledReason = (reason) => {
  if (!reason) return null;
  if (reason.startsWith("rejected")) {
    return "Stripe could not approve this payout account. Please contact support@themodel.cloud.";
  }
  switch (reason) {
    case "requirements.past_due":
      return "Stripe needs more information from you before payouts can continue.";
    case "requirements.pending_verification":
      return "Stripe is checking your details. This usually takes a day or two, and payouts resume automatically.";
    case "under_review":
      return "Stripe is reviewing your account. Payouts resume once the review is finished.";
    case "listed":
      return "Stripe has paused this account. Please contact support@themodel.cloud.";
    case "platform_paused":
      return "Payouts for this account are paused. Please contact support@themodel.cloud.";
    default:
      return "Stripe has paused payouts on this account. Open the setup below to see what is needed.";
  }
};

function PayoutAccountCard({ stripeStatus, loading, withdrawalFeePercent }) {
  const [busy, setBusy] = useState(""); // "dashboard" | "update" | ""
  const [error, setError] = useState("");

  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <Skeleton variant="text" width="50%" height={30} />
          <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} />
        </MDBox>
      </Card>
    );
  }

  const hasAccount = Boolean(stripeStatus?.hasAccount);
  const detailsSubmitted = Boolean(stripeStatus?.detailsSubmitted);
  const payoutsEnabled = Boolean(stripeStatus?.payoutsEnabled);
  const bank = stripeStatus?.bankAccount;
  const pastDue = describeRequirements(stripeStatus?.requirements?.past_due);
  const currentlyDue = describeRequirements(stripeStatus?.requirements?.currently_due);
  // Everything Stripe wants now (past due items are part of "currently due")
  const needed = [...new Set([...pastDue, ...currentlyDue])];
  const pauseReason = !payoutsEnabled && detailsSubmitted ? describeDisabledReason(stripeStatus?.disabledReason) : null;
  const needsAction = hasAccount && needed.length > 0;

  // Stripe's own form, to supply what is missing
  const handleUpdateDetails = async () => {
    setBusy("update");
    setError("");
    try {
      const result = await createStripeOnboardingLink();
      if (result.success && result.onboardingUrl) {
        window.location.href = result.onboardingUrl;
      } else {
        throw new Error("No link returned");
      }
    } catch (err) {
      console.error("Could not open Stripe setup:", err);
      setError("We could not open Stripe just now. Please try again.");
      setBusy("");
    }
  };

  // Stripe Express dashboard: change bank account, name, address; see payouts. Opened in a new tab; the tab is
  // opened straight away (before the request) so the browser's pop-up blocker lets it through.
  const handleManage = async () => {
    setBusy("dashboard");
    setError("");
    const tab = window.open("about:blank", "_blank");
    try {
      const result = await createStripeDashboardLink();
      if (result.success && result.dashboardUrl) {
        if (tab) {
          tab.location.href = result.dashboardUrl;
        } else {
          window.location.href = result.dashboardUrl;
        }
      } else {
        throw new Error(result.error || "No link returned");
      }
    } catch (err) {
      console.error("Could not open the Stripe dashboard:", err);
      if (tab) tab.close();
      setError(
        err.message && err.message.includes("Finish setting up")
          ? err.message
          : "We could not open your Stripe account just now. Please try again."
      );
    } finally {
      setBusy("");
    }
  };

  const row = (label, value, color) => (
    <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} mb={1}>
      <MDTypography variant="body2" color="text">
        {label}
      </MDTypography>
      <MDTypography variant="body2" fontWeight="medium" color={color} textAlign="right">
        {value}
      </MDTypography>
    </MDBox>
  );

  return (
    <Card>
      <MDBox p={3}>
        <MDTypography variant="h6" fontWeight="medium" mb={2}>
          Payout Account
        </MDTypography>

        {/* What is wrong, and how to fix it */}
        {pauseReason && (
          <Alert severity={stripeStatus?.disabledReason?.startsWith("rejected") ? "error" : "warning"} sx={{ mb: 2 }}>
            {pauseReason}
          </Alert>
        )}

        {needsAction && (
          <MDBox mb={2}>
            <Alert severity="warning">
              Stripe needs the following from you:
              <MDBox component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                {needed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </MDBox>
            </Alert>
          </MDBox>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Status */}
        {row("Stripe account", hasAccount ? "Connected" : "Not set up", hasAccount ? "success" : "warning")}
        {row("Payouts", payoutsEnabled ? "Enabled" : hasAccount ? "On hold" : "Not enabled", payoutsEnabled ? "success" : "warning")}
        {row(
          "Bank account",
          bank?.last4 ? `${bank.bankName ? `${bank.bankName} ` : ""}•••• ${bank.last4}` : hasAccount ? "None added yet" : "—",
          bank?.last4 ? undefined : "text"
        )}
        {row("Withdrawal fee", `${withdrawalFeePercent}%`)}

        {hasAccount && (
          <>
            <Divider sx={{ my: 2 }} />

            {needsAction && (
              <MDButton
                variant="gradient"
                color="warning"
                fullWidth
                onClick={handleUpdateDetails}
                disabled={Boolean(busy)}
                sx={{ mb: 1.5 }}
              >
                {busy === "update" ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <>
                    <Icon sx={{ mr: 1 }}>pending_actions</Icon>
                    Update details with Stripe
                  </>
                )}
              </MDButton>
            )}

            {detailsSubmitted && (
              <>
                <MDButton
                  variant={needsAction ? "outlined" : "gradient"}
                  color="info"
                  fullWidth
                  onClick={handleManage}
                  disabled={Boolean(busy)}
                >
                  {busy === "dashboard" ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <>
                      <Icon sx={{ mr: 1 }}>manage_accounts</Icon>
                      Manage payout account
                    </>
                  )}
                </MDButton>
                <MDTypography variant="caption" color="text" display="block" mt={1}>
                  Opens Stripe in a new tab, where you can change your bank account, name and address. Stripe may
                  pause payouts briefly while it checks a new bank account. Come back here afterwards and this page
                  will update.
                </MDTypography>
              </>
            )}
          </>
        )}
      </MDBox>
    </Card>
  );
}

PayoutAccountCard.defaultProps = {
  stripeStatus: null,
  loading: false,
  withdrawalFeePercent: 1.5,
};

PayoutAccountCard.propTypes = {
  stripeStatus: PropTypes.shape({
    hasAccount: PropTypes.bool,
    detailsSubmitted: PropTypes.bool,
    payoutsEnabled: PropTypes.bool,
    disabledReason: PropTypes.string,
    bankAccount: PropTypes.shape({
      bankName: PropTypes.string,
      last4: PropTypes.string,
      currency: PropTypes.string,
    }),
    requirements: PropTypes.shape({
      currently_due: PropTypes.arrayOf(PropTypes.string),
      past_due: PropTypes.arrayOf(PropTypes.string),
    }),
  }),
  loading: PropTypes.bool,
  withdrawalFeePercent: PropTypes.number,
};

export default PayoutAccountCard;
