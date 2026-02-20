/**
 * BookModelModal - Modal for booking a model for a job
 *
 * Two scenarios:
 * 1. User has existing jobs - show list to select from
 * 2. User has no jobs - redirect to create new job
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Radio from "@mui/material/Radio";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Utils
import { sendJobInvitation } from "utils/invitations";

function BookModelModal({ open, onClose, model, currentUser }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's jobs when modal opens
  useEffect(() => {
    if (open && currentUser) {
      fetchUserJobs();
    }
  }, [open, currentUser]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedJobId(null);
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  const fetchUserJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user's job references from their profile
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setJobs([]);
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      const jobRefs = userData.jobs || [];

      if (jobRefs.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      // Fetch jobs by reference - batch if more than 30
      const batchSize = 30;
      const batches = [];
      for (let i = 0; i < jobRefs.length; i += batchSize) {
        batches.push(jobRefs.slice(i, i + batchSize));
      }

      const allJobs = [];
      for (const batch of batches) {
        const jobsQuery = query(collection(db, "jobs"), where("reference", "in", batch));
        const jobDocs = await getDocs(jobsQuery);

        jobDocs.forEach((docSnap) => {
          const data = docSnap.data();
          // Only include open jobs (not completed, not cancelled)
          const status = (data.status || "open").toLowerCase();
          if (status !== "completed" && status !== "cancelled") {
            allJobs.push({
              id: docSnap.id,
              ...data,
            });
          }
        });
      }

      // Sort by creation date (newest first)
      allJobs.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      // Check which jobs this model has already been invited to
      const jobsWithInviteStatus = await Promise.all(
        allJobs.map(async (job) => {
          try {
            const invitationRef = doc(db, "jobs", job.id, "invitations", model.uid);
            const invitationSnap = await getDoc(invitationRef);
            return {
              ...job,
              alreadyInvited: invitationSnap.exists(),
              invitationStatus: invitationSnap.exists() ? invitationSnap.data().status : null,
            };
          } catch (err) {
            return { ...job, alreadyInvited: false };
          }
        })
      );

      setJobs(jobsWithInviteStatus);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Failed to load your jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    // Don't allow selection if already invited
    if (job?.alreadyInvited) return;
    setSelectedJobId(jobId);
  };

  const handleSendInvitation = async () => {
    if (!selectedJobId || !model || !currentUser) return;

    setSending(true);
    setError(null);

    try {
      const selectedJob = jobs.find((j) => j.id === selectedJobId);
      if (!selectedJob) {
        throw new Error("Selected job not found");
      }

      // Send the invitation
      await sendJobInvitation(selectedJob, model, currentUser);

      setSuccess(true);

      // Update local state to reflect the invitation
      setJobs((prev) =>
        prev.map((j) =>
          j.id === selectedJobId
            ? { ...j, alreadyInvited: true, invitationStatus: "pending" }
            : j
        )
      );
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError("Failed to send invitation. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleCreateNewJob = () => {
    // Navigate to job creation with model ID as query param
    onClose();
    navigate(`/jobs/new-job?inviteModel=${model.uid}`);
  };

  const handleViewJob = () => {
    const selectedJob = jobs.find((j) => j.id === selectedJobId);
    if (selectedJob) {
      onClose();
      navigate(`/jobs/${selectedJob.reference}`);
    }
  };

  const modelName = model
    ? `${model.firstName || ""} ${model.lastName || ""}`.trim() || "Model"
    : "Model";

  const availableJobs = jobs.filter((j) => !j.alreadyInvited);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <MDBox display="flex" alignItems="center" gap={2}>
          {model?.profileAvatar && (
            <Avatar
              src={model.profileAvatar}
              alt={modelName}
              sx={{ width: 56, height: 56 }}
            />
          )}
          <MDBox>
            <MDTypography variant="h6" fontWeight="medium">
              Book {modelName}
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Select a job to invite this model to
            </MDTypography>
          </MDBox>
        </MDBox>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <MDBox display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </MDBox>
        ) : success ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 64, color: "success.main" }}>check_circle</Icon>
            <MDTypography variant="h5" fontWeight="medium" mt={2}>
              Invitation Sent!
            </MDTypography>
            <MDTypography variant="body2" color="text" mt={1}>
              {modelName} has been invited to apply for your job.
              They will receive an email and in-app notification.
            </MDTypography>
          </MDBox>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : jobs.length === 0 ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 48, color: "grey.400" }}>work_outline</Icon>
            <MDTypography variant="body1" color="text" mt={2}>
              No active jobs
            </MDTypography>
            <MDTypography variant="body2" color="text" mb={3}>
              Create a job first, then invite {modelName} to apply
            </MDTypography>
            <MDButton
              variant="gradient"
              color="info"
              onClick={handleCreateNewJob}
              startIcon={<Icon>add</Icon>}
            >
              Create New Job
            </MDButton>
          </MDBox>
        ) : (
          <>
            {availableJobs.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {modelName} has already been invited to all your active jobs.
              </Alert>
            ) : null}

            <List sx={{ pt: 0 }}>
              {jobs.map((job) => {
                const isSelected = selectedJobId === job.id;
                const isDisabled = job.alreadyInvited;

                return (
                  <ListItem key={job.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleSelectJob(job.id)}
                      disabled={isDisabled}
                      sx={{
                        opacity: isDisabled ? 0.6 : 1,
                        borderRadius: 1,
                        mb: 0.5,
                        border: isSelected ? "2px solid" : "2px solid transparent",
                        borderColor: isSelected ? "info.main" : "transparent",
                      }}
                    >
                      <ListItemIcon>
                        <Radio
                          edge="start"
                          checked={isSelected}
                          disabled={isDisabled}
                          tabIndex={-1}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <MDBox display="flex" alignItems="center" gap={1}>
                            <MDTypography variant="body2" fontWeight="medium">
                              {job.title}
                            </MDTypography>
                            {job.alreadyInvited && (
                              <Chip
                                label={
                                  job.invitationStatus === "applied"
                                    ? "Applied"
                                    : "Invited"
                                }
                                size="small"
                                color={
                                  job.invitationStatus === "applied"
                                    ? "success"
                                    : "info"
                                }
                                sx={{ height: 20, fontSize: "0.65rem" }}
                              />
                            )}
                          </MDBox>
                        }
                        secondary={
                          <MDBox component="span">
                            <MDTypography
                              variant="caption"
                              color="text"
                              component="span"
                            >
                              {job.reference} &bull; {job.city || job.country || "Remote"}
                            </MDTypography>
                          </MDBox>
                        }
                      />
                      <MDTypography variant="caption" color="text">
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleDateString()
                          : ""}
                      </MDTypography>
                    </ListItemButton>
                  </ListItem>
                );
              })}

              <Divider sx={{ my: 1 }} />

              <ListItem disablePadding>
                <ListItemButton onClick={handleCreateNewJob}>
                  <ListItemIcon>
                    <Icon color="info">add_circle</Icon>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <MDTypography variant="body2" color="info" fontWeight="medium">
                        Create New Job
                      </MDTypography>
                    }
                    secondary={
                      <MDTypography variant="caption" color="text">
                        Post a new job and invite {modelName}
                      </MDTypography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {success ? (
          <>
            <MDButton variant="outlined" color="secondary" onClick={onClose}>
              Close
            </MDButton>
            <MDButton variant="gradient" color="info" onClick={handleViewJob}>
              View Job
            </MDButton>
          </>
        ) : (
          <>
            <MDButton variant="outlined" color="secondary" onClick={onClose}>
              Cancel
            </MDButton>
            {jobs.length > 0 && availableJobs.length > 0 && (
              <MDButton
                variant="gradient"
                color="info"
                onClick={handleSendInvitation}
                disabled={!selectedJobId || sending}
              >
                {sending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Send Invitation"
                )}
              </MDButton>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

BookModelModal.defaultProps = {
  model: null,
  currentUser: null,
};

BookModelModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  model: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    profileAvatar: PropTypes.string,
    email: PropTypes.string,
  }),
  currentUser: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    companyName: PropTypes.string,
    profileAvatar: PropTypes.string,
  }),
};

export default BookModelModal;
