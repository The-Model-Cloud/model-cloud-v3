import { useState } from "react";
import { auth, db } from "config/firebase";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { Formik, Form } from "formik";
import * as Yup from "yup";

// @mui material components
import Grid from "@mui/material/Grid";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Card from "@mui/material/Card";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Import all step components
import JobInfo from "./components/JobInfo";
import Media from "./components/Media";
import Requirements from "./components/Requirements";
import Payment from "./components/Payment";

function getSteps() {
  return ["1. Job Info", "2. Media", "3. Requirements", "4. Payment"];
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
    default:
      return null;
  }
}

function NewJob() {
  const [activeStep, setActiveStep] = useState(0);
  const steps = getSteps();
  const isLastStep = activeStep === steps.length - 1;

  const initialValues = {
    title: "",
    location: "",
    description: "", 
    jobType: "In-Person",
    minHeight: "",
    maxHeight: "",
    experienceLevel: "",
    gender: [],             
    budget: "",
    currency: "GBP",
    rateType: "Flat Fee",
    media: [],
  };
  

  const handleSubmit = async (values, actions) => {
    try {
      // Get the current user (the one creating the job)
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to create a job.");
        return;
      }
  
      // Add the user ID (uid) to the job data
      const jobData = {
        ...values,
        createdAt: new Date().toISOString(),
        userId: user.uid,  // Link the job to the user
      };
  
      // Save the job in Firestore under the "jobs" collection
      await addDoc(collection(db, "jobs"), jobData);
  
      // update the user document with job information
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        jobs: [...(userRef.jobs || []), jobData], // Add the job reference to the user
      });
  
      actions.setSubmitting(false);
      alert("Job successfully created!");
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job.");
    }
  };
  

  const validationSchema = Yup.object({
    title: Yup.string().required("Job title is required").min(3, "Title must be at least 3 characters"),
    location: Yup.string().required("Location is required"),
    description: Yup.string().required("Description is required"),
    categories: Yup.array().min(1, "At least one category is required"),
    gender: Yup.array().min(1, "Please select at least one gender"),
    budget: Yup.number().typeError("Budget must be a number").required("Budget is required").positive("Must be positive"),
    currency: Yup.string().required("Currency is required"),
    rateType: Yup.string().required("Rate type is required"),
    media: Yup.array().nullable(),
  });
  


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
            >
              {(formikProps) => (
                <Form>
                  <MDBox mt={6} mb={8} textAlign="center">
                    <MDTypography variant="h3" fontWeight="bold">
                      Add New Job
                    </MDTypography>
                    <MDTypography variant="h5" color="secondary">
                      Fill out the details to post a new opportunity for models.
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
                      <MDBox mt={3} display="flex" justifyContent="space-between">
                        {activeStep > 0 ? (
                          <MDButton variant="gradient" color="light" onClick={() => setActiveStep((s) => s - 1)}>
                            Back
                          </MDButton>
                        ) : <MDBox />}
                        <MDButton
                          variant="gradient"
                          color="dark"
                          type={isLastStep ? "submit" : "button"}
                          onClick={() => {
                            if (!isLastStep) setActiveStep((s) => s + 1);
                          }}
                        >
                          {isLastStep ? "Submit" : "Next"}
                        </MDButton>
                      </MDBox>
                    </MDBox>
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
