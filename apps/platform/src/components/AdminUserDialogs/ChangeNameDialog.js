/**
 * ChangeNameDialog - Dialog for changing a user's name (Admin only)
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

function ChangeNameDialog({
  open,
  onClose,
  onConfirm,
  user,
  loading,
  error,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [validationError, setValidationError] = useState("");

  // Reset state when user changes or dialog opens
  useEffect(() => {
    if (open && user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setValidationError("");
    }
  }, [open, user]);

  // Validate and submit
  const handleSubmit = () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst && !trimmedLast) {
      setValidationError("At least first name or last name is required");
      return;
    }

    // Check if name has actually changed
    if (trimmedFirst === (user?.firstName || "") && trimmedLast === (user?.lastName || "")) {
      setValidationError("Name is the same as current name");
      return;
    }

    setValidationError("");
    onConfirm(trimmedFirst, trimmedLast);
  };

  if (!user) return null;

  const currentName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "No name set";
  const email = user.email || "No email";

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box sx={modalStyle}>
        {/* Header */}
        <MDBox display="flex" alignItems="center" mb={3}>
          <Icon sx={{ color: "#1976d2", fontSize: 28, mr: 1 }}>badge</Icon>
          <MDTypography variant="h5">
            Change Name
          </MDTypography>
        </MDBox>

        {/* User info */}
        <MDBox mb={3}>
          <MDTypography variant="body2" color="text">
            Changing name for:
          </MDTypography>
          <MDTypography variant="h6" fontWeight="medium">
            {currentName}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {email}
          </MDTypography>
        </MDBox>

        {/* Name fields */}
        <MDBox mb={2}>
          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
          />
        </MDBox>

        <MDBox mb={3}>
          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading}
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
            {loading ? "Updating..." : "Update Name"}
          </MDButton>
        </MDBox>
      </Box>
    </Modal>
  );
}

ChangeNameDialog.defaultProps = {
  user: null,
  loading: false,
  error: null,
};

ChangeNameDialog.propTypes = {
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

export default ChangeNameDialog;
