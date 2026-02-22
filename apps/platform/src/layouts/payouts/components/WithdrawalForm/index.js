/**
 * Withdrawal Form Component
 * Allows models to request withdrawals to their bank account
 */

import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// API
import { requestWithdrawal } from "utils/api";

function WithdrawalForm({
  availableBalance,
  stripeBalance,
  currency,
  withdrawalFeePercent,
  formatCurrency,
  onSuccess,
  onError,
}) {
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  // Use Stripe available balance if available, otherwise fall back to Firestore balance
  const actualAvailable = stripeBalance?.available ?? availableBalance;
  const pendingInStripe = stripeBalance?.pending || 0;
  const availableInUnits = actualAvailable / 100;
  const amountNum = parseFloat(amount) || 0;
  const feeAmount = amountNum * (withdrawalFeePercent / 100);
  const netAmount = amountNum - feeAmount;

  const currencySymbols = { GBP: "£", EUR: "€", USD: "$" };
  const symbol = currencySymbols[currency] || currency;

  const isValidAmount = amountNum > 0 && amountNum <= availableInUnits;

  const handleWithdraw = async () => {
    if (!isValidAmount) return;

    setProcessing(true);
    try {
      const result = await requestWithdrawal(amountNum);
      if (result.success) {
        setAmount("");
        onSuccess();
      } else {
        throw new Error(result.message || "Withdrawal failed");
      }
    } catch (error) {
      console.error("Withdrawal failed:", error);
      onError(error.message || "Failed to process withdrawal. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(availableInUnits.toFixed(2));
  };

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
            bgColor="primary"
            mr={2}
          >
            <Icon fontSize="medium">payments</Icon>
          </MDBox>
          <MDTypography variant="h6" fontWeight="medium">
            Withdraw Funds
          </MDTypography>
        </MDBox>

        {/* Warning if funds are pending in Stripe */}
        {pendingInStripe > 0 && (
          <MDBox
            p={2}
            borderRadius="lg"
            bgColor="info"
            bgGradient
            mb={2}
          >
            <MDTypography variant="body2" color="white" fontWeight="medium">
              {formatCurrency(pendingInStripe, currency)} arriving soon
            </MDTypography>
            <MDTypography variant="caption" color="white">
              These funds will be available for withdrawal in 1-2 business days
            </MDTypography>
          </MDBox>
        )}

        {actualAvailable <= 0 ? (
          <MDBox
            p={2}
            borderRadius="lg"
            bgColor="grey-100"
            textAlign="center"
          >
            <MDTypography variant="body2" color="text">
              No funds available for withdrawal.
            </MDTypography>
            <MDTypography variant="caption" color="text">
              {pendingInStripe > 0
                ? "Your funds are still being processed - check back in 1-2 business days."
                : "Complete jobs to earn money."}
            </MDTypography>
          </MDBox>
        ) : (
          <>
            {/* Amount Input */}
            <MDBox mb={2}>
              <MDInput
                type="number"
                label="Amount to withdraw"
                fullWidth
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{symbol}</InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <MDButton
                        variant="text"
                        color="info"
                        size="small"
                        onClick={handleMaxClick}
                      >
                        Max
                      </MDButton>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  min: 0,
                  max: availableInUnits,
                  step: 0.01,
                }}
              />
              <MDTypography variant="caption" color="text">
                Available: {formatCurrency(availableBalance, currency)}
              </MDTypography>
            </MDBox>

            {/* Fee Breakdown */}
            {amountNum > 0 && (
              <MDBox
                p={2}
                borderRadius="lg"
                bgColor="grey-100"
                mb={2}
              >
                <MDBox display="flex" justifyContent="space-between" mb={0.5}>
                  <MDTypography variant="caption" color="text">
                    Withdrawal amount
                  </MDTypography>
                  <MDTypography variant="caption" fontWeight="medium">
                    {symbol}{amountNum.toFixed(2)}
                  </MDTypography>
                </MDBox>
                <MDBox display="flex" justifyContent="space-between" mb={0.5}>
                  <MDTypography variant="caption" color="text">
                    Fee ({withdrawalFeePercent}%)
                  </MDTypography>
                  <MDTypography variant="caption" fontWeight="medium" color="error">
                    -{symbol}{feeAmount.toFixed(2)}
                  </MDTypography>
                </MDBox>
                <MDBox
                  display="flex"
                  justifyContent="space-between"
                  pt={1}
                  borderTop="1px solid"
                  borderColor="grey-300"
                >
                  <MDTypography variant="body2" fontWeight="medium">
                    You&apos;ll receive
                  </MDTypography>
                  <MDTypography variant="body2" fontWeight="bold" color="success">
                    {symbol}{netAmount.toFixed(2)}
                  </MDTypography>
                </MDBox>
              </MDBox>
            )}

            {/* Withdraw Button */}
            <MDButton
              variant="gradient"
              color="success"
              fullWidth
              onClick={handleWithdraw}
              disabled={!isValidAmount || processing}
            >
              {processing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <>
                  <Icon sx={{ mr: 1 }}>send</Icon>
                  Withdraw to Bank
                </>
              )}
            </MDButton>

            {/* Timing Info */}
            <MDBox mt={2} textAlign="center">
              <MDTypography variant="caption" color="text">
                Funds typically arrive in 1-2 business days
              </MDTypography>
            </MDBox>
          </>
        )}
      </MDBox>
    </Card>
  );
}

WithdrawalForm.defaultProps = {
  availableBalance: 0,
  stripeBalance: null,
  currency: "GBP",
  withdrawalFeePercent: 1.5,
};

WithdrawalForm.propTypes = {
  availableBalance: PropTypes.number,
  stripeBalance: PropTypes.shape({
    available: PropTypes.number,
    pending: PropTypes.number,
    currency: PropTypes.string,
  }),
  currency: PropTypes.string,
  withdrawalFeePercent: PropTypes.number,
  formatCurrency: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default WithdrawalForm;
