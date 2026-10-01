/**
 * Payments & Invoices Page (clients and account managers)
 *
 * - Every job with what is owed or paid: Pending (not booked yet), Require Payment (booked, unpaid), Paid
 * - Invoices (one per payment, PDF download) and the billing details that appear on them
 * - Saved cards and the transaction list
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "config/firebase";

// @mui material components
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import DefaultInfoCard from "examples/Cards/InfoCards/DefaultInfoCard";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Context
import { useAuth } from "context/AuthContext";

// Billing page components
import PaymentMethod from "layouts/pages/account/billing/components/PaymentMethod";
import Transactions from "layouts/pages/account/billing/components/Transactions";
import AddCardModal from "layouts/pages/account/billing/components/AddCardModal";
import JobPayments, { formatMoney } from "layouts/pages/account/billing/components/JobPayments";
import InvoicesList from "layouts/pages/account/billing/components/InvoicesList";
import BillingDetails from "layouts/pages/account/billing/components/BillingDetails";

// API / helpers
import { getSavedPaymentMethods, getTransactionHistory, callCloudFunctionStrict } from "utils/api";
import { clientPaymentState, isPaymentHeld } from "utils/paymentStatus";

/** Run the same query by owner and by organisation (account managers), merging results by id. */
const fetchOwned = async (collectionName, ownerField, uid, organisationId) => {
  const queries = [query(collection(db, collectionName), where(ownerField, "==", uid))];
  if (organisationId) queries.push(query(collection(db, collectionName), where("organisationId", "==", organisationId)));

  const merged = new Map();
  const results = await Promise.allSettled(queries.map((q) => getDocs(q)));
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      result.value.docs.forEach((d) => merged.set(d.id, { id: d.id, ...d.data() }));
    } else {
      console.warn(`${collectionName} query failed:`, result.reason?.message);
    }
  });
  return [...merged.values()];
};

// Firestore Timestamps to epoch milliseconds
const toMillis = (value) => (value?.toMillis ? value.toMillis() : value ? new Date(value).getTime() : null);

function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Issue any invoices that are missing for payments made before invoices existed (quick no-op otherwise)
      await callCloudFunctionStrict("ensureMyInvoices", {}).catch(() => {});

      const [methodsResult, transactionsResult, jobDocs, invoiceDocs] = await Promise.all([
        getSavedPaymentMethods().catch(() => ({ success: false })),
        getTransactionHistory(50).catch(() => ({ success: false })),
        fetchOwned("jobs", "userId", user.uid, user.organisationId),
        fetchOwned("invoices", "clientId", user.uid, user.organisationId),
      ]);

      if (methodsResult.success) setPaymentMethods(methodsResult.paymentMethods || []);
      if (transactionsResult.success) setTransactions(transactionsResult.transactions || []);
      setJobs(jobDocs);
      setInvoices(
        invoiceDocs
          .map((inv) => ({ ...inv, issuedAt: toMillis(inv.issuedAt) }))
          .sort((a, b) => (b.issuedAt || 0) - (a.issuedAt || 0))
      );
    } catch (error) {
      console.error("Failed to load payment data:", error);
      setErrorMessage("Failed to load payment information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.organisationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Summary numbers come from the jobs themselves, so they always agree with the list below
  const summary = useMemo(() => {
    const s = { dueCount: 0, dueTotal: 0, paidCount: 0, paidTotal: 0, heldCount: 0, pendingCount: 0, currency: "GBP" };
    jobs.forEach((job) => {
      const state = clientPaymentState(job);
      const amount = job.payment?.clientAmount || 0;
      if (state === "require_payment") {
        s.dueCount += 1;
        s.dueTotal += amount;
      } else if (state === "paid") {
        s.paidCount += 1;
        s.paidTotal += amount - (job.payment?.refundedAmount || 0);
        if (isPaymentHeld(job.payment?.status)) s.heldCount += 1;
      } else if (state === "pending" && job.status !== "closed") {
        s.pendingCount += 1;
      }
    });
    return s;
  }, [jobs]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mt={4} mb={3}>
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Payments & Invoices
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Pay for your bookings, see what has been paid, and download your invoices
          </MDTypography>
        </MDBox>

        {successMessage && (
          <MDBox mb={3}>
            <Alert severity="success" onClose={() => setSuccessMessage("")}>{successMessage}</Alert>
          </MDBox>
        )}
        {errorMessage && (
          <MDBox mb={3}>
            <Alert severity="error" onClose={() => setErrorMessage("")}>{errorMessage}</Alert>
          </MDBox>
        )}

        <MDBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <DefaultInfoCard
                icon="priority_high"
                title="Require Payment"
                description={`${summary.dueCount} ${summary.dueCount === 1 ? "job" : "jobs"} booked and waiting for payment`}
                value={formatMoney(summary.dueTotal, summary.currency)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DefaultInfoCard
                icon="paid"
                title="Paid"
                description={`${summary.paidCount} ${summary.paidCount === 1 ? "payment" : "payments"}${summary.heldCount ? `, ${summary.heldCount} held until the job is complete` : ""}`}
                value={formatMoney(summary.paidTotal, summary.currency)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DefaultInfoCard
                icon="schedule"
                title="Pending"
                description="Open jobs not booked with a model yet"
                value={String(summary.pendingCount)}
              />
            </Grid>
          </Grid>
        </MDBox>

        <MDBox mb={3}>
          <JobPayments jobs={jobs} loading={loading} />
        </MDBox>

        <MDBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <InvoicesList invoices={invoices} loading={loading} onError={setErrorMessage} />
            </Grid>
            <Grid item xs={12} lg={4}>
              <BillingDetails uid={user?.uid} />
            </Grid>
          </Grid>
        </MDBox>

        <MDBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <PaymentMethod
                paymentMethods={paymentMethods}
                loading={loading}
                onAddCard={() => setShowAddCardModal(true)}
                onRefresh={loadData}
                onError={setErrorMessage}
              />
            </Grid>
            <Grid item xs={12} lg={5}>
              <Transactions transactions={transactions} loading={loading} />
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />

      <AddCardModal
        open={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        onSuccess={() => {
          setSuccessMessage("Payment method added successfully!");
          loadData();
        }}
        onError={setErrorMessage}
      />
    </DashboardLayout>
  );
}

export default Billing;
