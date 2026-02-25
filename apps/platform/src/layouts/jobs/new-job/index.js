import { Link, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { db } from "config/firebase";
import { collection, addDoc, updateDoc, doc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "context/AuthContext";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { sendJobInvitation } from "utils/invitations";

import Grid from "@mui/material/Grid";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import LoadingOverlay from "components/LoadingOverlay";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import JobInfo from "./components/JobInfo";
import Media from "./components/Media";
import Requirements from "./components/Requirements";
import Payment from "./components/Payment";

function getSteps() {
  return ["1. Job Info", "2. Media", "3. Requirements", "4. Payment", "5. Confirmation"];
}

const generateJobReference = () => {
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0].replace(/-/g, "");
  const hours = today.getHours().toString().padStart(2, "0");
  const minutes = today.getMinutes().toString().padStart(2, "0");
  const seconds = today.getSeconds().toString().padStart(2, "0");
  const milliseconds = today.getMilliseconds().toString().padStart(3, "0");
  const random = seconds + milliseconds;
  return `TMC-${formattedDate}-${hours}${minutes}${random}`;
};

function getStepContent(stepIndex, formikProps, jobRef, user, modelToInvite, invitationSent) {
  switch (stepIndex) {
    case 0:
      return <JobInfo formik={formikProps} />;
    case 1:
      return <Media formik={formikProps} jobRef={jobRef} user={user} />;
    case 2:
      return <Requirements formik={formikProps} />;
    case 3:
      return <Payment formik={formikProps} />;
    case 4:
      const modelName = modelToInvite
        ? `${modelToInvite.firstName || ""} ${modelToInvite.lastName || ""}`.trim()
        : null;
      // Account managers should go to organisation jobs page
      const jobsRoute = user?.role === "account manager" ? "/jobs/organisation" : "/jobs/my-jobs";
      return (
        <MDBox textAlign="center" mt={4}>
          <MDTypography variant="h4" color="success" gutterBottom>
            Job successfully created!
          </MDTypography>
          <MDTypography variant="h6">
            Your job reference is: <strong>{jobRef}</strong>
          </MDTypography>
          {modelToInvite && invitationSent && (
            <MDBox mt={2}>
              <MDTypography variant="body1" color="success">
                {modelName} has been invited to apply for this job.
              </MDTypography>
            </MDBox>
          )}
          <MDBox mt={3}>
            <MDButton
              variant="gradient"
              color="dark"
              component={Link}
              to={jobsRoute}
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

function NewJob() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelToInvite, setModelToInvite] = useState(null);
  const [invitationSent, setInvitationSent] = useState(false);

  // Check for model to invite from query params
  const inviteModelId = searchParams.get("inviteModel");

  // Fetch model data if inviteModel param is present
  useEffect(() => {
    const fetchModelToInvite = async () => {
      if (inviteModelId) {
        try {
          const modelRef = doc(db, "users", inviteModelId);
          const modelSnap = await getDoc(modelRef);
          if (modelSnap.exists()) {
            setModelToInvite({ uid: modelSnap.id, ...modelSnap.data() });
          }
        } catch (err) {
          console.error("Error fetching model to invite:", err);
        }
      }
    };
    fetchModelToInvite();
  }, [inviteModelId]);

  // Generate job reference once when component mounts (used for media folder path)
  const jobRef = useMemo(() => generateJobReference(), []);

  const steps = getSteps();
  const isConfirmationStep = activeStep === steps.length - 1;
  const isFinalFormStep = activeStep === steps.length - 2;

  const initialValues = {
    title: "",
    country: "",
    county: "",
    state: "",
    city: "",
    description: "",
    usage: "",
    jobType: [],
    minHeight: "",
    maxHeight: "",
    gender: [],
    categories: [],
    minWeight: "",
    maxWeight: "",
    waist: "",
    qty: "",
    chest: "",
    collar: "",
    hips: "",
    braSize: [],
    dressSize: [],
    shoeSize: [],
    eyeColour: [],
    hairColour: [],
    budget: "",
    currency: [],
    rateType: [],
    media: [],
  };

  const validationSchema = Yup.object({
    title: Yup.string().required("Job title is required").min(3, "Title must be at least 3 characters"),
    country: Yup.string().required("Country is required"),
    description: Yup.string().required("Description is required"),
    categories: Yup.array().min(1, "At least one category is required"),
    gender: Yup.array().min(1, "Please select at least one gender"),
    currency: Yup.string().required("Currency is required"),
    rateType: Yup.string().required("Rate type is required"),
    media: Yup.array().nullable(),
  });

  const handleSubmit = async (values, actions) => {
    console.log("👤 Current user:", user);
    console.log("📝 Form values on submit:", values);

    if (!user) {
      alert("You must be logged in to create a job.");
      return;
    }

    setIsSubmitting(true);
    actions.setSubmitting(true);

    try {
      console.log("🔧 Using Job Ref:", jobRef);

      const jobData = {
        ...values,
        createdAt: new Date().toISOString(),
        userId: user.uid,
        reference: jobRef,
        media: values.media || [],
        // Organisation context - captured from user at creation time
        organisationId: user.organisationId || null,
        teamId: user.teamId || null,
      };

      console.log("📦 Job data to be saved:", jobData);

      const docRef = await addDoc(collection(db, "jobs"), jobData);
      console.log("✅ Job posted with ID:", docRef.id);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        jobs: arrayUnion(jobRef),
      });
      console.log("🧾 Added job ref to user doc");

      // Send invitation if we have a model to invite
      if (modelToInvite) {
        try {
          console.log("📨 Sending invitation to model:", modelToInvite.firstName);
          const jobWithId = { ...jobData, id: docRef.id };
          await sendJobInvitation(jobWithId, modelToInvite, user);
          setInvitationSent(true);
          console.log("✅ Invitation sent successfully");
        } catch (inviteErr) {
          console.error("⚠️ Failed to send invitation:", inviteErr);
          // Don't fail the whole flow if invitation fails
        }
      }

      setIsSubmitting(false);
      actions.setSubmitting(false);
      setActiveStep((prevStep) => prevStep + 1);
    } catch (error) {
      console.error("❌ Error submitting job:", error);
      alert("An error occurred while creating the job. Please try again.");
      setIsSubmitting(false);
      actions.setSubmitting(false);
    }
  };



  return (
    <DashboardLayout>
      <DashboardNavbar />
      <LoadingOverlay
        open={isSubmitting}
        message={modelToInvite ? "Creating job and sending invitation..." : "Creating your job..."}
        fullScreen
      />
      <MDBox mt={5} mb={9}>
        <Grid container justifyContent="center">
          <Grid item xs={12} lg={8}>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {(formikProps) => (
                <Form>
                  <MDBox mt={6} mb={4} textAlign="center">
                    <MDTypography variant="h3" fontWeight="bold">
                      Add New Job
                    </MDTypography>
                    <MDTypography variant="h5" color="secondary">
                      Fill out the details to post a new opportunity for models.
                    </MDTypography>
                  </MDBox>

                  {/* Show banner when inviting a specific model */}
                  {modelToInvite && (
                    <Alert
                      severity="info"
                      sx={{ mb: 3 }}
                      icon={
                        <Avatar
                          src={modelToInvite.profileAvatar}
                          alt={modelToInvite.firstName}
                          sx={{ width: 32, height: 32 }}
                        />
                      }
                    >
                      <MDTypography variant="body2">
                        <strong>
                          {modelToInvite.firstName} {modelToInvite.lastName}
                        </strong>{" "}
                        will be invited to apply for this job once created.
                      </MDTypography>
                    </Alert>
                  )}

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
                      {getStepContent(activeStep, formikProps, jobRef, user, modelToInvite, invitationSent)}
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
                        ) : (
                          <MDBox />
                        )}

                        {isFinalFormStep ? (
                          <MDButton
                            variant="gradient"
                            color="info"
                            onClick={() => {
                              formikProps.validateForm().then((errors) => {
                                if (Object.keys(errors).length === 0) {
                                  formikProps.handleSubmit();
                                } else {
                                  console.warn("Validation errors:", errors);
                                  alert("Please fix the following fields: " + Object.keys(errors).join(", "));
                                }
                              });
                            }}
                            disabled={formikProps.isSubmitting || isSubmitting}
                          >
                            Submit
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

export default NewJob;
