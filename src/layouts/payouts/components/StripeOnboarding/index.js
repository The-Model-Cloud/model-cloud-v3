/**
 * Stripe Onboarding Component
 * Handles Stripe Connect account setup for models
 */

import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// API
import {
  createStripeConnectedAccount,
  createStripeOnboardingLink,
  createStripeDashboardLink,
} from "utils/api";

function StripeOnboarding({ stripeStatus, loading, onSetupComplete }) {
  const [processing, setProcessing] = useState(false);

  const handleSetupAccount = async () => {
    setProcessing(true);
    try {
      let result;

      if (stripeStatus?.hasAccount) {
        // Account exists but needs to complete onboarding
        result = await createStripeOnboardingLink();
      } else {
        // Create new account
        result = await createStripeConnectedAccount();
      }

      if (result.success && (result.onboardingUrl || result.url)) {
        // Redirect to Stripe onboarding
        window.location.href = result.onboardingUrl || result.url;
      } else {
        throw new Error("Failed to get onboarding URL");
      }
    } catch (error) {
      console.error("Failed to setup Stripe account:", error);
      alert("Failed to start account setup. Please try again.");
      setProcessing(false);
    }
  };

  const handleViewDashboard = async () => {
    setProcessing(true);
    try {
      const result = await createStripeDashboardLink();
      if (result.success && result.dashboardUrl) {
        window.open(result.dashboardUrl, "_blank");
      } else {
        throw new Error("Failed to get dashboard URL");
      }
    } catch (error) {
      console.error("Failed to open Stripe dashboard:", error);
      alert("Failed to open Stripe dashboard. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <Skeleton variant="text" width="60%" height={30} />
          <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
          <Skeleton variant="rectangular" height={40} sx={{ mt: 2 }} />
        </MDBox>
      </Card>
    );
  }

  const hasAccount = stripeStatus?.hasAccount;
  const isComplete = stripeStatus?.detailsSubmitted;
  const payoutsEnabled = stripeStatus?.payoutsEnabled;

  return (
    <Card>
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" mb={2}>
          <MDBox
            display="flex"
            alignItems="center"
            justifyContent="center"
            width="3rem"
            height="3rem"
            borderRadius="lg"
            color="white"
            bgColor={hasAccount && payoutsEnabled ? "success" : "info"}
            mr={2}
          >
            <Icon fontSize="medium">
              {hasAccount && payoutsEnabled ? "check_circle" : "account_balance"}
            </Icon>
          </MDBox>
          <MDTypography variant="h6" fontWeight="medium">
            {hasAccount && payoutsEnabled ? "Payout Account" : "Set Up Payouts"}
          </MDTypography>
        </MDBox>

        {!hasAccount ? (
          // No account - show setup prompt
          <MDBox>
            <MDTypography variant="body2" color="text" mb={2}>
              Connect your bank account to receive payments for completed jobs. We use Stripe for
              secure payment processing.
            </MDTypography>
            <MDBox
              p={2}
              borderRadius="lg"
              bgColor="grey-100"
              mb={2}
            >
              <MDTypography variant="caption" color="text">
                <Icon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }}>
                  security
                </Icon>
                Your bank details are securely stored by Stripe and never stored on our servers.
              </MDTypography>
            </MDBox>
            <MDButton
              variant="gradient"
              color="info"
              fullWidth
              onClick={handleSetupAccount}
              disabled={processing}
            >
              {processing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <>
                  <Icon sx={{ mr: 1 }}>account_balance</Icon>
                  Set Up Payout Account
                </>
              )}
            </MDButton>
          </MDBox>
        ) : !isComplete || !payoutsEnabled ? (
          // Account exists but not complete
          <MDBox>
            <MDTypography variant="body2" color="warning" mb={2}>
              Your payout account setup is incomplete. Please complete the verification to receive
              payments.
            </MDTypography>
            {stripeStatus?.requirements?.currently_due?.length > 0 && (
              <MDBox
                p={2}
                borderRadius="lg"
                bgColor="warning"
                bgGradient
                mb={2}
              >
                <MDTypography variant="caption" color="white">
                  <strong>Required:</strong>{" "}
                  {stripeStatus.requirements.currently_due.join(", ").replace(/_/g, " ")}
                </MDTypography>
              </MDBox>
            )}
            <MDButton
              variant="gradient"
              color="warning"
              fullWidth
              onClick={handleSetupAccount}
              disabled={processing}
            >
              {processing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <>
                  <Icon sx={{ mr: 1 }}>pending_actions</Icon>
                  Complete Setup
                </>
              )}
            </MDButton>
          </MDBox>
        ) : (
          // Account complete and payouts enabled
          <MDBox>
            <MDTypography variant="body2" color="success" mb={2}>
              Your payout account is set up and ready to receive payments.
            </MDTypography>
            <MDButton
              variant="outlined"
              color="info"
              fullWidth
              onClick={handleViewDashboard}
              disabled={processing}
            >
              {processing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <>
                  <Icon sx={{ mr: 1 }}>open_in_new</Icon>
                  View Stripe Dashboard
                </>
              )}
            </MDButton>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

StripeOnboarding.defaultProps = {
  stripeStatus: null,
  loading: false,
};

StripeOnboarding.propTypes = {
  stripeStatus: PropTypes.shape({
    hasAccount: PropTypes.bool,
    status: PropTypes.string,
    detailsSubmitted: PropTypes.bool,
    payoutsEnabled: PropTypes.bool,
    chargesEnabled: PropTypes.bool,
    requirements: PropTypes.shape({
      currently_due: PropTypes.arrayOf(PropTypes.string),
    }),
  }),
  loading: PropTypes.bool,
  onSetupComplete: PropTypes.func.isRequired,
};

export default StripeOnboarding;
