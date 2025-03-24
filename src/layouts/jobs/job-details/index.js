import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "config/firebase";

//Algorithm
import { doesModelMatchJob } from "utils/matching";

// MUI and MD components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Components
import JobImages from "./components/JobImages";
import JobInfo from "./components/JobInfo";
import JobApplicants from "./components/JobApplicants";


function JobDetails() {
    const { reference } = useParams();
    const [job, setJob] = useState(null);
    const [model, setModel] = useState(null);
    const [models, setModels] = useState([]);
    const [hasApplied, setHasApplied] = useState(false);

    const isMatch = model && job && doesModelMatchJob(model, job);
    const alreadyApplied = job?.applicants?.includes(model?.uid) ?? false;

    const handleApply = async () => {
        if (!model || !job) return;

        try {
            const jobRef = doc(db, "jobs", job.id); // NOTE: we'll fix this in a sec if you're not storing job.id
            await updateDoc(jobRef, {
                applicants: arrayUnion(model.uid),
            });
            setHasApplied(true);
        } catch (err) {
            console.error("Failed to apply for job:", err);
        }
    };

    useEffect(() => {
        const fetchJob = async () => {
            const jobRef = collection(db, "jobs");
            const q = query(jobRef, where("reference", "==", reference));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setJob(querySnapshot.docs[0].data());
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
        </DashboardLayout>
    );
}

export default JobDetails;