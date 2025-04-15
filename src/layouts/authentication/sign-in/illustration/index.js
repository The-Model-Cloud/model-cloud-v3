import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

// @mui components
import Switch from "@mui/material/Switch";

// Custom components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Layout wrapper
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";
import bgImage from "assets/images/illustrations/signup-image-1.png";

// Firebase
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "config/firebase";

function Illustration() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSetRememberMe = () => setRememberMe(!rememberMe);
 
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        // First time login — create Firestore profile
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email,
          role: "model", // Default role — can adjust this
          createdAt: new Date().toISOString(),
        });
  
        // 🔁 Send to account setup
        navigate("/pages/account/settings");
      } else {
        // 👤 Existing user — go to profile overview
        navigate("/pages/profile/profile-overview");
      }
  
    } catch (err) {
      console.error("Login error:", err.message);
      setError("Invalid login credentials. Please try again.");
    }
  };
  

  return (
    <IllustrationLayout
      title="Sign In"
      description="Enter your email and password to sign in"
      illustration={bgImage}
    >
      <MDBox component="form" role="form" onSubmit={handleSignIn} autoComplete="on">
        <MDBox mb={2}>
          <MDInput
            type="email"
            name="email" // ✅ triggers browser autocomplete
            autoComplete="email" // ✅ further encourages browser to offer suggestion
            label="Email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </MDBox>
        <MDBox mb={2}>
          <MDInput
            type="password"
            name="password" // ✅ triggers password manager
            autoComplete="current-password"
            label="Password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </MDBox>
        <MDBox display="flex" alignItems="center" ml={-1}>
          <Switch checked={rememberMe} onChange={handleSetRememberMe} />
          <MDTypography
            variant="button"
            fontWeight="regular"
            color="text"
            onClick={handleSetRememberMe}
            sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
          >
            &nbsp;&nbsp;Remember me
          </MDTypography>
        </MDBox>
        {error && (
          <MDTypography color="error" fontSize="small" mt={2}>
            {error}
          </MDTypography>
        )}
        <MDBox mt={4} mb={1}>
          <MDButton type="submit" variant="gradient" color="info" size="large" fullWidth>
            Sign in
          </MDButton>
        </MDBox>
        <MDBox mt={3} textAlign="center">
          <MDTypography variant="button" color="text">
            Don&apos;t have an account?{" "}
            <MDTypography
              component={Link}
              to="/authentication/sign-up/illustration"
              variant="button"
              color="info"
              fontWeight="medium"
              textGradient
            >
              Sign up
            </MDTypography>
          </MDTypography>
        </MDBox>
      </MDBox>
    </IllustrationLayout>
  );
}

export default Illustration;
