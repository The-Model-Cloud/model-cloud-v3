import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";

// prop-type is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// NewUser page components
import FormField from "../FormField";

// Auth context to access the current user role
import { useAuth } from "context/AuthContext";

const UserInfo = ({ formData }) => {
  const { values, touched, errors, setFieldValue } = formData;
  const { user } = useAuth(); // current logged-in admin/super admin
  const [userTypeOptions, setUserTypeOptions] = useState([]);

  useEffect(() => {
    const options = [
      { label: "Model", value: "model" },
      { label: "Client", value: "client" },
      { label: "Admin", value: "admin" },
    ];

    if (user?.role === "super admin") {
      options.push({ label: "Super Admin", value: "super admin" });
    }

    setUserTypeOptions(options);
  }, [user]);

  return (
    <MDBox>
      <MDBox lineHeight={0}>
        <MDTypography variant="h5">Add New User</MDTypography>
        <MDTypography variant="button" color="text">
          Let's get going with your new user
        </MDTypography>
      </MDBox>
      <MDBox mt={1.625}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <FormField
              label="First Name"
              name="firstName"
              value={values.firstName}
              error={touched.firstName && Boolean(errors.firstName)}
              helperText={touched.firstName && errors.firstName}
              onChange={(e) => setFieldValue("firstName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField
              label="Last Name"
              name="lastName"
              value={values.lastName}
              error={errors.lastName && touched.lastName}
              helperText={touched.lastName && errors.lastName}
              onChange={(e) => setFieldValue("lastName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={userTypeOptions}
              getOptionLabel={(option) => option.label}
              value={userTypeOptions.find((opt) => opt.value === values.role) || null}
              onChange={(_, newValue) =>
                setFieldValue("role", newValue ? newValue.value : "")
              }
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="User Role"
                  error={touched.role && Boolean(errors.role)}
                  helperText={touched.role && errors.role}
                />
              )}
            />
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Company"
              name="company"
              value={values.company}
              error={errors.company && touched.company}
              helperText={touched.company && errors.company}
              onChange={(e) => setFieldValue("company", e.target.value)}

            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              type="email"
              label="Email"
              name="email"
              value={values.email}
              error={touched.email && Boolean(errors.email)}
              helperText={touched.email && errors.email}
              onChange={(e) => setFieldValue("email", e.target.value)}
            />
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              type="password"
              label="Password"
              name="password"
              value={values.password}
              error={touched.password && Boolean(errors.password)}
              helperText={touched.password && errors.password}
              onChange={(e) => setFieldValue("password", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              type="password"
              label="Repeat Password"
              name="repeatPassword"
              value={values.repeatPassword}
              error={touched.repeatPassword && Boolean(errors.repeatPassword)}
              helperText={touched.repeatPassword && errors.repeatPassword}
              onChange={(e) => setFieldValue("repeatPassword", e.target.value)}
            />
          </Grid>
        </Grid>
      </MDBox>
    </MDBox>
  );
}

// typechecking props for UserInfo
UserInfo.propTypes = {
  formData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
};

export default UserInfo;
