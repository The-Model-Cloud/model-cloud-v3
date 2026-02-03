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

// prop-type is a library for typechecking of props
import PropTypes from "prop-types";
import * as React from "react";

// @mui material components
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";

// NewUser page components
import FormField from "layouts/pages/users/new-user/components/FormField";
import { Field } from "formik";

// Import countries and cities
import { getCountries, getCities } from "countries-cities";
import ukCounties from "uk-counties-cities-towns";
import stateCities from "state-cities";

function Address({ formData }) {
  const { formField, values, errors, touched, setFieldValue } = formData;
  const { address1, address2, city } = formField;
  const { address1: address1V, address2: address2V, city: cityV } = values;

  const [countryValue, setCountryValue] = React.useState(values.country || "");
  const [countyValue, setCountyValue] = React.useState(values.county || "");
  const [cityOptions, setCityOptions] = React.useState([]);
  const [countyOptions, setCountyOptions] = React.useState([]);

  // Get list of countries
  const countries = React.useMemo(() => {
    try {
      const countryList = getCountries();
      return countryList.sort();
    } catch (e) {
      console.error("Error getting countries:", e);
      return ["United Kingdom", "United States", "Canada", "Australia"];
    }
  }, []);

  // Check if the selected country is UK
  const isUK = countryValue === "United Kingdom";

  // Update county/state options when country changes
  React.useEffect(() => {
    if (!countryValue) {
      setCountyOptions([]);
      setCityOptions([]);
      return;
    }

    if (countryValue === "United Kingdom") {
      // Get UK counties
      try {
        const counties = ukCounties.getCounties ? ukCounties.getCounties() : [];
        setCountyOptions(counties.sort());
      } catch (e) {
        console.error("Error getting UK counties:", e);
        setCountyOptions([]);
      }
    } else if (countryValue === "United States") {
      // Get US states
      try {
        const states = stateCities.getStates ? stateCities.getStates() : [];
        setCountyOptions(states.sort());
      } catch (e) {
        console.error("Error getting US states:", e);
        setCountyOptions([]);
      }
    } else {
      // For other countries, try to get cities/regions
      try {
        const cities = getCities(countryValue) || [];
        setCityOptions(cities.sort());
        setCountyOptions([]);
      } catch (e) {
        console.error("Error getting cities:", e);
        setCityOptions([]);
        setCountyOptions([]);
      }
    }
  }, [countryValue]);

  // Update cities when county/state changes
  React.useEffect(() => {
    if (!countyValue || !countryValue) {
      return;
    }

    if (countryValue === "United Kingdom") {
      try {
        const cities = ukCounties.getCities ? ukCounties.getCities(countyValue) : [];
        setCityOptions(cities ? cities.sort() : []);
      } catch (e) {
        console.error("Error getting UK cities:", e);
        setCityOptions([]);
      }
    } else if (countryValue === "United States") {
      try {
        const cities = stateCities.getCities ? stateCities.getCities(countyValue) : [];
        setCityOptions(cities ? cities.sort() : []);
      } catch (e) {
        console.error("Error getting US cities:", e);
        setCityOptions([]);
      }
    }
  }, [countyValue, countryValue]);

  // Sync country value to form
  React.useEffect(() => {
    if (setFieldValue) {
      setFieldValue("country", countryValue);
    }
  }, [countryValue, setFieldValue]);

  // Sync county value to form
  React.useEffect(() => {
    if (setFieldValue) {
      setFieldValue("county", countyValue);
    }
  }, [countyValue, setFieldValue]);

  return (
    <MDBox>
      <MDTypography variant="h5" fontWeight="bold">
        Address
      </MDTypography>
      <MDBox mt={1.625}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormField
              type={address1.type}
              label={address1.label}
              name={address1.name}
              value={address1V}
              placeholder={address1.placeholder}
              error={errors.address1 && touched.address1}
              success={address1V.length > 0 && !errors.address1}
            />
          </Grid>
          <Grid item xs={12}>
            <MDBox mt={-1.625}>
              <FormField
                type={address2.type}
                label={address2.label}
                name={address2.name}
                value={address2V}
                placeholder={address2.placeholder}
              />
            </MDBox>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={countries}
              value={countryValue}
              onChange={(_, value) => {
                setCountryValue(value || "");
                setCountyValue(""); // Reset county when country changes
              }}
              renderInput={(params) => (
                <Field
                  {...params}
                  as={MDInput}
                  variant="standard"
                  label="Country"
                  fullWidth
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={countyOptions}
              value={countyValue}
              onChange={(_, value) => {
                setCountyValue(value || "");
              }}
              disabled={!countryValue || countyOptions.length === 0}
              renderInput={(params) => (
                <Field
                  {...params}
                  as={MDInput}
                  variant="standard"
                  label={countryValue === "United States" ? "State" : "County"}
                  fullWidth
                />
              )}
            />
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={isUK ? 6 : 12}>
            <Autocomplete
              freeSolo
              options={cityOptions}
              value={cityV || ""}
              onChange={(_, value) => {
                if (setFieldValue) {
                  setFieldValue("city", value || "");
                }
              }}
              onInputChange={(_, newInputValue) => {
                if (setFieldValue) {
                  setFieldValue("city", newInputValue);
                }
              }}
              renderInput={(params) => (
                <FormField
                  {...params}
                  type={city.type}
                  label={city.label}
                  name={city.name}
                  placeholder={city.placeholder}
                  error={errors.city && touched.city}
                  success={cityV && cityV.length > 0 && !errors.city}
                />
              )}
            />
          </Grid>
          {isUK && (
            <Grid item xs={12} sm={6}>
              <FormField
                type="text"
                label="Postcode"
                name="postcode"
                value={values.postcode || ""}
                placeholder="e.g. SW1A 1AA"
                error={errors.postcode && touched.postcode}
                success={values.postcode && values.postcode.length > 0 && !errors.postcode}
                onChange={(e) => setFieldValue && setFieldValue("postcode", e.target.value)}
              />
            </Grid>
          )}
        </Grid>
      </MDBox>
    </MDBox>
  );
}

// typechecking props for Address
Address.propTypes = {
  formData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
};

export default Address;
