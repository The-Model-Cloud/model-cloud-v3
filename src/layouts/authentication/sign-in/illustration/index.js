import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

// @mui components
import Switch from "@mui/material/Switch";

// Custom components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

//Logo
import Logo from "assets/images/logo-rectangle-dark.png";

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

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";

    if (savedRememberMe && savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Handle "Remember me" functionality
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
        localStorage.removeItem("rememberMe");
      }

      // Set logged in flag to remember login status
      localStorage.setItem("isLoggedIn", "true");

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
        navigate("/edit-profile");
      } else {
        // 👤 Existing user — go to profile overview
        navigate("/dashboard");
      }

    } catch (err) {
      console.error("Login error:", err.message);
      setError("Invalid login credentials. Please try again.");
    }
  };


  return (
    <IllustrationLayout
      title={
        <>
          <MDBox display="flex" justifyContent="center" mb={2}>
            <img src={Logo} style={{ height: 50 }} alt="The Model Cloud Logo" />
          </MDBox>
          Sign In
        </>
      }
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
              to="/sign-up"
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
