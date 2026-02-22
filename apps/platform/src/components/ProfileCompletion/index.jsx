import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import CancelIcon from "@mui/icons-material/Cancel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function ProfileCompletion() {
    const [profile, setProfile] = useState(null);
    const [completionData, setCompletionData] = useState({
        percentage: 0,
        items: [],
    });
    const [isOpen, setIsOpen] = useState(true); // Default open

    useEffect(() => {
        const fetchProfile = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const ref = doc(db, "users", user.uid);
            const snap = await getDoc(ref);

            if (snap.exists()) {
                const data = snap.data();
                setProfile(data);
                const completion = calculateCompletion(data);

                // ✅ FIX: Update completionData state
                setCompletionData(completion);

                // Auto-close if 100% complete, otherwise stay open
                setIsOpen(completion.percentage < 100);
            }
        };

        fetchProfile();
    }, []);

    const calculateCompletion = (data) => {
        const userRole = data.role;

        // Common items for all users
        const commonItems = [
            {
                label: "Profile Photo",
                completed: !!data.profileAvatar,
                required: true,
                link: "/edit-profile",
                icon: data.profileAvatar ? "check" : "close",
            },
        ];

        // Model-specific items
        const modelItems = [
            {
                label: "Basic Information",
                completed: !!(data.firstName && data.lastName && data.gender && data.country),
                required: true,
                link: "/edit-profile",
                icon: (data.firstName && data.lastName && data.gender && data.country) ? "check" : "close",
                detail: !data.firstName ? "Add your name" : !data.gender ? "Add your gender" : !data.country ? "Add your location" : null,
            },
            {
                label: "Birth Date",
                completed: !!(data.dayOfBirth && data.monthOfBirth && data.yearOfBirth),
                required: true,
                link: "/edit-profile",
                icon: (data.dayOfBirth && data.monthOfBirth && data.yearOfBirth) ? "check" : "close",
                detail: "Required for age verification",
            },
            {
                label: "Contact Details",
                completed: !!(data.email && data.phone),
                required: true,
                link: "/edit-profile",
                icon: (data.email && data.phone) ? "check" : "close",
                detail: !data.phone ? "Add phone number" : null,
            },
            {
                label: "Portfolio Images",
                completed: (data.portfolioImages?.length || 0) >= 8,
                required: true,
                link: "/edit-profile",
                icon: (data.portfolioImages?.length || 0) >= 8 ? "check" : (data.portfolioImages?.length || 0) >= 5 ? "warning" : "close",
                detail: `${data.portfolioImages?.length || 0}/8 images (minimum 8 recommended)`,
            },
            {
                label: "Digitals/Polaroids",
                completed: (data.digitalImages?.length || 0) >= 3,
                required: true,
                link: "/edit-profile",
                icon: (data.digitalImages?.length || 0) >= 3 ? "check" : (data.digitalImages?.length || 0) >= 1 ? "warning" : "close",
                detail: `${data.digitalImages?.length || 0}/3 images (minimum 3 recommended)`,
            },
            {
                label: "Measurements",
                completed: !!(data.height && data.waist && data.shoeSize && data.eyeColour && data.hairColour),
                required: true,
                link: "/edit-profile",
                icon: (data.height && data.waist && data.shoeSize && data.eyeColour && data.hairColour) ? "check" : "close",
                detail: "Height, waist, shoe size, eye & hair color",
            },
            {
                label: "Categories/Skills",
                completed: (data.categories?.length || 0) >= 1,
                required: true,
                link: "/edit-profile",
                icon: (data.categories?.length || 0) >= 3 ? "check" : (data.categories?.length || 0) >= 1 ? "warning" : "close",
                detail: `${data.categories?.length || 0} selected (add more for better visibility)`,
            },
            {
                label: "About Me",
                completed: !!(data.aboutMe && data.aboutMe.length >= 50),
                required: false,
                link: "/edit-profile",
                icon: (data.aboutMe && data.aboutMe.length >= 50) ? "check" : "warning",
                detail: data.aboutMe ? `${data.aboutMe.length} characters (50+ recommended)` : "Add a description",
            },
            {
                label: "Social Media",
                completed: !!(data.instagram || data.tiktok || data.youtube),
                required: false,
                link: "/edit-profile",
                icon: (data.instagram || data.tiktok || data.youtube) ? "check" : "warning",
                detail: "Connect at least one platform",
            },
        ];

        // Client-specific items
        const clientItems = [
            {
                label: "Basic Information",
                completed: !!(data.firstName && data.lastName && data.country),
                required: true,
                link: "/edit-profile",
                icon: (data.firstName && data.lastName && data.country) ? "check" : "close",
                detail: !data.firstName ? "Add your name" : !data.country ? "Add your location" : null,
            },
            {
                label: "Contact Details",
                completed: !!(data.email && data.phone),
                required: true,
                link: "/edit-profile",
                icon: (data.email && data.phone) ? "check" : "close",
                detail: !data.phone ? "Add phone number" : null,
            },
            {
                label: "Year Established",
                completed: !!data.yearEstablished,
                required: true,
                link: "/edit-profile",
                icon: data.yearEstablished ? "check" : "close",
                detail: "When was your company established?",
            },
            {
                label: "Company Number",
                completed: !!data.companyNumber,
                required: true,
                link: "/edit-profile",
                icon: data.companyNumber ? "check" : "close",
                detail: "Your registered company number",
            },
            {
                label: "Registered Address",
                completed: !!data.registeredAddress,
                required: true,
                link: "/edit-profile",
                icon: data.registeredAddress ? "check" : "close",
                detail: "Your company's registered address",
            },
            {
                label: "VAT Number",
                completed: !!data.vatNumber,
                required: false,
                link: "/edit-profile",
                icon: data.vatNumber ? "check" : "warning",
                detail: "Add if applicable",
            },
        ];

        // Build items array based on user role
        let items;
        if (userRole === "client") {
            items = [...commonItems, ...clientItems];
        } else {
            // Default to model items for models and any other role
            items = [...commonItems, ...modelItems];
        }

        // Calculate percentage (only count required items)
        const requiredItems = items.filter(item => item.required);
        const completedRequired = requiredItems.filter(item => item.completed).length;
        const percentage = Math.round((completedRequired / requiredItems.length) * 100);

        return { percentage, items };
    };

    const getStatusIcon = (icon) => {
        switch (icon) {
            case "check":
                return <CheckCircleIcon sx={{ color: "success.main", fontSize: 20 }} />;
            case "warning":
                return <WarningIcon sx={{ color: "warning.main", fontSize: 20 }} />;
            case "close":
                return <CancelIcon sx={{ color: "error.main", fontSize: 20 }} />;
            default:
                return null;
        }
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 80) return "success";
        if (percentage >= 50) return "warning";
        return "error";
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    if (!profile) return null;

    return (
        <Card>
            <MDBox
                p={2}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ cursor: "pointer" }}
                onClick={handleToggle}
            >
                <MDBox flex={1}>
                    <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <MDTypography variant="h6" fontWeight="medium">
                            Profile Completion
                        </MDTypography>
                        <MDTypography variant="h5" fontWeight="bold" color={getProgressColor(completionData.percentage)}>
                            {completionData.percentage}%
                        </MDTypography>
                    </MDBox>
                    <LinearProgress
                        variant="determinate"
                        value={completionData.percentage}
                        color={getProgressColor(completionData.percentage)}
                        sx={{ height: 6, borderRadius: 2 }}
                    />
                </MDBox>

                <IconButton
                    onClick={handleToggle}
                    size="small"
                    sx={{ ml: 1.5 }}
                >
                    {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
            </MDBox>

            <Collapse in={isOpen} timeout="auto">
                <MDBox px={2} pb={2}>
                    <Grid container spacing={1} mt={0.5}>
                        {completionData.items.map((item, index) => (
                            <Grid item xs={4} sm={3} md={2} lg={1.2} key={index}>
                                <Tooltip title={item.detail || item.label} placement="top" arrow>
                                    <MDBox
                                        component={!item.completed ? Link : "div"}
                                        to={!item.completed ? item.link : undefined}
                                        p={1}
                                        borderRadius="md"
                                        textAlign="center"
                                        sx={{
                                            backgroundColor: item.completed
                                                ? "transparent"
                                                : item.icon === "warning"
                                                    ? "warning.light"
                                                    : "grey.100",
                                            border: "1px solid",
                                            borderColor: item.completed
                                                ? "success.light"
                                                : item.icon === "warning"
                                                    ? "warning.main"
                                                    : "grey.300",
                                            transition: "all 0.2s",
                                            cursor: !item.completed ? "pointer" : "default",
                                            textDecoration: "none",
                                            display: "block",
                                            minHeight: 56,
                                            "&:hover": {
                                                backgroundColor: !item.completed ? "grey.200" : "transparent",
                                                transform: !item.completed ? "translateY(-1px)" : "none",
                                                boxShadow: !item.completed ? 1 : 0,
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MDBox mb={0.25}>
                                            {getStatusIcon(item.icon)}
                                        </MDBox>
                                        <MDTypography
                                            variant="caption"
                                            fontWeight="medium"
                                            color="text"
                                            sx={{
                                                fontSize: "0.65rem",
                                                lineHeight: 1.1,
                                                display: "block"
                                            }}
                                        >
                                            {item.label}
                                            {item.required && (
                                                <MDTypography
                                                    component="span"
                                                    variant="caption"
                                                    color="error"
                                                    fontWeight="bold"
                                                    sx={{ fontSize: "0.55rem" }}
                                                >
                                                    *
                                                </MDTypography>
                                            )}
                                        </MDTypography>
                                    </MDBox>
                                </Tooltip>
                            </Grid>
                        ))}
                    </Grid>

                    {completionData.percentage < 100 && (
                        <MDBox mt={2} textAlign="center">
                            <MDButton
                                component={Link}
                                to="/edit-profile"
                                variant="gradient"
                                color="info"
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Complete My Profile
                            </MDButton>
                        </MDBox>
                    )}

                    {completionData.percentage === 100 && (
                        <MDBox mt={2} p={1.5} borderRadius="lg" bgcolor="success.light" textAlign="center">
                            <MDTypography variant="caption" color="success" fontWeight="bold">
                                🎉 Profile 100% complete!
                            </MDTypography>
                        </MDBox>
                    )}

                    <MDBox mt={1.5}>
                        <MDTypography variant="caption" color="text" textAlign="center" display="block" sx={{ fontSize: "0.65rem" }}>
                            * Required for visibility
                        </MDTypography>
                    </MDBox>
                </MDBox>
            </Collapse>
        </Card>
    );
}

export default ProfileCompletion;