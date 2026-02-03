import { useState, useMemo, useCallback } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getOrCreateOrganisation, updateOrganisationUserCount } from "utils/organisations";

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
import UserInfo from "./components/UserInfo";
import Socials from "./components/Socials";
import Images from "./components/Images";
import Summary from "./components/Summary";

// NewUser layout schemas for form and form fields
import validations from "./schemas/validations";
import form from "./schemas/form";
import initialValues from "./schemas/initialValues";

// Auth context or user role hook
import { useAuth } from "context/AuthContext";

// Define steps for different user roles
function getSteps(role) {
  const isModel = role === "model";

  if (isModel) {
    return ["User Info", "Socials", "Images", "Summary"];
  }
  return ["User Info", "Images", "Summary"];
}

function getStepContent(stepIndex, formData, role, onEditStep) {
  const isModel = role === "model";

  if (isModel) {
    switch (stepIndex) {
      case 0:
        return <UserInfo formData={formData} />;
      case 1:
        return <Socials formData={formData} />;
      case 2:
        return <Images formData={formData} />;
      case 3:
        return <Summary formData={formData} onEditStep={onEditStep} />;
      default:
        return null;
    }
  }

  // Non-model users (client, admin, account manager, super admin)
  switch (stepIndex) {
    case 0:
      return <UserInfo formData={formData} />;
    case 1:
      return <Images formData={formData} />;
    case 2:
      return <Summary formData={formData} onEditStep={onEditStep} />;
    default:
      return null;
  }
}

// Generate unique public slug for users
async function generateUniqueSlug(firstName, lastName, db) {
  const baseSlug = `${firstName.trim().toLowerCase()}.${lastName.trim().charAt(0).toLowerCase()}`;
  let slug = baseSlug;
  let count = 1;

  const usersRef = collection(db, "users");

  while (true) {
    const q = query(usersRef, where("publicSlug", "==", slug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) break;

    slug = `${baseSlug}${count}`;
    count++;
  }

  return slug;
}

function AddUser() {
  const [activeStep, setActiveStep] = useState(0);
  const [currentRole, setCurrentRole] = useState("");
  const { formId, formField } = form;
  const { user: currentUser } = useAuth();

  // Get steps based on current role
  const steps = useMemo(() => getSteps(currentRole), [currentRole]);
  const isLastStep = activeStep === steps.length - 1;

  // Get validation for current step based on role
  const getValidationSchema = useCallback(
    (step, role) => {
      const isModel = role === "model";

      if (isModel) {
        // Model: UserInfo(0), Socials(1), Images(2), Summary(3)
        return validations.model[step] || null;
      }
      // Non-model: UserInfo(0), Images(1), Summary(2)
      return validations.nonModel[step] || null;
    },
    []
  );

  const currentValidation = getValidationSchema(activeStep, currentRole);

  const handleBack = () => setActiveStep(activeStep - 1);

  // Handle going to a specific step (for edit buttons in Summary)
  const handleEditStep = (stepIndex) => {
    setActiveStep(stepIndex);
  };

  const submitForm = async (values, actions) => {
    const auth = getAuth();
    const db = getFirestore();
    const functions = getFunctions();
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      country,
      county,
      postcode,
      twitter,
      facebook,
      instagram,
      headshot,
      profileAvatar,
    } = values;

    // Restrict Admins from creating Super Admins
    if (role === "super admin" && currentUser?.role !== "super admin") {
      alert("Only Super Admins can create another Super Admin.");
      actions.setSubmitting(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Generate unique slug for public profile
      const publicSlug = await generateUniqueSlug(firstName, lastName, db);

      // Prepare user data based on role
      const userData = {
        uid,
        email,
        role,
        firstName,
        lastName,
        publicSlug,
        address1: address1 || "",
        address2: address2 || "",
        city: city || "",
        country: country || "",
        county: county || "",
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || "admin",
      };

      // Add role-specific fields
      if (role === "model") {
        userData.headshot = headshot || "";
        userData.profileAvatar = headshot || ""; // Use headshot as profile avatar for models
        userData.twitter = twitter || "";
        userData.facebook = facebook || "";
        userData.instagram = instagram || "";
        userData.verified = false;
      } else {
        // For non-model users, handle organisation
        if (company && company.trim()) {
          // Get or create organisation
          const organisation = await getOrCreateOrganisation(
            company.trim(),
            {},
            currentUser?.uid || "admin"
          );

          // Store both organisationId (for queries) and companyName (for display)
          userData.organisationId = organisation.id;
          userData.companyName = organisation.companyName;
          userData.company = organisation.companyName; // For backwards compatibility

          // Increment organisation user count
          await updateOrganisationUserCount(organisation.id, 1);
        } else {
          userData.companyName = "";
          userData.company = "";
        }

        userData.profileAvatar = profileAvatar || "";
      }

      // Add postcode only for UK
      if (country === "United Kingdom" && postcode) {
        userData.postcode = postcode;
      }

      // Save user to Firestore
      await setDoc(doc(db, "users", uid), userData);

      // Send welcome email with login details
      try {
        const sendWelcomeEmail = httpsCallable(functions, "sendWelcomeEmail");
        await sendWelcomeEmail({
          email,
          firstName,
          lastName,
          role,
          password, // Include password in welcome email
        });
      } catch (emailError) {
        console.warn("Welcome email could not be sent:", emailError);
        // Don't fail the user creation if email fails
      }

      actions.setSubmitting(false);
      actions.resetForm();
      setActiveStep(0);
      setCurrentRole("");
      alert(`User ${email} created successfully. A welcome email has been sent with login details.`);
    } catch (error) {
      console.error("User creation error:", error);
      alert(`Error: ${error.message}`);
      actions.setSubmitting(false);
    }
  };

  const handleSubmit = (values, actions) => {
    // Update current role from form values
    if (values.role !== currentRole) {
      setCurrentRole(values.role);
    }

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
              {({ values, errors, touched, isSubmitting, setValues, setFieldValue }) => {
                // Update currentRole when role changes
                if (values.role && values.role !== currentRole) {
                  // Use setTimeout to avoid state update during render
                  setTimeout(() => setCurrentRole(values.role), 0);
                }

                const dynamicSteps = getSteps(values.role);

                return (
                  <Form id={formId} autoComplete="off">
                    <Card sx={{ height: "100%" }}>
                      <MDBox mx={2} mt={2}>
                        <Stepper activeStep={activeStep} alternativeLabel>
                          {dynamicSteps.map((label) => (
                            <Step key={label}>
                              <StepLabel>{label}</StepLabel>
                            </Step>
                          ))}
                        </Stepper>
                      </MDBox>
                      <MDBox p={3}>
                        <MDBox>
                          {getStepContent(
                            activeStep,
                            {
                              values,
                              touched,
                              formField,
                              errors,
                              setValues,
                              setFieldValue,
                            },
                            values.role,
                            handleEditStep
                          )}
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
                              {activeStep === dynamicSteps.length - 1 ? "Add User" : "next"}
                            </MDButton>
                          </MDBox>
                        </MDBox>
                      </MDBox>
                    </Card>
                  </Form>
                );
              }}
            </Formik>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default AddUser;
