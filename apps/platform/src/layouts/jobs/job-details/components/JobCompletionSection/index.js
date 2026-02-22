/**
 * Job Completion Section Component
 * Shows completion status and allows model/client to mark job as complete
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

// API
import { modelMarkJobComplete, clientConfirmJobComplete } from "utils/api";

function JobCompletionSection({ job, isOwner, isAwardedModel, onCompletionUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'model_complete' or 'client_confirm'

  const completion = job?.completion;
  const payment = job?.payment;
  const awardedTo = job?.awardedTo;

  const formatCurrency = (amountInCents, currency = "GBP") => {
    const symbols = { GBP: "£", EUR: "€", USD: "$" };
    const symbol = symbols[currency] || currency;
    return `${symbol}${(amountInCents / 100).toFixed(2)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleModelMarkComplete = () => {
    setConfirmAction("model_complete");
    setShowConfirmDialog(true);
  };

  const handleClientConfirm = () => {
    setConfirmAction("client_confirm");
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    setLoading(true);
    setError(null);

    try {
      if (confirmAction === "model_complete") {
        const result = await modelMarkJobComplete(job.id);
        if (!result.success) {
          throw new Error(result.message || "Failed to mark job as complete");
        }
      } else if (confirmAction === "client_confirm") {
        const result = await clientConfirmJobComplete(job.id);
        if (!result.success) {
          throw new Error(result.message || "Failed to confirm completion");
        }
      }
      setShowConfirmDialog(false);
      onCompletionUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if payment not authorized
  if (payment?.status !== "authorized" && payment?.status !== "captured") {
    return null;
  }

  const isJobCompleted = job?.status === "completed";
  const modelMarkedComplete = completion?.modelMarkedComplete;
  const clientConfirmed = completion?.clientConfirmed;

  return (
    <>
      <Card sx={{ mt: 3 }}>
        <MDBox p={3}>
          <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <MDBox display="flex" alignItems="center" gap={1}>
              <Icon color={isJobCompleted ? "success" : "info"}>assignment_turned_in</Icon>
              <MDTypography variant="h6" fontWeight="medium">
                Job Completion
              </MDTypography>
            </MDBox>
            {isJobCompleted ? (
              <Chip
                icon={<Icon fontSize="small">check_circle</Icon>}
                label="Completed"
                color="success"
                size="small"
              />
            ) : modelMarkedComplete ? (
              <Chip
                icon={<Icon fontSize="small">hourglass_empty</Icon>}
                label="Awaiting Client Confirmation"
                color="warning"
                size="small"
              />
            ) : (
              <Chip
                icon={<Icon fontSize="small">pending</Icon>}
                label="In Progress"
                color="info"
                size="small"
              />
            )}
          </MDBox>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Completion Timeline */}
          <MDBox mb={2}>
            {/* Step 1: Model marks complete */}
            <MDBox display="flex" alignItems="flex-start" mb={2}>
              <MDBox
                display="flex"
                alignItems="center"
                justifyContent="center"
                width="2rem"
                height="2rem"
                borderRadius="50%"
                bgColor={modelMarkedComplete ? "success" : "grey-300"}
                color="white"
                mr={2}
                flexShrink={0}
              >
                <Icon fontSize="small">{modelMarkedComplete ? "check" : "1"}</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="body2" fontWeight="medium">
                  Model marks job as complete
                </MDTypography>
                {modelMarkedComplete && completion?.modelMarkedAt && (
                  <MDTypography variant="caption" color="text">
                    Completed: {formatDate(completion.modelMarkedAt)}
                  </MDTypography>
                )}
              </MDBox>
            </MDBox>

            {/* Step 2: Client confirms */}
            <MDBox display="flex" alignItems="flex-start" mb={2}>
              <MDBox
                display="flex"
                alignItems="center"
                justifyContent="center"
                width="2rem"
                height="2rem"
                borderRadius="50%"
                bgColor={clientConfirmed ? "success" : "grey-300"}
                color="white"
                mr={2}
                flexShrink={0}
              >
                <Icon fontSize="small">{clientConfirmed ? "check" : "2"}</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="body2" fontWeight="medium">
                  Client confirms and releases payment
                </MDTypography>
                {clientConfirmed && completion?.clientConfirmedAt && (
                  <MDTypography variant="caption" color="text">
                    Confirmed: {formatDate(completion.clientConfirmedAt)}
                  </MDTypography>
                )}
              </MDBox>
            </MDBox>

            {/* Step 3: Funds released */}
            <MDBox display="flex" alignItems="flex-start">
              <MDBox
                display="flex"
                alignItems="center"
                justifyContent="center"
                width="2rem"
                height="2rem"
                borderRadius="50%"
                bgColor={isJobCompleted ? "success" : "grey-300"}
                color="white"
                mr={2}
                flexShrink={0}
              >
                <Icon fontSize="small">{isJobCompleted ? "check" : "3"}</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="body2" fontWeight="medium">
                  Payment released to model
                </MDTypography>
                {isJobCompleted && (
                  <MDTypography variant="caption" color="success">
                    {formatCurrency(payment?.modelAmount, payment?.currency)} released
                  </MDTypography>
                )}
              </MDBox>
            </MDBox>
          </MDBox>

          {/* Action Buttons */}
          {isAwardedModel && !modelMarkedComplete && payment?.status === "authorized" && (
            <MDButton
              variant="gradient"
              color="info"
              fullWidth
              onClick={handleModelMarkComplete}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <>
                  <Icon sx={{ mr: 1 }}>check_circle</Icon>
                  Mark Job as Complete
                </>
              )}
            </MDButton>
          )}

          {isOwner && modelMarkedComplete && !clientConfirmed && (
            <MDBox>
              <Alert severity="info" sx={{ mb: 2 }}>
                The model has marked this job as complete. Please review the work and confirm to
                release the payment.
              </Alert>
              <MDButton
                variant="gradient"
                color="success"
                fullWidth
                onClick={handleClientConfirm}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <>
                    <Icon sx={{ mr: 1 }}>verified</Icon>
                    Confirm & Release Payment
                  </>
                )}
              </MDButton>
              <MDTypography variant="caption" color="text" mt={1} display="block" textAlign="center">
                This will release {formatCurrency(payment?.modelAmount, payment?.currency)} to{" "}
                {awardedTo?.modelName}
              </MDTypography>
            </MDBox>
          )}

          {/* Auto-release warning */}
          {modelMarkedComplete && !clientConfirmed && (
            <MDBox
              mt={2}
              p={2}
              borderRadius="lg"
              bgColor="warning"
              bgGradient
            >
              <MDTypography variant="caption" color="white">
                <Icon fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }}>
                  schedule
                </Icon>
                If the client doesn't confirm within 14 days, the payment will be automatically
                released to the model.
              </MDTypography>
            </MDBox>
          )}
        </MDBox>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>
          {confirmAction === "model_complete" ? "Mark Job as Complete?" : "Confirm & Release Payment?"}
        </DialogTitle>
        <DialogContent>
          {confirmAction === "model_complete" ? (
            <MDTypography variant="body2">
              Are you sure you want to mark this job as complete? The client will be notified and
              asked to confirm the completion to release your payment.
            </MDTypography>
          ) : (
            <MDTypography variant="body2">
              Are you sure you want to confirm the job is complete? This will release{" "}
              <strong>{formatCurrency(payment?.modelAmount, payment?.currency)}</strong> to{" "}
              {awardedTo?.modelName}. This action cannot be undone.
            </MDTypography>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton
            variant="outlined"
            color="dark"
            onClick={() => setShowConfirmDialog(false)}
            disabled={loading}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color={confirmAction === "model_complete" ? "info" : "success"}
            onClick={handleConfirmAction}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : confirmAction === "model_complete" ? (
              "Mark Complete"
            ) : (
              "Confirm & Release"
            )}
          </MDButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

JobCompletionSection.defaultProps = {
  isOwner: false,
  isAwardedModel: false,
};

JobCompletionSection.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string,
    status: PropTypes.string,
    awardedTo: PropTypes.shape({
      modelId: PropTypes.string,
      modelName: PropTypes.string,
    }),
    payment: PropTypes.shape({
      status: PropTypes.string,
      modelAmount: PropTypes.number,
      currency: PropTypes.string,
    }),
    completion: PropTypes.shape({
      modelMarkedComplete: PropTypes.bool,
      modelMarkedAt: PropTypes.any,
      clientConfirmed: PropTypes.bool,
      clientConfirmedAt: PropTypes.any,
    }),
  }).isRequired,
  isOwner: PropTypes.bool,
  isAwardedModel: PropTypes.bool,
  onCompletionUpdate: PropTypes.func.isRequired,
};

export default JobCompletionSection;
