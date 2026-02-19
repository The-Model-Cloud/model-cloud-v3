/**
 * Add Card Modal Component
 * Uses Stripe Elements to securely add a new payment method
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";

// @mui material components
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// API
import { createSetupIntent } from "utils/api";

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Card Element styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#344767",
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#f44336",
      iconColor: "#f44336",
    },
  },
  hidePostalCode: false,
};

// Inner form component that uses Stripe hooks
function CardForm({ clientSecret, onSuccess, onCancel, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setCardError(null);

    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (error) {
        setCardError(error.message);
        onError(error.message);
      } else if (setupIntent.status === "succeeded") {
        onSuccess();
      } else {
        setCardError("Card setup did not complete. Please try again.");
      }
    } catch (err) {
      setCardError("An error occurred. Please try again.");
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCardChange = (event) => {
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <MDBox mb={3}>
        <MDTypography variant="body2" color="text" mb={1}>
          Card Details
        </MDTypography>
        <MDBox
          p={2}
          borderRadius="lg"
          border="1px solid"
          borderColor={cardError ? "error.main" : "grey.300"}
          bgColor="white"
        >
          <CardElement options={CARD_ELEMENT_OPTIONS} onChange={handleCardChange} />
        </MDBox>
        {cardError && (
          <MDTypography variant="caption" color="error" mt={0.5}>
            {cardError}
          </MDTypography>
        )}
      </MDBox>

      <MDBox display="flex" justifyContent="flex-end" gap={1}>
        <MDButton
          variant="outlined"
          color="dark"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </MDButton>
        <MDButton
          type="submit"
          variant="gradient"
          color="dark"
          disabled={!stripe || processing}
        >
          {processing ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <>
              <Icon sx={{ mr: 0.5 }}>check</Icon>
              Save Card
            </>
          )}
        </MDButton>
      </MDBox>
    </form>
  );
}

CardForm.propTypes = {
  clientSecret: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

// Main AddCardModal component
function AddCardModal({ open, onClose, onSuccess, onError }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      initializeSetupIntent();
    } else {
      // Reset state when modal closes
      setClientSecret(null);
      setLoading(true);
      setError(null);
    }
  }, [open]);

  const initializeSetupIntent = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createSetupIntent();
      if (result.success && result.clientSecret) {
        setClientSecret(result.clientSecret);
      } else {
        throw new Error("Failed to initialize payment setup");
      }
    } catch (err) {
      console.error("Failed to create setup intent:", err);
      setError("Failed to initialize payment form. Please try again.");
      if (onError) onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <MDBox display="flex" alignItems="center" gap={1}>
          <Icon color="info">add_card</Icon>
          Add Payment Method
        </MDBox>
      </DialogTitle>
      <DialogContent>
        <MDBox py={2}>
          {loading && (
            <MDBox textAlign="center" py={4}>
              <CircularProgress />
              <MDTypography variant="body2" color="text" mt={2}>
                Initializing secure payment form...
              </MDTypography>
            </MDBox>
          )}

          {!loading && error && (
            <MDBox textAlign="center" py={4}>
              <Icon fontSize="large" color="error">
                error
              </Icon>
              <MDTypography variant="body2" color="error" mt={2}>
                {error}
              </MDTypography>
              <MDBox mt={2}>
                <MDButton variant="outlined" color="dark" onClick={onClose}>
                  Close
                </MDButton>
              </MDBox>
            </MDBox>
          )}

          {!loading && !error && clientSecret && (
            <>
              <MDBox
                p={2}
                borderRadius="lg"
                bgColor="info"
                bgGradient
                mb={3}
              >
                <MDBox display="flex" alignItems="center">
                  <Icon fontSize="small" sx={{ color: "white", mr: 1 }}>
                    security
                  </Icon>
                  <MDTypography variant="caption" color="white">
                    Your card details are securely processed by Stripe and never stored on our servers.
                  </MDTypography>
                </MDBox>
              </MDBox>

              <Elements stripe={stripePromise}>
                <CardForm
                  clientSecret={clientSecret}
                  onSuccess={handleSuccess}
                  onCancel={onClose}
                  onError={onError}
                />
              </Elements>
            </>
          )}
        </MDBox>
      </DialogContent>
    </Dialog>
  );
}

AddCardModal.defaultProps = {
  onError: null,
};

AddCardModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func,
};

export default AddCardModal;
