import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "config/firebase";

//Algorithm
import { doesModelMatchJob } from "utils/matching";

// Notifications
import { createJobApplicationNotification, createJobApplicationConfirmationNotification, createJobApplicationCancellationNotification, createInvitationAcceptedNotification } from "utils/notifications";

// Activity Logging
import { logModelApplied, logApplicationCancelled } from "utils/activityLog";

// API utilities
import { sendApplicationEmail, sendModelApplicationConfirmation, createThread } from "utils/api";

// Invitations
import { markInvitationAsApplied, getInvitationStatus, sendInvitationAcceptedMessage, declineJobInvitation } from "utils/invitations";

// Verification
import { isUnverifiedModel } from "utils/verification";

// MUI and MD components
import Card from "@mui/material/Card";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import Backdrop from "@mui/material/Backdrop";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";


import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Snackbar from "@mui/material/Snackbar";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Components
import JobImages from "./components/JobImages";
import JobInfo from "./components/JobInfo";
import JobApplicants from "./components/JobApplicants";
import MatchingModels from "./components/MatchingModels";
import ShortlistForJobModal from "components/Favourites/ShortlistForJobModal";
import AwardJobModal from "./components/AwardJobModal";
import JobPaymentSection from "./components/JobPaymentSection";
import JobCompletionSection from "./components/JobCompletionSection";
import JobActivityLog from "./components/JobActivityLog";
import JobActionsSection from "./components/JobActionsSection";
import LoadingOverlay from "components/LoadingOverlay";

// Favourites utilities
import { getListsForJob } from "utils/favourites";

const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    borderRadius: "12px",
    boxShadow: 24,
    p: 4,
};


function JobDetails() {
    const { reference } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [model, setModel] = useState(null);
    const [models, setModels] = useState([]);
    const [hasApplied, setHasApplied] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState(null); // 'pending', 'cancelled', etc.
    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState("");
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isCreatingThread, setIsCreatingThread] = useState(false);
    const [shortlistModalOpen, setShortlistModalOpen] = useState(false);
    const [linkedShortlist, setLinkedShortlist] = useState(null);
    const [awardModalOpen, setAwardModalOpen] = useState(false);
    const [selectedModelForAward, setSelectedModelForAward] = useState(null);
    const [isInvited, setIsInvited] = useState(false);
    const [invitationChecked, setInvitationChecked] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [hasDeclined, setHasDeclined] = useState(false);

    // Check if current user is job owner
    const isJobOwner = model && job && job.userId === model.uid;
    // Check if current user is the awarded model
    const isAwardedModel = model && job?.awardedTo?.modelId === model.uid;
    // Check if current user is admin
    const isAdmin = model && ["admin", "super admin"].includes(model.role);

    // Function to refresh job data
    const refreshJob = async () => {
        const jobRef = collection(db, "jobs");
        const q = query(jobRef, where("reference", "==", reference));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const jobData = { id: docSnap.id, ...docSnap.data() };
            setJob(jobData);
        }
    };

    // Handle award button click from applicant list
    const handleAwardClick = (applicantModel) => {
        setSelectedModelForAward(applicantModel);
        setAwardModalOpen(true);
    };

    // Handle successful job award
    const handleAwardSuccess = (result) => {
        setSnackMessage("Job awarded successfully! The model has been notified.");
        setSnackOpen(true);
        setAwardModalOpen(false);
        setSelectedModelForAward(null);
        refreshJob();
    };

    useEffect(() => {
        const fetchCurrentModel = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const modelRef = doc(db, "users", user.uid);
            const snap = await getDoc(modelRef);
            if (snap.exists()) {
                const modelData = snap.data();
                modelData.uid = user.uid; // Make sure uid is available
                setModel(modelData);
            }
        };

        fetchCurrentModel();
    }, []);

    // Note: doesModelMatchJob is called inline in the JSX below

    const handleConfirmApply = async () => {
        if (!model || !job) {
            console.error("Missing model or job data");
            return;
        }

        setIsApplying(true);

        try {
            console.log("🚀 Starting job application process...");

            const jobRef = doc(db, "jobs", job.id);

            // ✅ Step 1: Update the main job doc
            console.log("Step 1: Updating job applicants...");
            await updateDoc(jobRef, {
                applicants: arrayUnion(model.uid),
                [`appliedTimestamps.${model.uid}`]: new Date().toISOString(),
            });

            // ✅ Step 2: Write/update the subcollection (handles re-applications)
            console.log("Step 2: Creating/updating application record...");
            const applicationRef = doc(db, "jobs", job.id, "applications", model.uid);
            await setDoc(applicationRef, {
                modelId: model.uid,
                modelName: `${model.firstName} ${model.lastName || ""}`,
                appliedAt: new Date().toISOString(),
                status: "pending",
            }, { merge: true });

            // ✅ Step 3: Add/update job in model's applied jobs
            console.log("Step 3: Updating model's applied jobs...");
            const modelRef = doc(db, "users", model.uid);
            const modelSnap = await getDoc(modelRef);
            if (modelSnap.exists()) {
                const modelData = modelSnap.data();
                const existingAppliedJobs = modelData.appliedJobs || [];
                const existingIndex = existingAppliedJobs.findIndex(aj => aj.jobReference === job.reference);

                if (existingIndex >= 0) {
                    // Re-applying: update existing entry
                    existingAppliedJobs[existingIndex] = {
                        ...existingAppliedJobs[existingIndex],
                        appliedAt: new Date().toISOString(),
                        status: "pending",
                    };
                    await updateDoc(modelRef, { appliedJobs: existingAppliedJobs });
                } else {
                    // First time applying
                    await updateDoc(modelRef, {
                        appliedJobs: arrayUnion({
                            jobId: job.id,
                            jobReference: job.reference,
                            jobTitle: job.title,
                            appliedAt: new Date().toISOString(),
                            status: "pending",
                        }),
                    });
                }
            }

            console.log("✅ Core application process completed successfully!");

            // ✅ Step 4: Mark invitation as applied (if model was invited)
            console.log("Step 4: Checking for invitation...");
            await markInvitationAsApplied(job.id, model.uid)
                .catch(err => console.warn("⚠️ Invitation status update skipped:", err.message));

            // ✅ Step 5: Log activity for admins
            console.log("Step 5: Logging activity...");
            await logModelApplied(job, model, isInvited)
                .catch(err => console.warn("⚠️ Activity logging failed:", err.message));

            // ✅ Step 6: Get client details and send notifications/emails (non-critical)
            try {
                console.log("Step 6: Fetching client details...");
                const clientSnap = await getDoc(doc(db, "users", job.userId));
                if (clientSnap.exists()) {
                    const client = clientSnap.data();

                    // ✅ Step 7: Create notification for client (different message if invitation was accepted)
                    console.log("Step 7: Creating notification for client...");
                    if (isInvited) {
                        await createInvitationAcceptedNotification(job.userId, model, job)
                            .catch(err => console.warn("⚠️ Invitation accepted notification failed:", err.message));
                    } else {
                        await createJobApplicationNotification(job.userId, model, job)
                            .catch(err => console.warn("⚠️ Notification creation failed:", err.message));
                    }

                    // ✅ Step 8: Send email to client
                    console.log("Step 8: Sending email to client...");
                    await sendApplicationEmail(
                        client.email,
                        `${model.firstName} ${model.lastName || ""}`,
                        job.title,
                        job.reference,
                        job.userId // Pass client UID to check their notification preferences
                    );

                    // ✅ Step 8b: Send message to client (if accepting invitation)
                    if (isInvited) {
                        console.log("Step 8b: Sending acceptance message to client...");
                        client.uid = job.userId; // Add uid to client object
                        await sendInvitationAcceptedMessage(model, client, job)
                            .catch(err => console.warn("⚠️ Acceptance message to client failed:", err.message));
                    }
                }
            } catch (clientError) {
                console.warn("⚠️ Client notification/email failed (non-critical):", clientError.message);
            }

            // ✅ Step 9: Create confirmation notification for model
            console.log("Step 9: Creating confirmation notification for model...");
            await createJobApplicationConfirmationNotification(model.uid, job)
                .catch(err => console.warn("⚠️ Model notification creation failed:", err.message));

            // ✅ Step 10: Send confirmation email to model
            console.log("Step 10: Sending confirmation email to model...");
            await sendModelApplicationConfirmation(
                model.email,
                `${model.firstName} ${model.lastName || ""}`,
                job.title,
                job.reference
            ).catch(err => console.warn("⚠️ Model confirmation email failed:", err.message));

            console.log("✅ Application process completed!");

            setHasApplied(true);
            setApplicationStatus("pending");
            setSnackMessage("You've successfully applied!");
            setSnackOpen(true);

            setTimeout(() => {
                setShowApplyModal(false);
                setIsApplying(false);
            }, 3000);

        } catch (err) {
            console.error("❌ Critical error in application process:", err);
            alert(`Application failed: ${err.message}\n\nPlease check the console for details.`);
            setIsApplying(false);
        }
    };

    const handleCancelApplication = async () => {
        if (!model || !job) {
            console.error("Missing model or job data");
            return;
        }

        setIsCancelling(true);

        try {
            console.log("🚫 Starting application cancellation process...");

            const jobRef = doc(db, "jobs", job.id);

            // Step 1: Remove model from job applicants array
            console.log("Step 1: Removing from job applicants...");
            await updateDoc(jobRef, {
                applicants: arrayRemove(model.uid),
            });

            // Step 2: Update the application record status
            console.log("Step 2: Updating application status...");
            const applicationRef = doc(db, "jobs", job.id, "applications", model.uid);
            await updateDoc(applicationRef, {
                status: "cancelled",
                cancelledAt: new Date().toISOString(),
            });

            // Step 3: Update model's appliedJobs - need to find and update the specific job
            console.log("Step 3: Updating model's applied jobs...");
            const modelRef = doc(db, "users", model.uid);
            const modelSnap = await getDoc(modelRef);
            if (modelSnap.exists()) {
                const modelData = modelSnap.data();
                const updatedAppliedJobs = (modelData.appliedJobs || []).map(aj => {
                    if (aj.jobReference === job.reference) {
                        return { ...aj, status: "cancelled", cancelledAt: new Date().toISOString() };
                    }
                    return aj;
                });
                await updateDoc(modelRef, { appliedJobs: updatedAppliedJobs });
            }

            console.log("✅ Core cancellation process completed!");

            // Step 4: Log activity for admins
            console.log("Step 4: Logging activity...");
            await logApplicationCancelled(job, model)
                .catch(err => console.warn("⚠️ Activity logging failed:", err.message));

            // Step 5: Notify client (non-critical)
            try {
                console.log("Step 5: Notifying client...");
                await createJobApplicationCancellationNotification(job.userId, model, job)
                    .catch(err => console.warn("⚠️ Client notification failed:", err.message));
            } catch (clientError) {
                console.warn("⚠️ Client notification failed (non-critical):", clientError.message);
            }

            console.log("✅ Cancellation process completed!");

            setHasApplied(false);
            setApplicationStatus("cancelled");
            setSnackMessage("Application cancelled successfully");
            setSnackOpen(true);

            setTimeout(() => {
                setShowCancelModal(false);
                setIsCancelling(false);
            }, 2000);

        } catch (err) {
            console.error("❌ Error cancelling application:", err);
            alert(`Cancellation failed: ${err.message}`);
            setIsCancelling(false);
        }
    };

    // ✅ Handle messaging the client about this job
    const handleMessageClient = async () => {
        if (!model || !job) {
            console.error("Missing model or job data");
            return;
        }

        setIsCreatingThread(true);

        try {
            const result = await createThread(job.userId, "job", job.id);

            if (result.threadId) {
                navigate(`/messages/${result.threadId}`);
            } else {
                throw new Error("Failed to create conversation");
            }
        } catch (err) {
            console.error("❌ Error creating message thread:", err);
            setSnackMessage("Failed to start conversation. Please try again.");
            setSnackOpen(true);
            setIsCreatingThread(false);
        }
    };

    // ✅ Handle declining a job invitation
    const handleDeclineInvitation = async () => {
        if (!model || !job) {
            console.error("Missing model or job data");
            return;
        }

        setIsDeclining(true);

        try {
            await declineJobInvitation(job.id, model.uid);

            setIsInvited(false);
            setHasDeclined(true);
            setShowDeclineModal(false);
            setSnackMessage("Invitation declined.");
            setSnackOpen(true);
        } catch (err) {
            console.error("❌ Error declining invitation:", err);
            setSnackMessage("Failed to decline invitation. Please try again.");
            setSnackOpen(true);
        } finally {
            setIsDeclining(false);
        }
    };

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                // First get user data to determine their role and application status
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    console.log("User not found");
                    return;
                }

                const userData = userSnap.data();
                const userRole = userData.role;

                const jobRef = collection(db, "jobs");
                let jobData = null;

                // Strategy: Try different query approaches based on user role
                // Firestore security rules require:
                // - Admins can read any job
                // - Owners/org members can read their jobs
                // - Everyone can read jobs with status="open"

                if (userRole === "admin" || userRole === "super admin") {
                    // Admins can query by reference alone
                    const q = query(jobRef, where("reference", "==", reference));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const docSnap = querySnapshot.docs[0];
                        jobData = { id: docSnap.id, ...docSnap.data() };
                    }
                } else {
                    // For all other users (models, clients, account managers):
                    // Try the compound query first (requires composite index)
                    // If index doesn't exist yet, fall back to querying all open jobs
                    try {
                        const q = query(
                            jobRef,
                            where("reference", "==", reference),
                            where("status", "==", "open")
                        );
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            const docSnap = querySnapshot.docs[0];
                            jobData = { id: docSnap.id, ...docSnap.data() };
                        }
                    } catch (indexError) {
                        // Compound query failed (likely missing index), try fallback
                        console.log("Compound query failed, using fallback:", indexError.message);

                        // Fallback: query all open jobs and filter client-side
                        const q = query(jobRef, where("status", "==", "open"));
                        const querySnapshot = await getDocs(q);
                        querySnapshot.forEach((docSnap) => {
                            const data = docSnap.data();
                            if (data.reference === reference) {
                                jobData = { id: docSnap.id, ...data };
                            }
                        });
                    }

                    // If still not found and user is a client/account manager, they might own the job
                    // Try querying without status filter (for non-open jobs they own)
                    if (!jobData && userRole !== "model") {
                        try {
                            const q = query(jobRef, where("reference", "==", reference));
                            const querySnapshot = await getDocs(q);
                            if (!querySnapshot.empty) {
                                const docSnap = querySnapshot.docs[0];
                                jobData = { id: docSnap.id, ...docSnap.data() };
                            }
                        } catch (ownerError) {
                            // User doesn't have permission to access this job
                            console.log("User does not have access to this job");
                        }
                    }
                }

                if (jobData) {
                    setJob(jobData);

                    // Check if user has applied for this job
                    const appliedJob = (userData.appliedJobs || []).find(
                        aj => aj.jobReference === jobData.reference
                    );
                    if (appliedJob) {
                        setApplicationStatus(appliedJob.status);
                        setHasApplied(appliedJob.status !== "cancelled");
                    }
                } else {
                    console.log("Job not found or not accessible with current permissions");
                }
            } catch (err) {
                console.error("Error fetching job:", err);
            }
        };
        fetchJob();
    }, [reference]);

    useEffect(() => {
        const fetchModels = async () => {
            const applicants = job?.applicants || [];
            const modelsData = [];

            for (let uid of applicants) {
                try {
                    const modelRef = doc(db, "users", uid);
                    const snap = await getDoc(modelRef);
                    if (snap.exists()) {
                        modelsData.push({ uid, ...snap.data() });
                    }
                } catch (err) {
                    console.warn(`Could not fetch applicant ${uid}:`, err.message);
                }
            }

            setModels(modelsData);
        };

        if (job) {
            fetchModels();
        }
    }, [job]);

    // Fetch linked shortlist for this job (for job owner only)
    useEffect(() => {
        const fetchShortlist = async () => {
            // Only fetch shortlist for job owner
            if (!job || !model || job.userId !== model.uid) return;

            try {
                const lists = await getListsForJob(job.id, model.uid);
                if (lists.length > 0) {
                    setLinkedShortlist(lists[0]);
                }
            } catch (error) {
                // Silently fail - shortlist is optional
                console.warn("Could not fetch shortlist:", error.message);
            }
        };

        fetchShortlist();
    }, [job, model]);

    // Check if current model has been invited to this job
    useEffect(() => {
        const checkInvitation = async () => {
            if (!job || !model || job.userId === model.uid) {
                setInvitationChecked(true);
                return;
            }

            try {
                const invitationResult = await getInvitationStatus(job.id, model.uid);
                setIsInvited(invitationResult.invited && invitationResult.status !== "declined");
                setHasDeclined(invitationResult.status === "declined");
            } catch (error) {
                console.error("Error checking invitation status:", error);
            } finally {
                setInvitationChecked(true);
            }
        };

        checkInvitation();
    }, [job, model]);

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <LoadingOverlay
                open={isApplying}
                message={isInvited ? "Accepting invitation and applying..." : "Submitting your application..."}
                fullScreen
            />
            <MDBox py={3}>
                {job && (
                    <>
                        {/* Hero Section with Images */}
                        {job.media && job.media.length > 0 && (
                            <Card sx={{ overflow: "hidden", mb: 3 }}>
                                <JobImages media={job.media} />
                            </Card>
                        )}

                        {/* Main Content Card */}
                        <Card sx={{ overflow: "visible" }}>
                            <MDBox p={{ xs: 2, md: 4 }}>
                                <JobInfo job={job} />

                                {/* Application status and buttons */}
                                {model && job.userId !== model.uid && (
                                    <MDBox mt={4} pt={3} sx={{ borderTop: "1px solid", borderColor: "grey.200" }}>
                                        {/* Show invitation banner if model was invited */}
                                        {isInvited && !hasApplied && !hasDeclined && applicationStatus !== "cancelled" && (
                                            <Alert
                                                severity="info"
                                                icon={<Icon>mail</Icon>}
                                                sx={{ mb: 3 }}
                                                action={
                                                    <Chip
                                                        label="Invited"
                                                        color="info"
                                                        size="small"
                                                        sx={{ fontWeight: "bold" }}
                                                    />
                                                }
                                            >
                                                <MDTypography variant="body2">
                                                    You've been personally invited to apply for this job! The client thinks you'd be a great fit.
                                                </MDTypography>
                                            </Alert>
                                        )}

                                        {/* Show declined banner if invitation was declined */}
                                        {hasDeclined && (
                                            <Alert
                                                severity="default"
                                                icon={<Icon>block</Icon>}
                                                sx={{ mb: 3, backgroundColor: "grey.100" }}
                                            >
                                                <MDTypography variant="body2" color="text">
                                                    You declined the invitation for this job. You can still apply if you change your mind.
                                                </MDTypography>
                                            </Alert>
                                        )}

                                        {isUnverifiedModel(model) ? (
                                            <MDBox display="flex" alignItems="center" gap={1} p={2} borderRadius="lg" sx={{ backgroundColor: "warning.lighter" }}>
                                                <Icon sx={{ color: "warning.main" }}>gpp_maybe</Icon>
                                                <MDTypography color="warning" variant="body2">
                                                    Your account is pending verification. Once an admin verifies your account, you'll be able to apply for jobs.
                                                </MDTypography>
                                            </MDBox>
                                        ) : doesModelMatchJob(model, job) ? (
                                            <>
                                                {hasApplied ? (
                                                    <MDBox>
                                                        <MDBox display="flex" alignItems="center" gap={1} mb={2}>
                                                            <Icon sx={{ color: "success.main" }}>check_circle</Icon>
                                                            <MDTypography variant="body1" color="success" fontWeight="medium">
                                                                You've applied for this job
                                                            </MDTypography>
                                                        </MDBox>
                                                        <MDBox display="flex" gap={2} flexWrap="wrap">
                                                            <MDButton
                                                                color="info"
                                                                variant="gradient"
                                                                onClick={handleMessageClient}
                                                                disabled={isCreatingThread}
                                                                startIcon={<Icon>message</Icon>}
                                                            >
                                                                {isCreatingThread ? "Opening..." : "Message Client"}
                                                            </MDButton>
                                                            <MDButton
                                                                color="error"
                                                                variant="outlined"
                                                                onClick={() => setShowCancelModal(true)}
                                                            >
                                                                Cancel Application
                                                            </MDButton>
                                                        </MDBox>
                                                    </MDBox>
                                                ) : applicationStatus === "cancelled" ? (
                                                    <MDBox>
                                                        <MDBox display="flex" alignItems="center" gap={1} mb={2}>
                                                            <Icon sx={{ color: "warning.main" }}>info</Icon>
                                                            <MDTypography variant="body1" color="warning" fontWeight="medium">
                                                                Application Previously Cancelled
                                                            </MDTypography>
                                                        </MDBox>
                                                        <MDButton
                                                            color="info"
                                                            variant="gradient"
                                                            onClick={() => setShowApplyModal(true)}
                                                            size="large"
                                                        >
                                                            Apply Again
                                                        </MDButton>
                                                    </MDBox>
                                                ) : (
                                                    <MDBox>
                                                        <MDButton
                                                            color="info"
                                                            variant="gradient"
                                                            onClick={() => setShowApplyModal(true)}
                                                            size="large"
                                                            sx={{ px: 4, py: 1.5 }}
                                                            startIcon={isInvited ? <Icon>check</Icon> : null}
                                                        >
                                                            {isInvited ? "Accept Invitation & Apply" : "Apply Now"}
                                                        </MDButton>
                                                        {isInvited && (
                                                            <MDBox mt={2} display="flex" gap={2} flexWrap="wrap">
                                                                <MDButton
                                                                    color="dark"
                                                                    variant="outlined"
                                                                    onClick={handleMessageClient}
                                                                    disabled={isCreatingThread}
                                                                    startIcon={<Icon>message</Icon>}
                                                                >
                                                                    {isCreatingThread ? "Opening..." : "Message Client First"}
                                                                </MDButton>
                                                                <MDButton
                                                                    color="error"
                                                                    variant="text"
                                                                    onClick={() => setShowDeclineModal(true)}
                                                                    startIcon={<Icon>close</Icon>}
                                                                >
                                                                    Decline Invitation
                                                                </MDButton>
                                                            </MDBox>
                                                        )}
                                                    </MDBox>
                                                )}
                                            </>
                                        ) : (
                                            <MDBox display="flex" alignItems="center" gap={1} p={2} borderRadius="lg" sx={{ backgroundColor: "error.lighter" }}>
                                                <Icon sx={{ color: "error.main" }}>block</Icon>
                                                <MDTypography color="error" variant="body2">
                                                    Sorry, you can't apply as you don't match this job's requirements.
                                                </MDTypography>
                                            </MDBox>
                                        )}
                                    </MDBox>
                                )}

                                {/* Shortlist section for job owner */}
                                {model && job.userId === model.uid && (
                                    <MDBox mt={4} pt={3} sx={{ borderTop: "1px solid", borderColor: "grey.200" }}>
                                        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                            <MDBox display="flex" alignItems="center" gap={1}>
                                                <Icon sx={{ color: "info.main" }}>bookmark</Icon>
                                                <MDTypography variant="h6" fontWeight="medium">
                                                    Model Shortlist
                                                </MDTypography>
                                            </MDBox>
                                            <MDButton
                                                variant="outlined"
                                                color="info"
                                                size="small"
                                                onClick={() => setShortlistModalOpen(true)}
                                                startIcon={<Icon>playlist_add</Icon>}
                                            >
                                                {linkedShortlist ? "Change Shortlist" : "Add Shortlist"}
                                            </MDButton>
                                        </MDBox>
                                        {linkedShortlist ? (
                                            <MDBox p={2} borderRadius="lg" sx={{ backgroundColor: "grey.100" }}>
                                                <MDBox display="flex" alignItems="center" justifyContent="space-between">
                                                    <MDBox>
                                                        <MDTypography variant="body1" fontWeight="medium">
                                                            {linkedShortlist.title}
                                                        </MDTypography>
                                                        <MDTypography variant="caption" color="text">
                                                            {linkedShortlist.modelCount || 0} models in shortlist
                                                        </MDTypography>
                                                    </MDBox>
                                                    <MDButton
                                                        variant="text"
                                                        color="info"
                                                        size="small"
                                                        href={`/favourites/${linkedShortlist.id}`}
                                                    >
                                                        View List
                                                    </MDButton>
                                                </MDBox>
                                            </MDBox>
                                        ) : (
                                            <MDTypography variant="body2" color="text">
                                                No shortlist linked to this job yet. Create or link a favourite list to shortlist models for this job.
                                            </MDTypography>
                                        )}
                                    </MDBox>
                                )}
                            </MDBox>
                        </Card>

                        {/* Payment Section - show if job is awarded */}
                        {job.awardedTo && (
                            <JobPaymentSection
                                job={job}
                                isOwner={isJobOwner}
                                onPaymentComplete={refreshJob}
                            />
                        )}

                        {/* Completion Section - show if payment is authorized */}
                        {job.awardedTo && job.payment?.status === "authorized" && (
                            <JobCompletionSection
                                job={job}
                                isOwner={isJobOwner}
                                isAwardedModel={isAwardedModel}
                                onCompletionUpdate={refreshJob}
                            />
                        )}

                        {/* Applicants Section - separate card (only show if not awarded) */}
                        {!job.awardedTo && (
                            <JobApplicants
                                job={job}
                                models={models}
                                onAwardClick={handleAwardClick}
                                isOwner={isJobOwner}
                            />
                        )}

                        {/* Matching Models Section - for job owner (only show if not awarded) */}
                        {!job.awardedTo && <MatchingModels job={job} />}

                        {/* Job Actions Section - for job owner */}
                        <JobActionsSection
                            job={job}
                            isOwner={isJobOwner}
                            isAdmin={isAdmin}
                            onActionComplete={refreshJob}
                        />

                        {/* Activity Log - admin only */}
                        <JobActivityLog jobId={job.id} isAdmin={isAdmin} />

                        <Snackbar
                            open={snackOpen}
                            autoHideDuration={4000}
                            onClose={() => setSnackOpen(false)}
                            message={snackMessage}
                        />
                    </>
                )}
            </MDBox>
            <Footer />

            {/* Apply Confirmation Modal */}
            <Modal
                open={showApplyModal}
                onClose={() => setShowApplyModal(false)}
                closeAfterTransition
                BackdropComponent={Backdrop}
                BackdropProps={{ timeout: 500 }}
            >
                <Fade in={showApplyModal}>
                    <Box sx={modalStyle}>
                        <MDTypography id="modal-title" variant="h6" component="h2" gutterBottom>
                            Confirm Application
                        </MDTypography>
                        <MDTypography id="modal-description" variant="body2" gutterBottom>
                            You are about to apply for this job. Click confirm to proceed.
                        </MDTypography>

                        <MDBox mt={3} display="flex" justifyContent="flex-end" gap={1}>
                            <MDButton variant="outlined" color="secondary" onClick={() => setShowApplyModal(false)} disabled={isApplying}>
                                Cancel
                            </MDButton>
                            <MDButton
                                variant="gradient"
                                color="info"
                                onClick={handleConfirmApply}
                                disabled={isApplying}
                            >
                                {isApplying ? (
                                    <span style={{ display: "flex", alignItems: "center" }}>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ marginRight: 8 }} />
                                        Applying...
                                    </span>
                                ) : (
                                    "Confirm"
                                )}
                            </MDButton>
                        </MDBox>
                    </Box>
                </Fade>
            </Modal>

            {/* Cancel Application Confirmation Modal */}
            <Modal
                open={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                closeAfterTransition
                BackdropComponent={Backdrop}
                BackdropProps={{ timeout: 500 }}
            >
                <Fade in={showCancelModal}>
                    <Box sx={modalStyle}>
                        <MDTypography id="cancel-modal-title" variant="h6" component="h2" gutterBottom color="error">
                            Cancel Application?
                        </MDTypography>
                        <MDTypography id="cancel-modal-description" variant="body2" gutterBottom>
                            Are you sure you want to cancel your application for this job? The client will be notified of this cancellation.
                        </MDTypography>
                        <MDTypography variant="body2" color="warning" fontWeight="medium" mt={2}>
                            You can re-apply later if you change your mind.
                        </MDTypography>

                        <MDBox mt={3} display="flex" justifyContent="flex-end" gap={1}>
                            <MDButton variant="outlined" color="secondary" onClick={() => setShowCancelModal(false)} disabled={isCancelling}>
                                Keep Application
                            </MDButton>
                            <MDButton
                                variant="gradient"
                                color="error"
                                onClick={handleCancelApplication}
                                disabled={isCancelling}
                            >
                                {isCancelling ? (
                                    <span style={{ display: "flex", alignItems: "center" }}>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ marginRight: 8 }} />
                                        Cancelling...
                                    </span>
                                ) : (
                                    "Yes, Cancel Application"
                                )}
                            </MDButton>
                        </MDBox>
                    </Box>
                </Fade>
            </Modal>

            {/* Shortlist for Job Modal */}
            {job && (
                <ShortlistForJobModal
                    open={shortlistModalOpen}
                    onClose={() => setShortlistModalOpen(false)}
                    job={job}
                    onShortlistUpdated={(listId) => {
                        if (listId) {
                            // Refetch the linked shortlist
                            getListsForJob(job.id, model?.uid).then(lists => {
                                setLinkedShortlist(lists.length > 0 ? lists[0] : null);
                            });
                        } else {
                            setLinkedShortlist(null);
                        }
                    }}
                />
            )}

            {/* Award Job Modal */}
            {job && selectedModelForAward && (
                <AwardJobModal
                    open={awardModalOpen}
                    onClose={() => {
                        setAwardModalOpen(false);
                        setSelectedModelForAward(null);
                    }}
                    job={job}
                    model={selectedModelForAward}
                    onAwardSuccess={handleAwardSuccess}
                />
            )}

            {/* Decline Invitation Modal */}
            <Modal
                open={showDeclineModal}
                onClose={() => setShowDeclineModal(false)}
                closeAfterTransition
                BackdropComponent={Backdrop}
                BackdropProps={{ timeout: 500 }}
            >
                <Fade in={showDeclineModal}>
                    <Box sx={modalStyle}>
                        <MDTypography variant="h6" component="h2" gutterBottom color="error">
                            Decline Invitation?
                        </MDTypography>
                        <MDTypography variant="body2" gutterBottom>
                            Are you sure you want to decline this job invitation?
                        </MDTypography>
                        <MDTypography variant="body2" color="text" mt={2}>
                            The client will not be notified, but you won't see this invitation again.
                        </MDTypography>

                        <MDBox mt={3} display="flex" justifyContent="flex-end" gap={1}>
                            <MDButton
                                variant="outlined"
                                color="secondary"
                                onClick={() => setShowDeclineModal(false)}
                                disabled={isDeclining}
                            >
                                Cancel
                            </MDButton>
                            <MDButton
                                variant="gradient"
                                color="error"
                                onClick={handleDeclineInvitation}
                                disabled={isDeclining}
                            >
                                {isDeclining ? "Declining..." : "Decline Invitation"}
                            </MDButton>
                        </MDBox>
                    </Box>
                </Fade>
            </Modal>

        </DashboardLayout>

    );

}

export default JobDetails;