/**
 * ChangeEmailDialog - Dialog for changing a user's email address (Admin only)
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 480,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

function ChangeEmailDialog({
  open,
  onClose,
  onConfirm,
  user,
  loading,
  error,
}) {
  const [newEmail, setNewEmail] = useState("");
  const [validationError, setValidationError] = useState("");

  // Reset state when user changes or dialog opens
  useEffect(() => {
    if (open && user) {
      setNewEmail(user.email || "");
      setValidationError("");
    }
  }, [open, user]);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate and submit
  const handleSubmit = () => {
    if (!newEmail) {
      setValidationError("Email is required");
      return;
    }
    if (!isValidEmail(newEmail)) {
      setValidationError("Please enter a valid email address");
      return;
    }
    if (newEmail === user?.email) {
      setValidationError("New email is the same as current email");
      return;
    }
    setValidationError("");
    onConfirm(newEmail);
  };

  if (!user) return null;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || "Unknown User";
  const currentEmail = user.email || "No email";

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box sx={modalStyle}>
        {/* Header */}
        <MDBox display="flex" alignItems="center" mb={3}>
          <Icon sx={{ color: "#1976d2", fontSize: 28, mr: 1 }}>email</Icon>
          <MDTypography variant="h5">
            Change Email Address
          </MDTypography>
        </MDBox>

        {/* User info */}
        <MDBox mb={3}>
          <MDTypography variant="body2" color="text">
            Changing email for:
          </MDTypography>
          <MDTypography variant="h6" fontWeight="medium">
            {fullName}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Current: {currentEmail}
          </MDTypography>
        </MDBox>

        {/* Info alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          This will update the email in both Firebase Authentication and Firestore.
        </Alert>

        {/* Email field */}
        <MDBox mb={3}>
          <TextField
            fullWidth
            label="New Email Address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={loading}
            placeholder="user@example.com"
          />
        </MDBox>

        {/* Validation error */}
        {validationError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}

        {/* API error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Action buttons */}
        <MDBox display="flex" justifyContent="flex-end" gap={2}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Icon>save</Icon>
              )
            }
          >
            {loading ? "Updating..." : "Update Email"}
          </MDButton>
        </MDBox>
      </Box>
    </Modal>
  );
}

ChangeEmailDialog.defaultProps = {
  user: null,
  loading: false,
  error: null,
};

ChangeEmailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  user: PropTypes.shape({
    uid: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default ChangeEmailDialog;
