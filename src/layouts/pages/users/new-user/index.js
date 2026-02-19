/**
=========================================================
* Material Dashboard 3 PRO React - v2.3.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-pro-react
* Copyright 2024 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState } from "react";

// formik components
import { Formik, Form } from "formik";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";

// Material Dashboard 3 PRO React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// NewUser page components
import UserInfo from "layouts/pages/users/new-user/components/UserInfo";
import Address from "layouts/pages/users/new-user/components/Address";
import Socials from "layouts/pages/users/new-user/components/Socials";
import Profile from "layouts/pages/users/new-user/components/Profile";

// NewUser layout schemas for form and form feilds
import validations from "layouts/pages/users/new-user/schemas/validations";
import form from "layouts/pages/users/new-user/schemas/form";
import initialValues from "layouts/pages/users/new-user/schemas/initialValues";

// Auth context
import { useAuth } from "context/AuthContext";

// Organisation utilities
import { getOrCreateOrganisation, updateOrganisationUserCount } from "utils/organisations";

function getSteps() {
  return ["User Info", "Address", "Social", "Profile"];
}

function getStepContent(stepIndex, formData) {
  switch (stepIndex) {
    case 0:
      return <UserInfo formData={formData} />;
    case 1:
      return <Address formData={formData} />;
    case 2:
      return <Socials formData={formData} />;
    case 3:
      return <Profile formData={formData} />;
    default:
      return null;
  }
}

function NewUser() {
  const [activeStep, setActiveStep] = useState(0);
  const steps = getSteps();
  const { formId, formField } = form;
  const currentValidation = validations[activeStep];
  const isLastStep = activeStep === steps.length - 1;

  // Get current user for organisation creation
  const { user } = useAuth();

  const handleBack = () => setActiveStep(activeStep - 1);

  const submitForm = async (values, actions) => {
    try {
      // Handle organisation creation/linking if company name is provided
      let organisationId = null;
      if (values.company) {
        const org = await getOrCreateOrganisation(
          values.company,
          {
            yearEstablished: values.yearEstablished || null,
            companyNumber: values.companyNumber || null,
            registeredAddress: values.registeredAddress || null,
            vatNumber: values.vatNumber || null,
          },
          user?.uid
        );

        if (org) {
          organisationId = org.id;
          // Update user count for the organisation
          await updateOrganisationUserCount(org.id, 1);
        }
      }

      // Prepare user data with organisation reference
      const userData = {
        ...values,
        organisationId,
      };

      // TODO: Implement actual user creation logic here
      // For now, just log the data
      console.log("User data to create:", userData);

      // eslint-disable-next-line no-alert
      alert(JSON.stringify(userData, null, 2));

      actions.setSubmitting(false);
      actions.resetForm();
      setActiveStep(0);
    } catch (error) {
      console.error("Error creating user:", error);
      actions.setSubmitting(false);
    }
  };

  const handleSubmit = (values, actions) => {
    if (isLastStep) {
      submitForm(values, actions);
    } else {
      setActiveStep(activeStep + 1);
      actions.setTouched({});
      actions.setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3} mb={20} height="65vh">
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          sx={{ height: "100%", mt: 8 }}
        >
          <Grid item xs={12} lg={8}>
            <Formik
              initialValues={initialValues}
              validationSchema={currentValidation}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, isSubmitting, setValues, setFieldValue }) => (
                <Form id={formId} autoComplete="off">
                  <Card sx={{ height: "100%" }}>
                    <MDBox mx={2} mt={2}>
                      <Stepper activeStep={activeStep} alternativeLabel>
                        {steps.map((label) => (
                          <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                          </Step>
                        ))}
                      </Stepper>
                    </MDBox>
                    <MDBox p={3}>
                      <MDBox>
                        {getStepContent(activeStep, {
                          values,
                          touched,
                          formField,
                          errors,
                          setValues,
                          setFieldValue,
                        })}
                        <MDBox
                          mt={2}
                          width="100%"
                          display="flex"
                          justifyContent="space-between"
                        >
                          {activeStep === 0 ? (
                            <MDBox />
                          ) : (
                            <MDButton
                              variant="gradient"
                              color="light"
                              onClick={handleBack}
                            >
                              back
                            </MDButton>
                          )}
                          <MDButton
                            disabled={isSubmitting}
                            type="submit"
                            variant="gradient"
                            color="dark"
                          >
                            {isLastStep ? "send" : "next"}
                          </MDButton>
                        </MDBox>
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

export default NewUser;
