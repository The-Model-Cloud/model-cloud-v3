import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "config/firebase";

//Algorithm
import { doesModelMatchJob } from "utils/matching";

// MUI and MD components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import Backdrop from "@mui/material/Backdrop";


import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import Snackbar from "@mui/material/Snackbar";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Components
import JobImages from "./components/JobImages";
import JobInfo from "./components/JobInfo";
import JobApplicants from "./components/JobApplicants";

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
    const [job, setJob] = useState(null);
    const [model, setModel] = useState(null);
    const [models, setModels] = useState([]);
    const [hasApplied, setHasApplied] = useState(false);
    const [snackOpen, setSnackOpen] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

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

    const isMatch = model && job && doesModelMatchJob(model, job);
    const alreadyApplied = job?.applicants?.includes(model?.uid) ?? false;

    const handleConfirmApply = async () => {
        if (!model || !job) return;

        setIsApplying(true);

        try {
            const jobRef = doc(db, "jobs", job.id);

            // ✅ Step 1: Update the main job doc — ONLY this update for now
            await updateDoc(jobRef, {
                applicants: arrayUnion(model.uid),
                [`appliedTimestamps.${model.uid}`]: new Date().toISOString(),
            });

            // ✅ Step 2: Write to the subcollection (separate transaction)
            const applicationRef = doc(db, "jobs", job.id, "applications", model.uid);
            await setDoc(applicationRef, {
                modelId: model.uid,
                modelName: model.firstName || "",
                appliedAt: new Date().toISOString(),
                status: "pending",
            });

            // ✅ Step 3: Email the client
            const clientSnap = await getDoc(doc(db, "users", job.userId));
            if (clientSnap.exists()) {
                const client = clientSnap.data();

                const payload = {
                    to: client.email,
                    subject: `New model application for your job "${job.title}"`,
                    text: `${model.firstName} has applied for your job.\n\nView the job here: https://themodel.cloud/jobs/${job.reference}`,
                };

                await fetch("/send-application-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            setHasApplied(true);
            setSnackOpen(true);

            setTimeout(() => {
                setShowApplyModal(false);
                setIsApplying(false);
            }, 3000);

        } catch (err) {
            console.error("❌ Failed to apply or send email:", err);
            alert("Something went wrong when applying.");
            setIsApplying(false);
        }
    };


    useEffect(() => {
        const fetchJob = async () => {
            const jobRef = collection(db, "jobs");
            const q = query(jobRef, where("reference", "==", reference));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                setJob({ id: docSnap.id, ...docSnap.data() });

            }
        };
        fetchJob();
    }, [reference]);

    useEffect(() => {
        const fetchModels = async () => {
            const applicants = job?.applicants || [];
            const modelsData = [];

            for (let uid of applicants) {
                const modelRef = doc(db, "users", uid);
                const snap = await getDoc(modelRef);
                if (snap.exists()) {
                    modelsData.push(snap.data());
                }
            }

            setModels(modelsData);
        };

        if (job) {
            fetchModels();
        }
    }, [job]);

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox py={3}>
                <Card sx={{ overflow: "visible" }}>
                    <MDBox p={3}>
                        <MDBox mb={3}>
                            <MDTypography variant="h5" fontWeight="medium">
                                Job Details
                            </MDTypography>
                        </MDBox>

                        {job && (
                            <Grid container spacing={3}>
                                <Grid item xs={12} lg={6} xl={5}>
                                    <JobImages media={job.media} />
                                </Grid>
                                <Grid item xs={12} lg={5} sx={{ mx: "auto" }}>
                                    <JobInfo job={job} />

                                    {/* 💡 INSERT this logic below JobInfo */}
                                    {model && job.userId !== model.uid && (
                                        <MDBox mt={4}>
                                            {doesModelMatchJob(model, job) ? (
                                                <MDButton
                                                    color="info"
                                                    variant="gradient"
                                                    onClick={() => setShowApplyModal(true)}
                                                    disabled={hasApplied}
                                                >
                                                    {hasApplied ? "You've Applied" : "Apply Now"}
                                                </MDButton>

                                            ) : (
                                                <MDTypography color="error" variant="body2">
                                                    Sorry, you don't match this job's requirements.
                                                </MDTypography>
                                            )}
                                        </MDBox>
                                    )}
                                    <Snackbar
                                        open={snackOpen}
                                        autoHideDuration={4000}
                                        onClose={() => setSnackOpen(false)}
                                        message="You've successfully applied!"
                                    />

                                </Grid>
                            </Grid>
                        )}


                        {job && models.length > 0 && (
                            <JobApplicants job={job} models={models} />
                        )}
                    </MDBox>
                </Card>
            </MDBox>
            <Footer />

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



        </DashboardLayout>

    );

}

export default JobDetails;