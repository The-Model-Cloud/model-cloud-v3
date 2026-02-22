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

import * as Yup from "yup";
import form from "./form";

const {
  formField: {
    firstName,
    lastName,
    role,
    email,
    password,
    repeatPassword,
    country,
  },
} = form;

// Common validation for User Info step (step 0 for all users)
// Country is now included here since Address step was removed
const userInfoValidation = Yup.object().shape({
  [firstName.name]: Yup.string().required(firstName.errorMsg),
  [lastName.name]: Yup.string().required(lastName.errorMsg),
  [role.name]: Yup.string().required(role.errorMsg),
  [email.name]: Yup.string().required(email.errorMsg).email(email.invalidMsg),
  [password.name]: Yup.string().required(password.errorMsg).min(6, password.invalidMsg),
  [repeatPassword.name]: Yup.string()
    .required(repeatPassword.errorMsg)
    .oneOf([Yup.ref("password"), null], repeatPassword.invalidMsg),
  [country.name]: Yup.string().required(country.errorMsg),
});

// Socials validation for models (step 2 for models)
const socialsValidation = Yup.object().shape({
  // Socials are optional now
});

// Images validation (step 3 for models, step 2 for non-models)
const imagesValidation = Yup.object().shape({
  // Images are optional
});

// Summary validation (final step - no validation needed)
const summaryValidation = Yup.object().shape({});

// Validation schemas organized by user type
// Model steps: UserInfo(0), Socials(1), Images(2), Summary(3)
// Non-model steps: UserInfo(0), Images(1), Summary(2)
const validations = {
  model: [
    userInfoValidation,    // Step 0: User Info (includes Country)
    socialsValidation,     // Step 1: Socials
    imagesValidation,      // Step 2: Images
    summaryValidation,     // Step 3: Summary
  ],
  nonModel: [
    userInfoValidation,    // Step 0: User Info (includes Country)
    imagesValidation,      // Step 1: Images
    summaryValidation,     // Step 2: Summary
  ],
};

export default validations;
