/**
 * ResetPasswordDialog - Dialog for resetting a user's password (Admin only)
 */

import { useState } from "react";
import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";

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

// Generate a random password
const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

function ResetPasswordDialog({
  open,
  onClose,
  onConfirm,
  user,
  loading,
  error,
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [validationError, setValidationError] = useState("");

  // Reset state when dialog opens
  const handleOpen = () => {
    setPassword(generatePassword());
    setConfirmPassword("");
    setShowPassword(false);
    setSendEmail(true);
    setValidationError("");
  };

  // Generate new password
  const handleGenerate = () => {
    const newPass = generatePassword();
    setPassword(newPass);
    setConfirmPassword(newPass);
    setValidationError("");
  };

  // Validate and submit
  const handleSubmit = () => {
    if (!password) {
      setValidationError("Password is required");
      return;
    }
    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }
    setValidationError("");
    onConfirm(password, sendEmail);
  };

  if (!user) return null;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || "Unknown User";
  const email = user.email || "No email";

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      onTransitionEnter={handleOpen}
    >
      <Box sx={modalStyle}>
        {/* Header */}
        <MDBox display="flex" alignItems="center" mb={3}>
          <Icon sx={{ color: "#1976d2", fontSize: 28, mr: 1 }}>lock_reset</Icon>
          <MDTypography variant="h5">
            Reset Password
          </MDTypography>
        </MDBox>

        {/* User info */}
        <MDBox mb={3}>
          <MDTypography variant="body2" color="text">
            Resetting password for:
          </MDTypography>
          <MDTypography variant="h6" fontWeight="medium">
            {fullName}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {email}
          </MDTypography>
        </MDBox>

        {/* Password fields */}
        <MDBox mb={2}>
          <TextField
            fullWidth
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    <Icon>{showPassword ? "visibility_off" : "visibility"}</Icon>
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </MDBox>

        <MDBox mb={2}>
          <TextField
            fullWidth
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </MDBox>

        <MDBox mb={3}>
          <MDButton
            variant="outlined"
            color="info"
            size="small"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={<Icon>autorenew</Icon>}
          >
            Generate Password
          </MDButton>
        </MDBox>

        {/* Send email option */}
        <MDBox mb={3}>
          <FormControlLabel
            control={
              <Checkbox
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={loading || !email}
              />
            }
            label="Send new password to user via email"
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
                <Icon>lock_reset</Icon>
              )
            }
          >
            {loading ? "Resetting..." : "Reset Password"}
          </MDButton>
        </MDBox>
      </Box>
    </Modal>
  );
}

ResetPasswordDialog.defaultProps = {
  user: null,
  loading: false,
  error: null,
};

ResetPasswordDialog.propTypes = {
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

export default ResetPasswordDialog;
