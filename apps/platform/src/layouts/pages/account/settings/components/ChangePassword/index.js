import { useState } from "react";
import {
  Card,
  Grid,
  InputLabel,
  OutlinedInput,
  FormControl,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { auth } from "config/firebase";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = (setter) => () => setter((prev) => !prev);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error updating password:", err.message);
      setError(
        err.code === "auth/wrong-password"
          ? "Incorrect current password."
          : "Failed to update password. Please try again."
      );
    }
  };

  const passwordRequirements = [
    "One special character",
    "Min 6 characters",
    "One number (2 are recommended)",
    "Change it often",
  ];

  const renderPasswordRequirements = passwordRequirements.map((item, key) => (
    <MDBox key={`requirement-${key}`} component="li" color="text" fontSize="1.25rem" lineHeight={1}>
      <MDTypography variant="button" color="text" fontWeight="regular" verticalAlign="middle">
        {item}
      </MDTypography>
    </MDBox>
  ));

  const renderPasswordInput = (label, value, setValue, visible, toggleVisible, id) => (
    <FormControl variant="outlined" fullWidth>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <OutlinedInput
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        label={label}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={toggleVisible}
              edge="end"
            >
              {visible ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        }
      />
    </FormControl>
  );

  return (
    <Card id="change-password">
      <MDBox p={3}>
        <MDTypography variant="h5">Change Password</MDTypography>
      </MDBox>
      <MDBox component="form" pb={3} px={3} onSubmit={handleChangePassword}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderPasswordInput(
              "Current Password",
              currentPassword,
              setCurrentPassword,
              showCurrent,
              handleToggle(setShowCurrent),
              "current-password"
            )}
          </Grid>
          <Grid item xs={12}>
            {renderPasswordInput(
              "New Password",
              newPassword,
              setNewPassword,
              showNew,
              handleToggle(setShowNew),
              "new-password"
            )}
          </Grid>
          <Grid item xs={12}>
            {renderPasswordInput(
              "Confirm New Password",
              confirmPassword,
              setConfirmPassword,
              showConfirm,
              handleToggle(setShowConfirm),
              "confirm-password"
            )}
          </Grid>
        </Grid>

        {error && (
          <MDTypography variant="caption" color="error" mt={2}>
            {error}
          </MDTypography>
        )}
        {success && (
          <MDTypography variant="caption" color="success" mt={2}>
            {success}
          </MDTypography>
        )}

        <MDBox mt={6} mb={1}>
          <MDTypography variant="h5">Password requirements</MDTypography>
        </MDBox>
        <MDBox mb={1}>
          <MDTypography variant="body2" color="text">
            Please follow this guide for a strong password
          </MDTypography>
        </MDBox>
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap">
          <MDBox component="ul" m={0} pl={3.25} mb={{ xs: 8, sm: 0 }}>
            {renderPasswordRequirements}
          </MDBox>
          <MDBox ml="auto">
            <MDButton variant="gradient" color="dark" size="small" type="submit">
              update password
            </MDButton>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default ChangePassword;
