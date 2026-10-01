import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";

// @mui components
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Icon from "@mui/material/Icon";

// Custom components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Logo
import Logo from "assets/images/logo-rectangle-dark.png";

// Layout wrapper
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";

// Fallback image
import fallbackImage from "assets/images/illustrations/signup-image-1.png";

// Firebase
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from "firebase/auth";
import { auth } from "config/firebase";

function AuthAction() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);

  // Verify the action code on mount
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError("Invalid link. The action code is missing.");
        setInvalidCode(true);
        setLoading(false);
        return;
      }

      // Handle email verification, and confirming a change of email address (same code, different wording)
      if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") {
        try {
          await applyActionCode(auth, oobCode);
          setSuccess(true);
          setLoading(false);
        } catch (err) {
          console.error("Email verification error:", err);
          setInvalidCode(true);
          switch (err.code) {
            case "auth/expired-action-code":
              setError(
                mode === "verifyAndChangeEmail"
                  ? "This link has expired. Please sign in and start the email change again."
                  : "This email verification link has expired. Please sign in and request a new verification email."
              );
              break;
            case "auth/invalid-action-code":
              setError("This email verification link is invalid or has already been used.");
              break;
            default:
              setError("Could not verify your email. Please try again or request a new verification link.");
          }
          setLoading(false);
        }
        return;
      }

      // Handle password reset
      if (mode === "resetPassword") {
        try {
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(userEmail);
          setLoading(false);
        } catch (err) {
          console.error("Code verification error:", err);
          setInvalidCode(true);
          switch (err.code) {
            case "auth/expired-action-code":
              setError("This password reset link has expired. Please request a new one.");
              break;
            case "auth/invalid-action-code":
              setError("This password reset link is invalid or has already been used.");
              break;
            default:
              setError("This password reset link is invalid. Please request a new one.");
          }
          setLoading(false);
        }
        return;
      }

      // Unknown mode
      setError("Invalid link. Please check the link in your email and try again.");
      setInvalidCode(true);
      setLoading(false);
    };

    verifyCode();
  }, [mode, oobCode]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);

      switch (err.code) {
        case "auth/expired-action-code":
          setError("This password reset link has expired. Please request a new one.");
          break;
        case "auth/invalid-action-code":
          setError("This password reset link is invalid or has already been used.");
          break;
        case "auth/weak-password":
          setError("Password is too weak. Please choose a stronger password.");
          break;
        default:
          setError("Failed to reset password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isEmailChange = mode === "verifyAndChangeEmail";
  const pageTitle = mode === "verifyEmail" ? "Email Verification" : isEmailChange ? "Update Email Address" : "Reset Password";

  // Loading state
  if (loading) {
    return (
      <IllustrationLayout
        title={
          <>
            <MDBox display="flex" justifyContent="center" mb={2}>
              <img src={Logo} style={{ height: 50 }} alt="The Model Cloud Logo" />
            </MDBox>
            {pageTitle}
          </>
        }
        description={
          mode === "verifyEmail"
            ? "Verifying your email address..."
            : isEmailChange
              ? "Confirming your new email address..."
              : "Verifying your reset link..."
        }
        illustration={fallbackImage}
      >
        <MDBox textAlign="center" py={4}>
          <CircularProgress color="info" />
        </MDBox>
      </IllustrationLayout>
    );
  }

  // Invalid or expired code
  if (invalidCode) {
    return (
      <IllustrationLayout
        title={
          <>
            <MDBox display="flex" justifyContent="center" mb={2}>
              <img src={Logo} style={{ height: 50 }} alt="The Model Cloud Logo" />
            </MDBox>
            {pageTitle}
          </>
        }
        description=""
        illustration={fallbackImage}
      >
        <MDBox textAlign="center" py={4}>
          <Icon sx={{ fontSize: 64, color: "error.main" }}>error</Icon>
          <MDTypography variant="h5" fontWeight="medium" mt={2}>
            Link Invalid
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            {error}
          </MDTypography>
          <MDBox mt={4}>
            {mode === "verifyEmail" || isEmailChange ? (
              <MDTypography
                component={Link}
                to="/sign-in"
                variant="button"
                color="info"
                fontWeight="medium"
                textGradient
              >
                Back to Sign In
              </MDTypography>
            ) : (
              <MDTypography
                component={Link}
                to="/reset-password"
                variant="button"
                color="info"
                fontWeight="medium"
                textGradient
              >
                Request a new reset link
              </MDTypography>
            )}
          </MDBox>
        </MDBox>
      </IllustrationLayout>
    );
  }

  // Email address change confirmed. Firebase signs the user out everywhere, so they sign in again with the new address.
  if (success && isEmailChange) {
    return (
      <IllustrationLayout
        title={
          <>
            <MDBox display="flex" justifyContent="center" mb={2}>
              <img src={Logo} style={{ height: 50 }} alt="The Model Cloud Logo" />
            </MDBox>
            Email Updated
          </>
        }
        description=""
        illustration={fallbackImage}
      >
        <MDBox textAlign="center" py={4}>
          <Icon sx={{ fontSize: 64, color: "success.main" }}>mark_email_read</Icon>
          <MDTypography variant="h5" fontWeight="medium" mt={2}>
            Your email address has been updated
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            Please sign in again using your new email address and your existing password.
          </MDTypography>
          <MDBox mt={4}>
            <MDButton component={Link} to="/sign-in" variant="gradient" color="info" size="large">
              Sign In
            </MDButton>
          </MDBox>
        </MDBox>
      </IllustrationLayout>
    );
  }

  // Email verification success
  if (success && mode === "verifyEmail") {
    return (
      <IllustrationLayout
        title={
          <>
            <MDBox display="flex" justifyContent="center" mb={2}>
              <img src={Logo} style={{ height: 50 }} alt="The Model Cloud Logo" />
            </MDBox>
            Email Verified
          </>
        }
        description=""
        illustration={fallbackImage}
      >
        <MDBox textAlign="center" py={4}>
          <Icon sx={{ fontSize: 64, color: "success.main" }}>mark_email_read</Icon>
          <MDTypography variant="h5" fontWeight="medium" mt={2}>
            Email Verified!
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            Your email address has been successfully verified.
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            Your account is currently under review. You&apos;ll receive an email once an admin has approved your profile.
          </MDTypography>
          <MDBox mt={4}>
            <MDButton
              component={Link}
              to="/dashboard"
              variant="gradient"
              color="info"
              size="large"
            >
              Go to Dashboard
            </MDButton>
          </MDBox>
        </MDBox>
      </IllustrationLayout>
    );
  }

  // Password reset success
  if (success) {
    return (
      <IllustrationLayout
        title={
          <>
            <MDBox display="flex" justifyContent="center" mb={2}>
              <img src={Logo} style={{ height: 50 }} alt="The Model Cloud Logo" />
            </MDBox>
            Password Reset
          </>
        }
        description=""
        illustration={fallbackImage}
      >
        <MDBox textAlign="center" py={4}>
          <Icon sx={{ fontSize: 64, color: "success.main" }}>check_circle</Icon>
          <MDTypography variant="h5" fontWeight="medium" mt={2}>
            Password Changed!
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            Your password has been successfully reset.
          </MDTypography>
          <MDBox mt={4}>
            <MDButton
              component={Link}
              to="/sign-in"
              variant="gradient"
              color="info"
              size="large"
            >
              Sign In
            </MDButton>
          </MDBox>
        </MDBox>
      </IllustrationLayout>
    );
  }

  // Password reset form
  return (
    <IllustrationLayout
      title={
        <>
          <MDBox display="flex" justifyContent="center" mb={2}>
            <img src={Logo} style={{ height: 50 }} alt="The Model Cloud Logo" />
          </MDBox>
          Reset Password
        </>
      }
      description={`Enter a new password for ${email}`}
      illustration={fallbackImage}
    >
      <MDBox component="form" role="form" onSubmit={handleResetPassword}>
        <MDBox mb={2}>
          <MDInput
            type="password"
            name="newPassword"
            autoComplete="new-password"
            label="New Password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={submitting}
          />
        </MDBox>
        <MDBox mb={2}>
          <MDInput
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            label="Confirm New Password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
          />
        </MDBox>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <MDBox mt={4} mb={1}>
          <MDButton
            type="submit"
            variant="gradient"
            color="info"
            size="large"
            fullWidth
            disabled={submitting}
          >
            {submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Reset Password"
            )}
          </MDButton>
        </MDBox>
        <MDBox mt={3} textAlign="center">
          <MDTypography variant="button" color="text">
            Remember your password?{" "}
            <MDTypography
              component={Link}
              to="/sign-in"
              variant="button"
              color="info"
              fontWeight="medium"
              textGradient
            >
              Sign in
            </MDTypography>
          </MDTypography>
        </MDBox>
      </MDBox>
    </IllustrationLayout>
  );
}

export default AuthAction;
