/**
 * Balance Card Component
 * Displays available and pending balance for models
 */

import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function BalanceCard({ available, pending, stripeBalance, currency, loading, formatCurrency }) {
  // Use Stripe available balance if available, otherwise fall back to Firestore balance
  const actualAvailable = stripeBalance?.available ?? available;

  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <Skeleton variant="text" width="60%" height={30} />
          <Skeleton variant="text" width="80%" height={50} />
          <Skeleton variant="text" width="40%" height={20} />
        </MDBox>
      </Card>
    );
  }

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
            bgColor="success"
            mr={2}
          >
            <Icon fontSize="medium">account_balance_wallet</Icon>
          </MDBox>
          <MDTypography variant="h6" fontWeight="medium">
            Your Balance
          </MDTypography>
        </MDBox>

        {/* Available Balance - show actual Stripe available balance */}
        <MDBox mb={2}>
          <MDTypography variant="body2" color="text" fontWeight="regular">
            Available for withdrawal
          </MDTypography>
          <MDTypography variant="h3" fontWeight="bold" color="success">
            {formatCurrency(actualAvailable, currency)}
          </MDTypography>
        </MDBox>

        {/* Stripe Balance Info - shows when there's a difference between available and Stripe available */}
        {stripeBalance && stripeBalance.pending > 0 && (
          <MDBox
            p={2}
            borderRadius="lg"
            bgColor="info"
            bgGradient
            mb={2}
          >
            <MDTypography variant="body2" color="white" fontWeight="medium">
              {formatCurrency(stripeBalance.pending, currency)} arriving soon
            </MDTypography>
            <MDTypography variant="caption" color="white">
              Funds from completed jobs typically become available within 1-2 business days
            </MDTypography>
          </MDBox>
        )}

        {/* Pending Balance - held for active jobs */}
        {pending > 0 && (
          <MDBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            borderRadius="lg"
            bgColor="grey-100"
          >
            <MDBox>
              <MDTypography variant="body2" color="text" fontWeight="regular">
                Pending
              </MDTypography>
              <MDTypography variant="caption" color="text">
                Held for active jobs
              </MDTypography>
            </MDBox>
            <MDTypography variant="h5" fontWeight="medium" color="warning">
              {formatCurrency(pending, currency)}
            </MDTypography>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

BalanceCard.defaultProps = {
  available: 0,
  pending: 0,
  stripeBalance: null,
  currency: "GBP",
  loading: false,
};

BalanceCard.propTypes = {
  available: PropTypes.number,
  pending: PropTypes.number,
  stripeBalance: PropTypes.shape({
    available: PropTypes.number,
    pending: PropTypes.number,
    currency: PropTypes.string,
  }),
  currency: PropTypes.string,
  loading: PropTypes.bool,
  formatCurrency: PropTypes.func.isRequired,
};

export default BalanceCard;
