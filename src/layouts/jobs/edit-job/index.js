import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth, db } from "config/firebase";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Formik, Form } from "formik";
import * as Yup from "yup";

import Grid from "@mui/material/Grid";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import JobInfo from "../new-job/components/JobInfo";
import Media from "../new-job/components/Media";
import Requirements from "../new-job/components/Requirements";
import Payment from "../new-job/components/Payment";

function getSteps() {
    return ["1. Job Info", "2. Media", "3. Requirements", "4. Payment", "5. Confirmation"];
}

function getStepContent(stepIndex, formikProps) {
    switch (stepIndex) {
        case 0:
            return <JobInfo formik={formikProps} />;
        case 1:
            return <Media formik={formikProps} />;
        case 2:
            return <Requirements formik={formikProps} />;
        case 3:
            return <Payment formik={formikProps} />;
        case 4:
            return (
                <MDBox textAlign="center" mt={4}>
                    <MDTypography variant="h4" color="success" gutterBottom>
                        ✅ Job successfully updated!
                    </MDTypography>
                    <MDBox mt={2}>
                        <MDButton
                            variant="gradient"
                            color="dark"
                            component={Link}
                            to="/jobs/my-jobs"
                        >
                            View My Jobs
                        </MDButton>
                    </MDBox>
                </MDBox>
            );
        default:
            return null;
    }
}

function EditJob() {
    const { reference } = useParams();
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialValues, setInitialValues] = useState(null);
    const [jobDocId, setJobDocId] = useState(null);

    const steps = getSteps();
    const isConfirmationStep = activeStep === steps.length - 1;
    const isFinalFormStep = activeStep === steps.length - 2;

    const validationSchema = Yup.object({
        title: Yup.string().required("Job title is required").min(3, "Title must be at least 3 characters"),
        location: Yup.string().required("Location is required"),
        description: Yup.string().required("Description is required"),
        categories: Yup.array().min(1, "At least one category is required"),
        gender: Yup.array().min(1, "Please select at least one gender"),
        currency: Yup.string().required("Currency is required"),
        rateType: Yup.string().required("Rate type is required"),
        media: Yup.array().nullable(),
    });

    useEffect(() => {
        const fetchJob = async () => {
            const jobsQuery = query(collection(db, "jobs"), where("reference", "==", reference));
            const snapshot = await getDocs(jobsQuery);

            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                const data = docSnap.data();
                setJobDocId(docSnap.id);

                // Ensure array-type fields are always arrays
                const fixArray = (value) => (Array.isArray(value) ? value : []);
                const fixedValues = {
                    ...data,
                    jobType: fixArray(data.jobType),
                    gender: fixArray(data.gender),
                    braSize: fixArray(data.braSize),
                    dressSize: fixArray(data.dressSize),
                    shoeSize: fixArray(data.shoeSize),
                    eyeColour: fixArray(data.eyeColour),
                    hairColour: fixArray(data.hairColour),
                    categories: fixArray(data.categories),
                    currency: data.currency || "", // currency and rateType might be strings
                    rateType: data.rateType || "",
                    media: fixArray(data.media),
                };

                setInitialValues(fixedValues);
            }
            else {
                alert("Job not found");
                navigate("/jobs/my-jobs");
            }
        };

        fetchJob();
    }, [reference, navigate]);

    const handleSubmit = async (values, actions) => {
        if (!auth.currentUser || !jobDocId) return;

        setIsSubmitting(true);
        actions.setSubmitting(true);

        try {
            await updateDoc(doc(db, "jobs", jobDocId), {
                ...values,
                updatedAt: new Date().toISOString(),
            });

            setActiveStep((s) => s + 1);
        } catch (error) {
            console.error("❌ Error updating job:", error);
            alert("An error occurred while updating the job.");
        }

        setIsSubmitting(false);
        actions.setSubmitting(false);
    };

    if (!initialValues) return null;

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox mt={5} mb={9}>
                <Grid container justifyContent="center">
                    <Grid item xs={12} lg={8}>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmit}
                            enableReinitialize
                        >
                            {(formikProps) => (
                                <Form>
                                    <MDBox mt={6} mb={4} textAlign="center">
                                        <MDTypography variant="h3" fontWeight="bold">
                                            Edit Job
                                        </MDTypography>
                                        <MDTypography variant="h5" color="secondary">
                                            Make changes to your existing job posting
                                        </MDTypography>
                                    </MDBox>

                                    <Card>
                                        <MDBox mt={2} mb={3} mx={2}>
                                            <Stepper activeStep={activeStep} alternativeLabel>
                                                {steps.map((label) => (
                                                    <Step key={label}>
                                                        <StepLabel>{label}</StepLabel>
                                                    </Step>
                                                ))}
                                            </Stepper>
                                        </MDBox>

                                        <MDBox p={2}>
                                            {getStepContent(activeStep, formikProps)}
                                        </MDBox>

                                        {!isConfirmationStep && (
                                            <MDBox m={3} display="flex" justifyContent="space-between" alignItems="center">
                                                {activeStep > 0 ? (
                                                    <MDButton
                                                        variant="gradient"
                                                        color="light"
                                                        onClick={() => setActiveStep((s) => s - 1)}
                                                    >
                                                        Back
                                                    </MDButton>
                                                ) : <MDBox />}

                                                {isFinalFormStep ? (
                                                    <MDButton
                                                        variant="gradient"
                                                        color="info"
                                                        onClick={formikProps.handleSubmit}
                                                        disabled={formikProps.isSubmitting || isSubmitting}
                                                    >
                                                        Save Changes
                                                    </MDButton>
                                                ) : (
                                                    <MDButton
                                                        variant="gradient"
                                                        color="primary"
                                                        onClick={() => setActiveStep((s) => s + 1)}
                                                    >
                                                        Next
                                                    </MDButton>
                                                )}
                                            </MDBox>
                                        )}
                                    </Card>
                                </Form>
                            )}
                        </Formik>
                    </Grid>
                </Grid>
            </MDBox>
            <Footer />
        </DashboardLayout>
    );
}

export default EditJob;
