/**
 * Model Payouts Dashboard
 * Allows models to view their balance, set up Stripe payouts, and request withdrawals
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";

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
import WithdrawalForm from "layouts/payouts/components/WithdrawalForm";
import WithdrawalHistory from "layouts/payouts/components/WithdrawalHistory";

// API
import {
  getModelBalance,
  getStripeAccountStatus,
  getWithdrawalHistory,
} from "utils/api";

function Payouts() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ available: 0, pending: 0, currency: "GBP" });
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState(1.5);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Check for success/refresh URL params (from Stripe onboarding redirect)
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Stripe account setup completed successfully!");
    }
    if (searchParams.get("refresh") === "true") {
      setErrorMessage("Please complete your Stripe account setup to receive payouts.");
    }
  }, [searchParams]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error("Failed to load payout data:", error);
      setErrorMessage("Failed to load payout information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalSuccess = () => {
    setSuccessMessage("Withdrawal request submitted successfully!");
    loadData(); // Refresh data
  };

  const handleStripeSetupComplete = () => {
    loadData(); // Refresh data after Stripe setup
  };

  const formatCurrency = (amountInCents, currency = "GBP") => {
    const symbols = { GBP: "£", EUR: "€", USD: "$" };
    const symbol = symbols[currency] || currency;
    return `${symbol}${(amountInCents / 100).toFixed(2)}`;
  };

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
              currency={balance.currency}
              loading={loading}
              formatCurrency={formatCurrency}
            />
          </Grid>

          {/* Stripe Setup / Withdrawal Form */}
          <Grid item xs={12} md={6} lg={4}>
            {!stripeStatus?.hasAccount || !stripeStatus?.payoutsEnabled ? (
              <StripeOnboarding
                stripeStatus={stripeStatus}
                loading={loading}
                onSetupComplete={handleStripeSetupComplete}
              />
            ) : (
              <WithdrawalForm
                availableBalance={balance.available}
                currency={balance.currency}
                withdrawalFeePercent={withdrawalFeePercent}
                formatCurrency={formatCurrency}
                onSuccess={handleWithdrawalSuccess}
                onError={setErrorMessage}
              />
            )}
          </Grid>

          {/* Account Status */}
          <Grid item xs={12} md={12} lg={4}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h6" fontWeight="medium" mb={2}>
                  Account Status
                </MDTypography>
                <MDBox>
                  <MDBox display="flex" justifyContent="space-between" mb={1}>
                    <MDTypography variant="body2" color="text">
                      Stripe Account
                    </MDTypography>
                    <MDTypography
                      variant="body2"
                      fontWeight="medium"
                      color={stripeStatus?.hasAccount ? "success" : "warning"}
                    >
                      {stripeStatus?.hasAccount ? "Connected" : "Not Set Up"}
                    </MDTypography>
                  </MDBox>
                  <MDBox display="flex" justifyContent="space-between" mb={1}>
                    <MDTypography variant="body2" color="text">
                      Payouts Enabled
                    </MDTypography>
                    <MDTypography
                      variant="body2"
                      fontWeight="medium"
                      color={stripeStatus?.payoutsEnabled ? "success" : "warning"}
                    >
                      {stripeStatus?.payoutsEnabled ? "Yes" : "No"}
                    </MDTypography>
                  </MDBox>
                  <MDBox display="flex" justifyContent="space-between" mb={1}>
                    <MDTypography variant="body2" color="text">
                      Withdrawal Fee
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium">
                      {withdrawalFeePercent}%
                    </MDTypography>
                  </MDBox>
                </MDBox>
              </MDBox>
            </Card>
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
