/**
 * Account & Billing Page (clients and account managers)
 *
 * - Membership: plan, price, when it ends or renews, any voucher, and the switch to turn billing off
 * - Upcoming payments, and every job with what is owed or paid: Pending, Require Payment, Paid
 * - Invoices (membership every 30 days, plus one per job payment, PDF download) and the billing details on them
 * - Saved cards and the transaction list
 * - Data and account controls: download my data, email preferences, pause, delete
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
import MembershipCard from "layouts/pages/account/billing/components/MembershipCard";
import UpcomingPayments from "layouts/pages/account/billing/components/UpcomingPayments";
import AccountControls from "layouts/pages/account/billing/components/AccountControls";

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
  const [membership, setMembership] = useState(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Membership first: it starts the 30-day invoice cycle for clients who pre-date it, so their first invoice is
      // in the list below. Also issue any job invoices that are missing (quick no-op otherwise).
      const [membershipResult] = await Promise.all([
        callCloudFunctionStrict("getMyMembership", {}).catch((err) => {
          console.warn("Could not load membership:", err?.message);
          return null;
        }),
        callCloudFunctionStrict("ensureMyInvoices", {}).catch(() => {}),
      ]);
      setMembership(membershipResult);

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
            Account & Billing
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Your plan, what you will pay next, your invoices, and control of your data and account
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
          <MembershipCard
            membership={membership}
            loading={loading && !membership}
            onChanged={(text) => {
              setSuccessMessage(text);
              loadData();
            }}
            onError={setErrorMessage}
          />
        </MDBox>

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
          <UpcomingPayments membership={membership} jobs={jobs} loading={loading} />
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

        <MDBox mb={3}>
          <AccountControls
            paused={membership?.accountStatus === "paused" || user?.accountStatus === "paused"}
            onError={setErrorMessage}
            onMessage={setSuccessMessage}
          />
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
