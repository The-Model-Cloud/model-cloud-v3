import { useEffect, useState, useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import { getAllOrganisations } from "utils/organisations";

// prop-type is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Grid from "@mui/material/Grid";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// NewUser page components
import FormField from "../FormField";

// Auth context to access the current user role
import { useAuth } from "context/AuthContext";

// Import countries library
import { getCountries } from "countries-cities";

const UserInfo = ({ formData }) => {
  const { values, touched, errors, setFieldValue } = formData;
  const { user } = useAuth(); // current logged-in admin/super admin
  const [userTypeOptions, setUserTypeOptions] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [countryValue, setCountryValue] = useState(values.country || "");

  // Determine if company field should be shown based on role
  const showCompanyField = values.role && values.role !== "model";

  // Get list of countries
  const countries = useMemo(() => {
    try {
      const countryList = getCountries();
      return countryList.sort();
    } catch (e) {
      console.error("Error getting countries:", e);
      return ["United Kingdom", "United States", "Canada", "Australia"];
    }
  }, []);

  // Sync country value to form
  useEffect(() => {
    if (setFieldValue) {
      setFieldValue("country", countryValue);
    }
  }, [countryValue, setFieldValue]);

  useEffect(() => {
    const options = [
      { label: "Model", value: "model" },
      { label: "Client", value: "client" },
      { label: "Account Manager", value: "account manager" },
      { label: "Admin", value: "admin" },
    ];

    if (user?.role === "super admin") {
      options.push({ label: "Super Admin", value: "super admin" });
    }

    setUserTypeOptions(options);
  }, [user]);

  // Fetch existing organisations for autocomplete
  useEffect(() => {
    const fetchOrganisations = async () => {
      setLoadingOrgs(true);
      try {
        // Fetch all organisations from organisations collection
        const allOrgs = await getAllOrganisations();

        // Extract company names for autocomplete
        const orgNames = allOrgs.map((org) => org.companyName);

        setOrganisations(orgNames);
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchOrganisations();
  }, []);

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
              onChange={(_, newValue) => {
                setFieldValue("role", newValue ? newValue.value : "");
                // Clear company if switching to model
                if (newValue?.value === "model") {
                  setFieldValue("company", "");
                }
              }}
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
          {showCompanyField && (
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={organisations}
                loading={loadingOrgs}
                value={values.company || ""}
                onChange={(_, newValue) => {
                  setFieldValue("company", newValue || "");
                }}
                onInputChange={(_, newInputValue) => {
                  setFieldValue("company", newInputValue);
                }}
                renderInput={(params) => (
                  <FormField
                    {...params}
                    label="Company"
                    name="company"
                    error={errors.company && touched.company}
                    helperText={touched.company && errors.company}
                    placeholder="Select existing or enter new company"
                  />
                )}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={showCompanyField ? 6 : 12}>
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
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={countries}
              value={countryValue}
              onChange={(_, value) => {
                setCountryValue(value || "");
              }}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Country"
                  name="country"
                  error={touched.country && Boolean(errors.country)}
                  helperText={touched.country && errors.country}
                />
              )}
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
