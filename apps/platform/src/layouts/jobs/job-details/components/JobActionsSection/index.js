/**
 * JobActionsSection - Actions for job owner
 * - Close job (stop accepting applications)
 * - Cancel awarded booking (before payment)
 */

import { useState } from "react";
import PropTypes from "prop-types";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Notifications
import { createNotification } from "utils/notifications";

function JobActionsSection({ job, isOwner, isAdmin, onActionComplete }) {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [cancelAwardDialogOpen, setCancelAwardDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Only show for job owner or admin
  if (!isOwner && !isAdmin) return null;

  const jobStatus = (job.status || "open").toLowerCase();
  const isAwarded = !!job.awardedTo;
  const isPaid = job.payment?.status === "authorized" || job.payment?.status === "captured";
  const isCompleted = job.completion?.status === "completed";

  // Handle closing a job
  const handleCloseJob = async () => {
    setProcessing(true);
    setError(null);

    try {
      const jobRef = doc(db, "jobs", job.id);
      await updateDoc(jobRef, {
        status: "closed",
        closedAt: new Date().toISOString(),
      });

      setCloseDialogOpen(false);
      onActionComplete?.();
    } catch (err) {
      console.error("Error closing job:", err);
      setError("Failed to close job. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Handle reopening a job
  const handleReopenJob = async () => {
    setProcessing(true);
    setError(null);

    try {
      const jobRef = doc(db, "jobs", job.id);
      await updateDoc(jobRef, {
        status: "open",
        closedAt: deleteField(),
      });

      setReopenDialogOpen(false);
      onActionComplete?.();
    } catch (err) {
      console.error("Error reopening job:", err);
      setError("Failed to reopen job. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Handle cancelling an award (before payment)
  const handleCancelAward = async () => {
    setProcessing(true);
    setError(null);

    try {
      const jobRef = doc(db, "jobs", job.id);

      // Store who was awarded for notification
      const awardedModelId = job.awardedTo.modelId;
      const awardedModelName = job.awardedTo.modelName;

      // Remove the award
      await updateDoc(jobRef, {
        awardedTo: deleteField(),
        awardCancelledAt: new Date().toISOString(),
        status: "open", // Reopen for new applications
      });

      // Notify the model that the award was cancelled
      await createNotification(
        awardedModelId,
        "job_award_cancelled",
        "Job Award Cancelled",
        `The booking for "${job.title}" has been cancelled by the client.`,
        {
          jobId: job.id,
          jobReference: job.reference,
          jobTitle: job.title,
          link: `/jobs/${job.reference}`,
        }
      ).catch(err => console.warn("Notification failed:", err));

      setCancelAwardDialogOpen(false);
      onActionComplete?.();
    } catch (err) {
      console.error("Error cancelling award:", err);
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" gap={1} mb={2}>
          <Icon sx={{ color: "grey.600" }}>settings</Icon>
          <MDTypography variant="h6" fontWeight="medium">
            Job Actions
          </MDTypography>
        </MDBox>

        <MDBox display="flex" flexDirection="column" gap={2}>
          {/* Close/Reopen Job - only show if not awarded or completed */}
          {!isAwarded && !isCompleted && (
            <>
              {jobStatus === "open" ? (
                <MDBox
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  p={2}
                  borderRadius="lg"
                  sx={{ backgroundColor: "grey.100" }}
                >
                  <MDBox>
                    <MDTypography variant="body2" fontWeight="medium">
                      Close Job Posting
                    </MDTypography>
                    <MDTypography variant="caption" color="text">
                      Stop accepting new applications
                    </MDTypography>
                  </MDBox>
                  <MDButton
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => setCloseDialogOpen(true)}
                    startIcon={<Icon>lock</Icon>}
                  >
                    Close Job
                  </MDButton>
                </MDBox>
              ) : jobStatus === "closed" ? (
                <MDBox
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  p={2}
                  borderRadius="lg"
                  sx={{ backgroundColor: "warning.lighter" }}
                >
                  <MDBox>
                    <MDTypography variant="body2" fontWeight="medium" color="warning">
                      Job is Closed
                    </MDTypography>
                    <MDTypography variant="caption" color="text">
                      Not accepting new applications
                    </MDTypography>
                  </MDBox>
                  <MDButton
                    variant="outlined"
                    color="success"
                    size="small"
                    onClick={() => setReopenDialogOpen(true)}
                    startIcon={<Icon>lock_open</Icon>}
                  >
                    Reopen Job
                  </MDButton>
                </MDBox>
              ) : null}
            </>
          )}

          {/* Cancel Award - only show if awarded but NOT paid */}
          {isAwarded && !isPaid && !isCompleted && (
            <MDBox
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              p={2}
              borderRadius="lg"
              sx={{ backgroundColor: "grey.100" }}
            >
              <MDBox>
                <MDTypography variant="body2" fontWeight="medium">
                  Cancel Booking
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Un-award this job and reopen for applications
                </MDTypography>
              </MDBox>
              <MDButton
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setCancelAwardDialogOpen(true)}
                startIcon={<Icon>person_remove</Icon>}
              >
                Cancel Award
              </MDButton>
            </MDBox>
          )}

          {/* Info message if job is paid */}
          {isAwarded && isPaid && !isCompleted && (
            <Alert severity="info" icon={<Icon>info</Icon>}>
              <MDTypography variant="body2">
                Payment has been authorised. Contact support if you need to cancel this booking.
              </MDTypography>
            </Alert>
          )}

          {/* Info message if job is completed */}
          {isCompleted && (
            <Alert severity="success" icon={<Icon>check_circle</Icon>}>
              <MDTypography variant="body2">
                This job has been completed and payment released.
              </MDTypography>
            </Alert>
          )}
        </MDBox>
      </MDBox>

      {/* Close Job Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="warning">lock</Icon>
            <MDTypography variant="h6">Close Job Posting?</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <MDTypography variant="body2" mb={2}>
            Closing this job will:
          </MDTypography>
          <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
            <MDTypography component="li" variant="body2">
              Stop the job from appearing in search results
            </MDTypography>
            <MDTypography component="li" variant="body2">
              Prevent new models from applying
            </MDTypography>
            <MDTypography component="li" variant="body2">
              Keep existing applications visible
            </MDTypography>
          </MDBox>
          <MDTypography variant="body2" color="text">
            You can reopen the job at any time.
          </MDTypography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setCloseDialogOpen(false)}
            disabled={processing}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="warning"
            onClick={handleCloseJob}
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} color="inherit" /> : "Close Job"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Reopen Job Dialog */}
      <Dialog open={reopenDialogOpen} onClose={() => setReopenDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="success">lock_open</Icon>
            <MDTypography variant="h6">Reopen Job Posting?</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <MDTypography variant="body2">
            Reopening this job will allow new models to apply and make it visible in search results again.
          </MDTypography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setReopenDialogOpen(false)}
            disabled={processing}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="success"
            onClick={handleReopenJob}
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} color="inherit" /> : "Reopen Job"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Cancel Award Dialog */}
      <Dialog open={cancelAwardDialogOpen} onClose={() => setCancelAwardDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="error">person_remove</Icon>
            <MDTypography variant="h6">Cancel Booking?</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <MDTypography variant="body2" mb={2}>
            You are about to cancel the booking with <strong>{job.awardedTo?.modelName}</strong>.
          </MDTypography>
          <MDTypography variant="body2" mb={2}>
            This will:
          </MDTypography>
          <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
            <MDTypography component="li" variant="body2">
              Remove the model from this job
            </MDTypography>
            <MDTypography component="li" variant="body2">
              Notify the model of the cancellation
            </MDTypography>
            <MDTypography component="li" variant="body2">
              Reopen the job for new applications
            </MDTypography>
          </MDBox>
          <Alert severity="warning">
            <MDTypography variant="caption">
              If you've already communicated with the model about this booking, please message them to explain the cancellation.
            </MDTypography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setCancelAwardDialogOpen(false)}
            disabled={processing}
          >
            Keep Booking
          </MDButton>
          <MDButton
            variant="gradient"
            color="error"
            onClick={handleCancelAward}
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} color="inherit" /> : "Cancel Booking"}
          </MDButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

JobActionsSection.defaultProps = {
  isOwner: false,
  isAdmin: false,
  onActionComplete: null,
};

JobActionsSection.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    reference: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.string,
    awardedTo: PropTypes.shape({
      modelId: PropTypes.string,
      modelName: PropTypes.string,
    }),
    payment: PropTypes.shape({
      status: PropTypes.string,
    }),
    completion: PropTypes.shape({
      status: PropTypes.string,
    }),
  }).isRequired,
  isOwner: PropTypes.bool,
  isAdmin: PropTypes.bool,
  onActionComplete: PropTypes.func,
};

export default JobActionsSection;
