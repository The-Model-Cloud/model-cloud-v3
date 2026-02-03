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

import form from "./form";

const {
  formField: {
    firstName,
    lastName,
    role,
    company,
    email,
    password,
    repeatPassword,
    address1,
    address2,
    country,
    county,
    city,
    postcode,
    twitter,
    facebook,
    instagram,
    headshot,
    profileAvatar,
  },
} = form;

const initialValues = {
  [firstName.name]: "",
  [lastName.name]: "",
  [role.name]: "",
  [company.name]: "",
  [email.name]: "",
  [password.name]: "",
  [repeatPassword.name]: "",
  [address1.name]: "",
  [address2.name]: "",
  [country.name]: "",
  [county.name]: "",
  [city.name]: "",
  [postcode.name]: "",
  [twitter.name]: "",
  [facebook.name]: "",
  [instagram.name]: "",
  [headshot.name]: "",
  [profileAvatar.name]: "",
};

export default initialValues;
