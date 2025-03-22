import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// @mui components
import Checkbox from "@mui/material/Checkbox";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormControlLabel from "@mui/material/FormControlLabel";

// Custom components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Layout
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";
import bgImage from "assets/images/illustrations/illustration-reset.jpg";

// Firebase
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth } from "config/firebase";
import { db } from "config/firebase";
import { doc, setDoc } from "firebase/firestore";

function SignUpIllustration() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("model");
    const [agree, setAgree] = useState(false);
    const [error, setError] = useState("");

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError("");

        if (!agree) {
            setError("You must agree to the Terms and Conditions.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            // ✅ Send verification email
            await sendEmailVerification(user);

            // ✅ Optionally show message and redirect
            alert("Verification email sent. Please check your inbox.");

            // Save to Firestore 'users' collection
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name,
                email,
                role, // model or client
                createdAt: new Date().toISOString(),
            });

            navigate("/dashboard");
        } catch (err) {
            console.error("Registration error:", err.message);
            setError("Failed to create account. Please check your details.");
        }
    };

    return (
        <IllustrationLayout
            title="Join The Model Cloud today"
            description="Enter your email and password to register"
            illustration={bgImage}
        >
            <MDBox component="form" role="form" onSubmit={handleSignUp}>
                <MDBox mb={2}>
                    <MDInput
                        type="text"
                        label="Name"
                        name="name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                    />
                </MDBox>
                <MDBox mb={2}>
                    <MDInput
                        type="email"
                        label="Email"
                        name="email"
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </MDBox>
                <MDBox mb={2}>
                    <MDInput
                        type="password"
                        label="Password"
                        name="password"
                        fullWidth
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                </MDBox>

                {/* Role Selection */}
                <MDBox mb={2}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">Register as</FormLabel>
                        <RadioGroup
                            row
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            name="role"
                        >
                            <FormControlLabel value="model" control={<Radio />} label="Model" />
                            <FormControlLabel value="client" control={<Radio />} label="Client" />
                        </RadioGroup>
                    </FormControl>
                </MDBox>

                <MDBox display="flex" alignItems="center" ml={-1}>
                    <Checkbox checked={agree} onChange={() => setAgree(!agree)} />
                    <MDTypography
                        variant="button"
                        fontWeight="regular"
                        color="text"
                        sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
                        onClick={() => setAgree(!agree)}
                    >
                        &nbsp;&nbsp;I agree to the&nbsp;
                    </MDTypography>
                    <MDTypography
                        component="a"
                        href="#"
                        variant="button"
                        fontWeight="bold"
                        color="info"
                        textGradient
                    >
                        Terms and Conditions
                    </MDTypography>
                </MDBox>

                {error && (
                    <MDTypography color="error" fontSize="small" mt={2}>
                        {error}
                    </MDTypography>
                )}

                <MDBox mt={4} mb={1}>
                    <MDButton type="submit" variant="gradient" color="info" fullWidth>
                        Sign up
                    </MDButton>
                </MDBox>
                <MDBox mt={3} textAlign="center">
                    <MDTypography variant="button" color="text">
                        Already have an account?{" "}
                        <MDTypography
                            component={Link}
                            to="/authentication/sign-in/illustration"
                            variant="button"
                            color="info"
                            fontWeight="medium"
                            textGradient
                        >
                            Sign In
                        </MDTypography>
                    </MDTypography>
                </MDBox>
            </MDBox>
        </IllustrationLayout>
    );
}

export default SignUpIllustration;
