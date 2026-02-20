import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

import { collection, query, where, getDocs } from "firebase/firestore";
import slugify from "slugify";

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

import ProfileAvatar from "components/Profile/ProfileAvatar";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import IconButton from "@mui/material/IconButton";

// Layout
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";

// Fallback image in case API fails
import fallbackImage from "assets/images/illustrations/signup-image-1.png";

// Firebase
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth } from "config/firebase";
import { db } from "config/firebase";
import { doc, setDoc } from "firebase/firestore";

function SignUpIllustration() {

    const [profileAvatar, setProfileAvatar] = useState("");
    const [bgImage, setBgImage] = useState(fallbackImage);

    const navigate = useNavigate();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("model");
    const [agree, setAgree] = useState(false);
    const [error, setError] = useState("");
    const [companyName, setCompanyName] = useState("");

    // Fetch and preload random model profile image for background
    useEffect(() => {
        const fetchRandomImage = async () => {
            try {
                const response = await fetch(
                    `https://us-central1-${process.env.REACT_APP_FIREBASE_PROJECT_ID}.cloudfunctions.net/getRandomModelImages?count=1`
                );
                const data = await response.json();
                if (data.success && data.images?.length > 0) {
                    const imageUrl = data.images[0].url;
                    // Preload the image before displaying
                    const img = new Image();
                    img.onload = () => setBgImage(imageUrl);
                    img.src = imageUrl;
                }
            } catch (err) {
                console.log("Using fallback background image");
            }
        };
        fetchRandomImage();
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Build folder path: /users/{models|clients}/{username}/profile
        const userType = role === "model" ? "models" : "clients";
        const sanitizedName = `${firstName || "user"}_${lastName || "new"}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const folderPath = `users/${userType}/${sanitizedName}/profile`;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
        formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
        formData.append("folder", folderPath);
        formData.append("public_id", `profile_${Date.now()}`);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        if (data.secure_url) {
            setProfileAvatar(data.secure_url);
        }
    };


    const generateUniqueSlug = async (firstName, lastName) => {
        const baseSlug = `${firstName.trim().toLowerCase()}.${lastName.trim().charAt(0).toLowerCase()}`;
        let slug = baseSlug;
        let count = 1;

        const usersRef = collection(db, "users");

        // Check if this slug already exists
        while (true) {
            const q = query(usersRef, where("publicSlug", "==", slug));
            const snapshot = await getDocs(q);

            if (snapshot.empty) break;

            // If the slug exists, append a number
            slug = `${baseSlug}${count}`;
            count++;
        }

        return slug;
    };



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

            await updateProfile(user, { displayName: `${firstName} ${lastName}` });
            await sendEmailVerification(user);

            const publicSlug = await generateUniqueSlug(firstName, lastName); // 👈 Generate the slug

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                firstName,
                lastName,
                email,
                role,
                publicSlug,
                profileAvatar,
                companyName,
                createdAt: new Date().toISOString(),
                ...(role === "model" && { verified: false }),
            });

            // Set logged in flag to remember login status
            localStorage.setItem("isLoggedIn", "true");

            alert("Verification email sent. Please check your inbox.");
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

                {/* Role Selection */}
                <MDBox mb={2}>
                    <FormControl component="fieldset">
                        {role === "model" && (
                        <FormLabel component="legend">Apply to be a</FormLabel>
                        )}
                        
                        {role === "client" && (
                        <FormLabel component="legend">Register as a</FormLabel>
                        )}
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
                <MDBox mb={2}>
                    <MDInput
                        type="text"
                        label="First Name"
                        name="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                    />
                    <MDInput
                        type="text"
                        label="Last Name"
                        name="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
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
                {role === "client" && (
                    <MDBox mt={3} mb={2}>
                        <MDInput
                            type="text"
                            label="Company Name"
                            name="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            fullWidth
                        />
                    </MDBox>
                )}

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

                {role === "model" && (
                    <MDBox mt={3} mb={2}>
                        <MDTypography variant="h6" mb={1}>
                            Upload Headshot
                        </MDTypography>
                        <MDBox display="flex" alignItems="center" gap={2}>
                            <ProfileAvatar src={profileAvatar} size={100} />
                            <label htmlFor="headshot-upload">
                                <input
                                    accept="image/*"
                                    id="headshot-upload"
                                    type="file"
                                    style={{ display: "none" }}
                                    onChange={handleAvatarUpload}
                                />
                                <IconButton color="primary" component="span">
                                    <PhotoCamera />
                                </IconButton>
                            </label>
                        </MDBox>
                    </MDBox>
                )}

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
                        component={Link}
                        to="/terms"
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
                            to="/sign-in"
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
