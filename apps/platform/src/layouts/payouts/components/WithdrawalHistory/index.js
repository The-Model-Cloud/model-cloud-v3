/**
 * Withdrawal History Component
 * Displays list of past withdrawal requests
 */

import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import DataTable from "examples/Tables/DataTable";

function WithdrawalHistory({ withdrawals, loading, formatCurrency }) {
  const getStatusChip = (status) => {
    const statusConfig = {
      completed: { color: "success", label: "Completed", icon: "check_circle" },
      processing: { color: "info", label: "Processing", icon: "hourglass_empty" },
      pending: { color: "warning", label: "Pending", icon: "schedule" },
      failed: { color: "error", label: "Failed", icon: "error" },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Chip
        icon={<Icon fontSize="small">{config.icon}</Icon>}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const columns = [
    { Header: "Date", accessor: "date", width: "20%" },
    { Header: "Amount", accessor: "amount", width: "20%" },
    { Header: "Fee", accessor: "fee", width: "15%" },
    { Header: "Net Amount", accessor: "netAmount", width: "20%" },
    { Header: "Status", accessor: "status", width: "25%", align: "center" },
  ];

  const rows = withdrawals.map((withdrawal) => ({
    date: (
      <MDTypography variant="caption" fontWeight="medium">
        {formatDate(withdrawal.requestedAt)}
      </MDTypography>
    ),
    amount: (
      <MDTypography variant="caption" fontWeight="medium">
        {formatCurrency(withdrawal.amount, withdrawal.currency)}
      </MDTypography>
    ),
    fee: (
      <MDTypography variant="caption" color="error">
        -{formatCurrency(withdrawal.fee, withdrawal.currency)}
      </MDTypography>
    ),
    netAmount: (
      <MDTypography variant="caption" fontWeight="bold" color="success">
        {formatCurrency(withdrawal.netAmount, withdrawal.currency)}
      </MDTypography>
    ),
    status: getStatusChip(withdrawal.status),
  }));

  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <Skeleton variant="text" width="30%" height={30} />
          <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
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
            width="2.5rem"
            height="2.5rem"
            borderRadius="lg"
            color="white"
            bgColor="dark"
            mr={2}
          >
            <Icon fontSize="small">history</Icon>
          </MDBox>
          <MDTypography variant="h6" fontWeight="medium">
            Withdrawal History
          </MDTypography>
        </MDBox>

        {withdrawals.length === 0 ? (
          <MDBox
            p={4}
            textAlign="center"
            borderRadius="lg"
            bgColor="grey-100"
          >
            <Icon fontSize="large" color="disabled">
              account_balance_wallet
            </Icon>
            <MDTypography variant="body2" color="text" mt={1}>
              No withdrawals yet
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Your withdrawal history will appear here once you make your first withdrawal.
            </MDTypography>
          </MDBox>
        ) : (
          <DataTable
            table={{ columns, rows }}
            entriesPerPage={false}
            showTotalEntries={false}
            isSorted={false}
            noEndBorder
          />
        )}
      </MDBox>
    </Card>
  );
}

WithdrawalHistory.defaultProps = {
  withdrawals: [],
  loading: false,
};

WithdrawalHistory.propTypes = {
  withdrawals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      amount: PropTypes.number,
      fee: PropTypes.number,
      netAmount: PropTypes.number,
      currency: PropTypes.string,
      status: PropTypes.string,
      requestedAt: PropTypes.string,
      processedAt: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
  formatCurrency: PropTypes.func.isRequired,
};

export default WithdrawalHistory;
