/**
 * Job Payment Section Component
 * Shows payment status and allows client to pay for awarded job
 */

import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// API
import {
  createJobPaymentIntent,
  confirmJobPaymentAuthorized,
  getSavedPaymentMethods,
} from "utils/api";

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Payment Form Component
function PaymentForm({ jobId, clientSecret, onSuccess, onError, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/jobs/${jobId}?payment=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message);
        setProcessing(false);
      } else if (paymentIntent.status === "requires_capture") {
        // Payment authorized successfully - confirm with backend
        const result = await confirmJobPaymentAuthorized(jobId, paymentIntent.id);
        if (result.success) {
          onSuccess();
        } else {
          onError("Payment authorized but confirmation failed. Please contact support.");
        }
        setProcessing(false);
      } else {
        onError(`Unexpected payment status: ${paymentIntent.status}`);
        setProcessing(false);
      }
    } catch (err) {
      onError(err.message);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <MDBox mb={3}>
        <PaymentElement />
      </MDBox>
      <MDBox display="flex" justifyContent="flex-end" gap={1}>
        <MDButton variant="outlined" color="dark" onClick={onCancel} disabled={processing}>
          Cancel
        </MDButton>
        <MDButton
          type="submit"
          variant="gradient"
          color="success"
          disabled={!stripe || processing}
        >
          {processing ? <CircularProgress size={20} color="inherit" /> : "Pay & Hold Funds"}
        </MDButton>
      </MDBox>
    </form>
  );
}

PaymentForm.propTypes = {
  jobId: PropTypes.string.isRequired,
  clientSecret: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// Main Component
function JobPaymentSection({ job, isOwner, onPaymentComplete }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paymentStatus = job?.payment?.status;
  const awardedTo = job?.awardedTo;

  const formatCurrency = (amountInCents, currency = "GBP") => {
    const symbols = { GBP: "£", EUR: "€", USD: "$" };
    const symbol = symbols[currency] || currency;
    return `${symbol}${(amountInCents / 100).toFixed(2)}`;
  };

  const handleOpenPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await createJobPaymentIntent(job.id);
      if (result.success && result.clientSecret) {
        setClientSecret(result.clientSecret);
        setShowPaymentModal(true);
      } else {
        throw new Error(result.message || "Failed to initialize payment");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setClientSecret(null);
    onPaymentComplete();
  };

  const handlePaymentError = (message) => {
    setError(message);
  };

  const getStatusChip = () => {
    const statusConfig = {
      pending: { color: "warning", label: "Payment Pending", icon: "schedule" },
      authorized: { color: "info", label: "Funds Held", icon: "lock" },
      captured: { color: "success", label: "Payment Complete", icon: "check_circle" },
      cancelled: { color: "error", label: "Payment Cancelled", icon: "cancel" },
      failed: { color: "error", label: "Payment Failed", icon: "error" },
    };

    const config = statusConfig[paymentStatus] || statusConfig.pending;

    return (
      <Chip
        icon={<Icon fontSize="small">{config.icon}</Icon>}
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  // Don't show if job not awarded
  if (!awardedTo) return null;

  return (
    <>
      <Card sx={{ mt: 3 }}>
        <MDBox p={3}>
          <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <MDBox display="flex" alignItems="center" gap={1}>
              <Icon color="primary">payment</Icon>
              <MDTypography variant="h6" fontWeight="medium">
                Payment
              </MDTypography>
            </MDBox>
            {getStatusChip()}
          </MDBox>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Payment Details */}
          <MDBox
            p={2}
            borderRadius="lg"
            bgColor="grey-100"
            mb={2}
          >
            <MDBox display="flex" justifyContent="space-between" mb={1}>
              <MDTypography variant="body2" color="text">
                Awarded to
              </MDTypography>
              <MDTypography variant="body2" fontWeight="medium">
                {awardedTo.modelName}
              </MDTypography>
            </MDBox>
            <MDBox display="flex" justifyContent="space-between" mb={1}>
              <MDTypography variant="body2" color="text">
                Agreed Amount
              </MDTypography>
              <MDTypography variant="body2" fontWeight="medium">
                {formatCurrency(awardedTo.agreedAmount, awardedTo.agreedCurrency)}
              </MDTypography>
            </MDBox>
            <MDBox display="flex" justifyContent="space-between" mb={1}>
              <MDTypography variant="body2" color="text">
                Platform Fee (5%)
              </MDTypography>
              <MDTypography variant="body2" fontWeight="medium">
                {formatCurrency(job.payment?.platformFee, job.payment?.currency)}
              </MDTypography>
            </MDBox>
            <MDBox
              display="flex"
              justifyContent="space-between"
              pt={1}
              borderTop="1px solid"
              borderColor="grey-300"
            >
              <MDTypography variant="body2" fontWeight="bold">
                Total
              </MDTypography>
              <MDTypography variant="body2" fontWeight="bold" color="primary">
                {formatCurrency(job.payment?.clientAmount, job.payment?.currency)}
              </MDTypography>
            </MDBox>
          </MDBox>

          {/* Action Button */}
          {isOwner && paymentStatus === "pending" && (
            <MDButton
              variant="gradient"
              color="success"
              fullWidth
              onClick={handleOpenPayment}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <>
                  <Icon sx={{ mr: 1 }}>lock</Icon>
                  Pay & Hold Funds
                </>
              )}
            </MDButton>
          )}

          {paymentStatus === "authorized" && (
            <MDBox
              p={2}
              borderRadius="lg"
              bgColor="info"
              bgGradient
            >
              <MDTypography variant="body2" color="white">
                <Icon fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }}>
                  lock
                </Icon>
                Funds are securely held and will be released when you confirm job completion.
              </MDTypography>
            </MDBox>
          )}

          {paymentStatus === "captured" && (
            <MDBox
              p={2}
              borderRadius="lg"
              bgColor="success"
              bgGradient
            >
              <MDTypography variant="body2" color="white">
                <Icon fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }}>
                  check_circle
                </Icon>
                Payment has been released to the model.
              </MDTypography>
            </MDBox>
          )}
        </MDBox>
      </Card>

      {/* Payment Modal */}
      <Dialog
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="success">payment</Icon>
            Pay for Job
          </MDBox>
        </DialogTitle>
        <DialogContent>
          <MDBox py={2}>
            <MDTypography variant="body2" color="text" mb={2}>
              You are about to pay{" "}
              <strong>{formatCurrency(job.payment?.clientAmount, job.payment?.currency)}</strong>{" "}
              for this job. The funds will be held securely until you confirm job completion.
            </MDTypography>

            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#1A73E8",
                    },
                  },
                }}
              >
                <PaymentForm
                  jobId={job.id}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={() => setShowPaymentModal(false)}
                />
              </Elements>
            )}
          </MDBox>
        </DialogContent>
      </Dialog>
    </>
  );
}

JobPaymentSection.defaultProps = {
  isOwner: false,
};

JobPaymentSection.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string,
    awardedTo: PropTypes.shape({
      modelId: PropTypes.string,
      modelName: PropTypes.string,
      agreedAmount: PropTypes.number,
      agreedCurrency: PropTypes.string,
    }),
    payment: PropTypes.shape({
      status: PropTypes.string,
      clientAmount: PropTypes.number,
      modelAmount: PropTypes.number,
      platformFee: PropTypes.number,
      currency: PropTypes.string,
    }),
  }).isRequired,
  isOwner: PropTypes.bool,
  onPaymentComplete: PropTypes.func.isRequired,
};

export default JobPaymentSection;
