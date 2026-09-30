import { useState } from "react";
import { Link } from "react-router-dom";

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
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "config/firebase";

function ResetPasswordIllustration() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      // Use custom action URL since app is not hosted on Firebase Hosting
      const actionCodeSettings = {
        url: "https://app.themodel.cloud/auth/action",
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err.message);

      // Handle specific Firebase error codes
      switch (err.code) {
        case "auth/user-not-found":
          setError("No account found with this email address.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please try again later.");
          break;
        default:
          setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

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
      description="Enter your email address and we'll send you a link to reset your password"
      illustration={fallbackImage}
    >
      {success ? (
        <MDBox textAlign="center" py={4}>
          <Icon sx={{ fontSize: 64, color: "success.main" }}>check_circle</Icon>
          <MDTypography variant="h5" fontWeight="medium" mt={2}>
            Check Your Email
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            Click the link in the email to reset your password.
          </MDTypography>
          <MDBox mt={4}>
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
          </MDBox>
        </MDBox>
      ) : (
        <MDBox component="form" role="form" onSubmit={handleResetPassword}>
          <MDBox mb={2}>
            <MDInput
              type="email"
              name="email"
              autoComplete="email"
              label="Email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
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
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Send Reset Link"
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
      )}
    </IllustrationLayout>
  );
}

export default ResetPasswordIllustration;
