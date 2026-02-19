/**
 * Transactions Component
 * Displays transaction history with real data from Stripe
 */

import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Billing page components
import Transaction from "layouts/pages/account/billing/components/Transaction";

function Transactions({ transactions, loading }) {
  const formatCurrency = (amountInCents, currency = "GBP") => {
    const symbols = { GBP: "£", EUR: "€", USD: "$" };
    const symbol = symbols[currency] || currency;
    return `${symbol} ${(amountInCents / 100).toFixed(2)}`;
  };

  const getTransactionConfig = (transaction) => {
    const isIncoming = transaction.type === "refund";
    const isPending = transaction.status === "pending" || transaction.status === "authorized";

    if (isPending) {
      return {
        color: "dark",
        icon: "priority_high",
        value: "Pending",
      };
    }

    if (isIncoming) {
      return {
        color: "success",
        icon: "expand_less",
        value: `+ ${formatCurrency(transaction.amount, transaction.currency)}`,
      };
    }

    return {
      color: "error",
      icon: "expand_more",
      value: `- ${formatCurrency(transaction.clientAmount || transaction.amount, transaction.currency)}`,
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) + ", at " + date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionName = (transaction) => {
    const typeNames = {
      job_payment_authorized: "Job Payment (Held)",
      job_payment_completed: "Job Payment",
      withdrawal: "Withdrawal",
      refund: "Refund",
    };
    return transaction.jobReference || typeNames[transaction.type] || "Payment";
  };

  // Group transactions by date
  const groupTransactionsByDate = (txns) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      today: [],
      yesterday: [],
      older: [],
    };

    txns.forEach((txn) => {
      const txnDate = new Date(txn.createdAt);
      txnDate.setHours(0, 0, 0, 0);

      if (txnDate.getTime() === today.getTime()) {
        groups.today.push(txn);
      } else if (txnDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(txn);
      } else {
        groups.older.push(txn);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <Card sx={{ height: "100%" }}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" pt={3} px={2}>
          <Skeleton variant="text" width="40%" height={30} />
          <Skeleton variant="text" width="30%" height={20} />
        </MDBox>
        <MDBox pt={3} pb={2} px={2}>
          <Skeleton variant="text" width="20%" height={20} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={60} />
        </MDBox>
      </Card>
    );
  }

  const groups = groupTransactionsByDate(transactions);

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" pt={3} px={2}>
        <MDTypography variant="h6" fontWeight="medium" textTransform="capitalize">
          Your Transaction&apos;s
        </MDTypography>
        <MDBox display="flex" alignItems="flex-start">
          <MDBox color="text" mr={0.5} lineHeight={0}>
            <Icon color="inherit" fontSize="small">
              date_range
            </Icon>
          </MDBox>
          <MDTypography variant="button" color="text" fontWeight="regular">
            Recent
          </MDTypography>
        </MDBox>
      </MDBox>
      <MDBox pt={3} pb={2} px={2}>
        {transactions.length === 0 ? (
          <MDBox py={4} textAlign="center">
            <Icon fontSize="large" color="disabled">
              receipt_long
            </Icon>
            <MDTypography variant="body2" color="text" mt={1}>
              No transactions yet
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Your payment history will appear here.
            </MDTypography>
          </MDBox>
        ) : (
          <>
            {groups.today.length > 0 && (
              <>
                <MDBox mb={2}>
                  <MDTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                    today
                  </MDTypography>
                </MDBox>
                <MDBox
                  component="ul"
                  display="flex"
                  flexDirection="column"
                  p={0}
                  m={0}
                  sx={{ listStyle: "none" }}
                >
                  {groups.today.map((txn, index) => {
                    const config = getTransactionConfig(txn);
                    return (
                      <Transaction
                        key={txn.id || index}
                        color={config.color}
                        icon={config.icon}
                        name={getTransactionName(txn)}
                        description={formatDate(txn.createdAt)}
                        value={config.value}
                      />
                    );
                  })}
                </MDBox>
              </>
            )}

            {groups.yesterday.length > 0 && (
              <>
                <MDBox mt={groups.today.length > 0 ? 1 : 0} mb={2}>
                  <MDTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                    yesterday
                  </MDTypography>
                </MDBox>
                <MDBox
                  component="ul"
                  display="flex"
                  flexDirection="column"
                  p={0}
                  m={0}
                  sx={{ listStyle: "none" }}
                >
                  {groups.yesterday.map((txn, index) => {
                    const config = getTransactionConfig(txn);
                    return (
                      <Transaction
                        key={txn.id || index}
                        color={config.color}
                        icon={config.icon}
                        name={getTransactionName(txn)}
                        description={formatDate(txn.createdAt)}
                        value={config.value}
                      />
                    );
                  })}
                </MDBox>
              </>
            )}

            {groups.older.length > 0 && (
              <>
                <MDBox mt={(groups.today.length > 0 || groups.yesterday.length > 0) ? 1 : 0} mb={2}>
                  <MDTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
                    older
                  </MDTypography>
                </MDBox>
                <MDBox
                  component="ul"
                  display="flex"
                  flexDirection="column"
                  p={0}
                  m={0}
                  sx={{ listStyle: "none" }}
                >
                  {groups.older.map((txn, index) => {
                    const config = getTransactionConfig(txn);
                    return (
                      <Transaction
                        key={txn.id || index}
                        color={config.color}
                        icon={config.icon}
                        name={getTransactionName(txn)}
                        description={formatDate(txn.createdAt)}
                        value={config.value}
                      />
                    );
                  })}
                </MDBox>
              </>
            )}
          </>
        )}
      </MDBox>
    </Card>
  );
}

Transactions.defaultProps = {
  transactions: [],
  loading: false,
};

Transactions.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.string,
      jobReference: PropTypes.string,
      amount: PropTypes.number,
      clientAmount: PropTypes.number,
      currency: PropTypes.string,
      status: PropTypes.string,
      createdAt: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
};

export default Transactions;
