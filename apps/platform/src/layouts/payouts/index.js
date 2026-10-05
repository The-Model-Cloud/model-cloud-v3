/**
 * Model Payouts Dashboard
 * Allows models to view their balance, set up and manage their Stripe payout account, and request withdrawals
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Icon from "@mui/material/Icon";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Payouts components
import BalanceCard from "layouts/payouts/components/BalanceCard";
import StripeOnboarding from "layouts/payouts/components/StripeOnboarding";
import PayoutAccountCard from "layouts/payouts/components/PayoutAccountCard";
import WithdrawalForm from "layouts/payouts/components/WithdrawalForm";
import WithdrawalHistory from "layouts/payouts/components/WithdrawalHistory";

// API
import {
  getModelBalance,
  getStripeAccountStatus,
  getWithdrawalHistory,
} from "utils/api";

// Don't re-check Stripe more often than this when the model switches back to this tab
const REFRESH_MIN_INTERVAL_MS = 5000;

function Payouts() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ available: 0, pending: 0, currency: "GBP" });
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState(1.5);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const lastLoadedAt = useRef(0);

  // Stripe sends the model back with ?refresh=true when the setup link expired or was abandoned
  useEffect(() => {
    if (searchParams.get("refresh") === "true") {
      setErrorMessage("Please complete your Stripe account setup to receive payouts.");
    }
  }, [searchParams]);

  // `silent` refreshes the data without the loading skeletons (used when the model comes back from Stripe)
  const loadData = useCallback(async (silent = false) => {
    lastLoadedAt.current = Date.now();
    if (!silent) setLoading(true);
    try {
      // Load balance, stripe status, and withdrawal history in parallel
      const [balanceResult, stripeResult, withdrawalResult] = await Promise.all([
        getModelBalance().catch(() => ({ success: false })),
        getStripeAccountStatus().catch(() => ({ success: false })),
        getWithdrawalHistory(20).catch(() => ({ success: false })),
      ]);

      if (balanceResult.success) {
        setBalance(balanceResult.balance);
        setWithdrawalFeePercent(balanceResult.withdrawalFeePercent || 1.5);
      }

      if (stripeResult.success) {
        setStripeStatus(stripeResult);
      }

      if (withdrawalResult.success) {
        setWithdrawals(withdrawalResult.withdrawals || []);
      }

      // Stripe also sends the model back to ?success=true when they simply leave the form, so only
      // say "all set" when Stripe confirms payouts are on
      if (!silent && searchParams.get("success") === "true" && stripeResult.success) {
        if (stripeResult.payoutsEnabled) {
          setSuccessMessage("Your Stripe payout account is set up and ready.");
        } else {
          setWarningMessage(
            "Thanks. Stripe still needs a few details or is checking the ones you gave. See Payout Account below for what is left."
          );
        }
      }
    } catch (error) {
      console.error("Failed to load payout data:", error);
      setErrorMessage("Failed to load payout information. Please try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // The model manages their account in a Stripe tab; when they switch back here, show what changed
  useEffect(() => {
    const onFocus = () => {
      if (document.hidden) return;
      if (Date.now() - lastLoadedAt.current < REFRESH_MIN_INTERVAL_MS) return;
      loadData(true);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  const handleWithdrawalSuccess = () => {
    setSuccessMessage("Withdrawal request submitted successfully!");
    loadData(true); // Refresh data
  };

  const handleStripeSetupComplete = () => {
    loadData(true); // Refresh data after Stripe setup
  };

  const formatCurrency = (amountInCents, currency = "GBP") => {
    const symbols = { GBP: "£", EUR: "€", USD: "$" };
    const symbol = symbols[currency] || currency;
    return `${symbol}${(amountInCents / 100).toFixed(2)}`;
  };

  // Where the model is with Stripe decides what the middle card offers
  const hasAccount = Boolean(stripeStatus?.hasAccount);
  const detailsSubmitted = Boolean(stripeStatus?.detailsSubmitted);
  const payoutsEnabled = Boolean(stripeStatus?.payoutsEnabled);
  const needsSetup = !hasAccount || !detailsSubmitted; // no account yet, or the first setup was not finished
  const onHold = hasAccount && detailsSubmitted && !payoutsEnabled; // set up, but Stripe has paused payouts

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mt={4} mb={3}>
        {/* Page Header */}
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Payouts
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Manage your earnings and withdraw funds to your bank account
          </MDTypography>
        </MDBox>

        {/* Success/Error Messages */}
        {successMessage && (
          <MDBox mb={3}>
            <Alert severity="success" onClose={() => setSuccessMessage("")}>
              {successMessage}
            </Alert>
          </MDBox>
        )}
        {warningMessage && (
          <MDBox mb={3}>
            <Alert severity="warning" onClose={() => setWarningMessage("")}>
              {warningMessage}
            </Alert>
          </MDBox>
        )}
        {errorMessage && (
          <MDBox mb={3}>
            <Alert severity="error" onClose={() => setErrorMessage("")}>
              {errorMessage}
            </Alert>
          </MDBox>
        )}

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Balance Card */}
          <Grid item xs={12} md={6} lg={4}>
            <BalanceCard
              available={balance.available}
              pending={balance.pending}
              stripeBalance={stripeStatus?.balance}
              currency={balance.currency}
              loading={loading}
              formatCurrency={formatCurrency}
            />
          </Grid>

          {/* Stripe setup / withdrawals */}
          <Grid item xs={12} md={6} lg={4}>
            {needsSetup ? (
              <StripeOnboarding
                stripeStatus={stripeStatus}
                loading={loading}
                onSetupComplete={handleStripeSetupComplete}
              />
            ) : onHold ? (
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
                      bgColor="warning"
                      mr={2}
                    >
                      <Icon fontSize="medium">pause_circle</Icon>
                    </MDBox>
                    <MDTypography variant="h6" fontWeight="medium">
                      Withdrawals on hold
                    </MDTypography>
                  </MDBox>
                  <MDTypography variant="body2" color="text">
                    Stripe has paused payouts on your account, so you cannot withdraw right now. Your earnings are
                    safe. See <strong>Payout Account</strong> for what Stripe needs. Withdrawals switch back on
                    here as soon as Stripe is happy.
                  </MDTypography>
                </MDBox>
              </Card>
            ) : (
              <WithdrawalForm
                availableBalance={balance.available}
                stripeBalance={stripeStatus?.balance}
                currency={balance.currency}
                withdrawalFeePercent={withdrawalFeePercent}
                formatCurrency={formatCurrency}
                onSuccess={handleWithdrawalSuccess}
                onError={setErrorMessage}
              />
            )}
          </Grid>

          {/* Payout account: bank, what Stripe needs, manage */}
          <Grid item xs={12} md={12} lg={4}>
            <PayoutAccountCard
              stripeStatus={stripeStatus}
              loading={loading}
              withdrawalFeePercent={withdrawalFeePercent}
            />
          </Grid>

          {/* Withdrawal History */}
          <Grid item xs={12}>
            <WithdrawalHistory
              withdrawals={withdrawals}
              loading={loading}
              formatCurrency={formatCurrency}
            />
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Payouts;
