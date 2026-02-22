/**
 * Job Payment Section Component
 * Shows payment status and allows client to pay for awarded job
 */

import { useState, useEffect } from "react";
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
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";

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

// Payment Form Component (for new card)
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
        // Payment authorised successfully - confirm with backend
        const result = await confirmJobPaymentAuthorized(jobId, paymentIntent.id);
        if (result.success) {
          onSuccess();
        } else {
          onError("Payment authorised but confirmation failed. Please contact support.");
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

// Saved Card Payment Form
function SavedCardPaymentForm({ jobId, paymentMethodId, onSuccess, onError, onCancel }) {
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);

    try {
      // Create and confirm payment intent with saved card
      const result = await createJobPaymentIntent(jobId, paymentMethodId);

      if (result.success) {
        if (result.status === "requires_capture") {
          // Payment authorised - confirm with backend
          const confirmResult = await confirmJobPaymentAuthorized(jobId, result.paymentIntentId);
          if (confirmResult.success) {
            onSuccess();
          } else {
            onError("Payment authorised but confirmation failed. Please contact support.");
          }
        } else if (result.requiresAction) {
          // Need 3D Secure - fall back to regular flow
          onError("This card requires additional verification. Please use the new card form below.");
        } else {
          onError(`Unexpected payment status: ${result.status}`);
        }
      } else {
        throw new Error(result.message || "Payment failed");
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <MDBox display="flex" justifyContent="flex-end" gap={1}>
        <MDButton variant="outlined" color="dark" onClick={onCancel} disabled={processing}>
          Cancel
        </MDButton>
        <MDButton
          type="submit"
          variant="gradient"
          color="success"
          disabled={processing}
        >
          {processing ? <CircularProgress size={20} color="inherit" /> : "Pay & Hold Funds"}
        </MDButton>
      </MDBox>
    </form>
  );
}

SavedCardPaymentForm.propTypes = {
  jobId: PropTypes.string.isRequired,
  paymentMethodId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// Main Component
function JobPaymentSection({ job, isOwner, onPaymentComplete }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("new");
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paymentStatus = job?.payment?.status;
  const awardedTo = job?.awardedTo;

  const formatCurrency = (amountInCents, currency = "GBP") => {
    const symbols = { GBP: "£", EUR: "€", USD: "$" };
    const symbol = symbols[currency] || currency;
    return `${symbol}${(amountInCents / 100).toFixed(2)}`;
  };

  // Fetch saved cards when modal opens
  useEffect(() => {
    if (showPaymentModal) {
      fetchSavedCards();
    }
  }, [showPaymentModal]);

  const fetchSavedCards = async () => {
    setLoadingSavedCards(true);
    try {
      const result = await getSavedPaymentMethods();
      if (result.success && result.paymentMethods?.length > 0) {
        setSavedCards(result.paymentMethods);
        // Auto-select the first saved card
        setSelectedPaymentMethod(result.paymentMethods[0].id);
      } else {
        setSavedCards([]);
        setSelectedPaymentMethod("new");
        // No saved cards, initialize new card payment
        await initializeNewCardPayment();
      }
    } catch (err) {
      console.error("Failed to fetch saved cards:", err);
      setSavedCards([]);
      setSelectedPaymentMethod("new");
      // Initialize new card payment on error
      await initializeNewCardPayment();
    } finally {
      setLoadingSavedCards(false);
    }
  };

  const handleOpenPayment = async () => {
    setLoading(true);
    setError(null);
    setSelectedPaymentMethod("loading"); // Will be set after fetching saved cards
    setSavedCards([]);
    setClientSecret(null);

    try {
      // Just open the modal - don't create payment intent yet
      // We'll create it when the user selects a payment method
      setShowPaymentModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create payment intent for new card when needed
  const initializeNewCardPayment = async () => {
    if (clientSecret) return; // Already have one

    try {
      const result = await createJobPaymentIntent(job.id);
      if (result.success && result.clientSecret) {
        setClientSecret(result.clientSecret);
      } else {
        throw new Error(result.message || "Failed to initialise payment");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle payment method selection change
  const handlePaymentMethodChange = async (value) => {
    setSelectedPaymentMethod(value);
    setError(null);

    // If selecting new card, initialize payment intent
    if (value === "new") {
      await initializeNewCardPayment();
    }
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setClientSecret(null);
    setSavedCards([]);
    setSelectedPaymentMethod("new");
    setError(null);
  };

  const handlePaymentSuccess = () => {
    handleCloseModal();
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

  const getCardIcon = (brand) => {
    const brandIcons = {
      visa: "💳",
      mastercard: "💳",
      amex: "💳",
      discover: "💳",
      default: "💳",
    };
    return brandIcons[brand?.toLowerCase()] || brandIcons.default;
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
        onClose={handleCloseModal}
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

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {loadingSavedCards ? (
              <MDBox display="flex" justifyContent="center" py={3}>
                <CircularProgress size={30} />
              </MDBox>
            ) : (
              <>
                {/* Saved Cards Selection */}
                {savedCards.length > 0 && (
                  <MDBox mb={3}>
                    <MDTypography variant="button" fontWeight="medium" mb={1} display="block">
                      Select Payment Method
                    </MDTypography>
                    <RadioGroup
                      value={selectedPaymentMethod}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    >
                      {savedCards.map((card) => (
                        <FormControlLabel
                          key={card.id}
                          value={card.id}
                          control={<Radio />}
                          label={
                            <MDBox display="flex" alignItems="center" gap={1}>
                              <span>{getCardIcon(card.brand)}</span>
                              <MDTypography variant="button">
                                {card.brand?.toUpperCase()} •••• {card.last4}
                              </MDTypography>
                              <MDTypography variant="caption" color="text">
                                Expires {card.expMonth}/{card.expYear}
                              </MDTypography>
                            </MDBox>
                          }
                          sx={{
                            border: "1px solid",
                            borderColor: selectedPaymentMethod === card.id ? "info.main" : "grey.300",
                            borderRadius: 1,
                            p: 1,
                            mb: 1,
                            mr: 0,
                            width: "100%",
                            backgroundColor: selectedPaymentMethod === card.id ? "action.hover" : "transparent",
                          }}
                        />
                      ))}
                      <FormControlLabel
                        value="new"
                        control={<Radio />}
                        label={
                          <MDBox display="flex" alignItems="center" gap={1}>
                            <Icon>add_card</Icon>
                            <MDTypography variant="button">
                              Add new card
                            </MDTypography>
                          </MDBox>
                        }
                        sx={{
                          border: "1px solid",
                          borderColor: selectedPaymentMethod === "new" ? "info.main" : "grey.300",
                          borderRadius: 1,
                          p: 1,
                          mr: 0,
                          width: "100%",
                          backgroundColor: selectedPaymentMethod === "new" ? "action.hover" : "transparent",
                        }}
                      />
                    </RadioGroup>
                  </MDBox>
                )}

                {/* Show saved card payment form or new card form */}
                {selectedPaymentMethod !== "new" && savedCards.length > 0 ? (
                  <SavedCardPaymentForm
                    jobId={job.id}
                    paymentMethodId={selectedPaymentMethod}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onCancel={handleCloseModal}
                  />
                ) : clientSecret ? (
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
                      onCancel={handleCloseModal}
                    />
                  </Elements>
                ) : (
                  <MDBox display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={30} />
                  </MDBox>
                )}
              </>
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
