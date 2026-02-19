/**
 * Payments & Invoices Page
 * Allows clients to manage payment methods, view invoices and transaction history
 */

import { useState, useEffect } from "react";

// @mui material components
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import MasterCard from "examples/Cards/MasterCard";
import DefaultInfoCard from "examples/Cards/InfoCards/DefaultInfoCard";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Billing page components
import PaymentMethod from "layouts/pages/account/billing/components/PaymentMethod";
import Invoices from "layouts/pages/account/billing/components/Invoices";
import BillingInformation from "layouts/pages/account/billing/components/BillingInformation";
import Transactions from "layouts/pages/account/billing/components/Transactions";
import AddCardModal from "layouts/pages/account/billing/components/AddCardModal";

// API
import { getSavedPaymentMethods, getTransactionHistory } from "utils/api";

function Billing() {
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [methodsResult, transactionsResult] = await Promise.all([
        getSavedPaymentMethods().catch(() => ({ success: false })),
        getTransactionHistory(20).catch(() => ({ success: false })),
      ]);

      if (methodsResult.success) {
        setPaymentMethods(methodsResult.paymentMethods || []);
      }

      if (transactionsResult.success) {
        setTransactions(transactionsResult.transactions || []);
      }
    } catch (error) {
      console.error("Failed to load payment data:", error);
      setErrorMessage("Failed to load payment information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCardSuccess = () => {
    setSuccessMessage("Payment method added successfully!");
    loadData();
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleError = (message) => {
    setErrorMessage(message);
  };

  // Get the default card for the MasterCard display
  const defaultCard = paymentMethods.find((m) => m.isDefault) || paymentMethods[0];

  // Calculate totals for info cards
  const pendingAmount = transactions
    .filter((t) => t.status === "authorized" || t.status === "pending")
    .reduce((sum, t) => sum + (t.clientAmount || t.amount || 0), 0);

  const completedAmount = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + (t.clientAmount || t.amount || 0), 0);

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
            Payments & Invoices
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Manage your payment methods and view transaction history
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

        <MDBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                <Grid item xs={12} xl={6}>
                  <MasterCard
                    number={defaultCard ? Number(`4000000000${String(defaultCard.last4).padStart(6, "0")}`) : 4000000000000000}
                    holder={defaultCard ? "Card Holder" : "No card saved"}
                    expires={defaultCard ? `${String(defaultCard.expMonth).padStart(2, "0")}/${String(defaultCard.expYear).slice(-2)}` : "--/--"}
                  />
                </Grid>
                <Grid item xs={12} md={6} xl={3}>
                  <DefaultInfoCard
                    icon="account_balance"
                    title="Pending"
                    description="Funds held for jobs"
                    value={formatCurrency(pendingAmount)}
                  />
                </Grid>
                <Grid item xs={12} md={6} xl={3}>
                  <DefaultInfoCard
                    icon="paid"
                    title="Paid"
                    description="Completed payments"
                    value={formatCurrency(completedAmount)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <PaymentMethod
                    paymentMethods={paymentMethods}
                    loading={loading}
                    onAddCard={() => setShowAddCardModal(true)}
                    onRefresh={handleRefresh}
                    onError={handleError}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Invoices />
            </Grid>
          </Grid>
        </MDBox>
        <MDBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <BillingInformation />
            </Grid>
            <Grid item xs={12} md={5}>
              <Transactions transactions={transactions} loading={loading} />
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />

      {/* Add Card Modal */}
      <AddCardModal
        open={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        onSuccess={handleAddCardSuccess}
        onError={handleError}
      />
    </DashboardLayout>
  );
}

export default Billing;
