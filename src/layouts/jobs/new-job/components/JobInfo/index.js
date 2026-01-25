import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import FormikTiptap from "components/FormikTiptap";
import FormField from "../FormField";

import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

// Import countries and cities
import { getCountries, getCities } from "countries-cities";
import ukCounties from "uk-counties-cities-towns";
import stateCities from "state-cities";

function JobInfo({ formik }) {
  const { values, handleChange, setFieldValue, touched, errors } = formik;
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const currentDay = (new Date().getDate()).toString(); // "1" to "31"
  const currentMonth = new Date().toLocaleString("default", { month: "long" }); // e.g., "March"
  const currentYear = new Date().getFullYear();
  const futureYears = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());

  // Load countries on mount
  useEffect(() => {
    const allCountries = getCountries();
    const priorityCountries = ["United Kingdom", "Italy", "Spain", "France", "Germany", "United States"];
    const sortedOthers = allCountries
      .filter((c) => !priorityCountries.includes(c))
      .sort((a, b) => a.localeCompare(b));
    setCountries([...priorityCountries, "────────", ...sortedOthers]);
  }, []);

  // Load cities when country/county/state changes
  useEffect(() => {
    if (values.country === "United Kingdom" && values.county) {
      setCities(ukCounties[values.county] || []);
    } else if (values.country === "United States" && values.state) {
      setCities((stateCities.getCities(values.state) || []).sort((a, b) => a.localeCompare(b)));
    } else if (values.country && values.country !== "United Kingdom" && values.country !== "United States") {
      setCities((getCities(values.country) || []).sort((a, b) => a.localeCompare(b)));
    }
  }, [values.country, values.county, values.state]);

  const handleCountryChange = (event, value) => {
    if (!value || value === "────────") {
      setFieldValue("country", "");
      setFieldValue("county", "");
      setFieldValue("state", "");
      setFieldValue("city", "");
      setCities([]);
      return;
    }

    setFieldValue("country", value);
    setFieldValue("county", "");
    setFieldValue("state", "");
    setFieldValue("city", "");

    if (value === "United Kingdom" || value === "United States") {
      setCities([]);
    } else {
      setCities((getCities(value) || []).sort((a, b) => a.localeCompare(b)));
    }
  };

  const handleCountyChange = (event, value) => {
    setFieldValue("county", value || "");
    setFieldValue("city", "");
    setCities(ukCounties[value] || []);
  };

  const handleStateChange = (event, value) => {
    setFieldValue("state", value || "");
    setFieldValue("city", "");
    setCities((stateCities.getCities(value) || []).sort((a, b) => a.localeCompare(b)));
  };

  const handleCityChange = (event, value) => {
    setFieldValue("city", value || "");
  };

  return (
    <MDBox>
      <MDTypography variant="h5">Job Information</MDTypography>
      <MDBox mb={1} ml={0.5}>
        <MDTypography component="label" variant="button" fontWeight="regular" color="text">
          Please provide details about the job you are posting
        </MDTypography>
      </MDBox>

      <MDBox mt={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              type="text"
              label="Job Title"
              name="title"
              value={values.title}
              onChange={handleChange}
              error={touched.title && Boolean(errors.title)}
              helperText={touched.title && errors.title}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              value={values.country || ""}
              options={countries}
              onChange={handleCountryChange}
              getOptionDisabled={(option) => option === "────────"}
              renderOption={(props, option) =>
                option === "────────" ? (
                  <li {...props} style={{ fontStyle: "italic", opacity: 0.5 }}>
                    ────────
                  </li>
                ) : (
                  <li {...props}>{option}</li>
                )
              }
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Country"
                  InputLabelProps={{ shrink: true }}
                  error={touched.country && Boolean(errors.country)}
                  helperText={touched.country && errors.country}
                />
              )}
            />
          </Grid>

          {values.country === "United Kingdom" && (
            <>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  value={values.county || ""}
                  options={Object.keys(ukCounties)}
                  onChange={handleCountyChange}
                  renderInput={(params) => (
                    <FormField
                      {...params}
                      label="County"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  value={values.city || ""}
                  options={cities}
                  onChange={handleCityChange}
                  renderInput={(params) => (
                    <FormField
                      {...params}
                      label="City/Town"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          {values.country === "United States" && (
            <>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  value={values.state || ""}
                  options={stateCities.getStates().sort((a, b) => a.localeCompare(b))}
                  onChange={handleStateChange}
                  renderInput={(params) => (
                    <FormField
                      {...params}
                      label="State"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  value={values.city || ""}
                  options={cities}
                  onChange={handleCityChange}
                  renderInput={(params) => (
                    <FormField
                      {...params}
                      label="City"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
            </>
          )}

          {values.country && values.country !== "United Kingdom" && values.country !== "United States" && (
            <Grid item xs={12} sm={6}>
              <Autocomplete
                value={values.city || ""}
                options={cities}
                onChange={handleCityChange}
                renderInput={(params) => (
                  <FormField
                    {...params}
                    label="City"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={4}>
            <Autocomplete
              multiple
              options={selectData.jobType}
              value={values.jobType || []}
              onChange={(_, newValue) => setFieldValue("jobType", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Job Type"
                  error={touched.jobType && Boolean(errors.jobType)}
                  helperText={touched.jobType && errors.jobType}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={2}>
            <Autocomplete
              options={selectData.qty}
              value={values.qty || []}
              onChange={(_, newValue) => setFieldValue("qty", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Number of Models"
                  error={touched.qty && Boolean(errors.qty)}
                  helperText={touched.qty && errors.qty}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              multiple
              options={selectData.gender}
              value={values.gender || []}
              onChange={(_, newValue) => setFieldValue("gender", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Preferred Gender"
                  error={touched.gender && Boolean(errors.gender)}
                  helperText={touched.gender && errors.gender}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}><Autocomplete
                value={values.dayDate || currentDay}
                options={selectData.days}
                onChange={(_, newValue) => setFieldValue("dayDate", newValue)}
                renderInput={(params) => (
                  <FormField {...params}
                    label="Date of Job"
                    InputLabelProps={{ shrink: true }} />
                )}
              />
              </Grid>
              <Grid item xs={12} sm={5}>
                <Autocomplete
                  value={values.monthDate || currentMonth}
                  options={selectData.birthDate}
                  onChange={(_, newValue) => setFieldValue("monthDate", newValue)}
                  renderInput={(params) => (
                    <FormField
                      {...params}
                      label="Month"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  value={values.yearDate || currentYear.toString()}
                  options={futureYears}
                  onChange={(_, newValue) => setFieldValue("yearDate", newValue)}
                  renderInput={(params) => (
                    <FormField
                      {...params}
                      label="Year"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />

              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MDBox>

      <MDBox mt={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <MDBox mb={1} ml={0.5} lineHeight={0}>
              <MDTypography component="label" variant="button" fontWeight="regular" color="text">
                Job Description
              </MDTypography>
            </MDBox>
            <FormikTiptap name="description" label="Job Description" />
          </Grid>
        </Grid>
      </MDBox>

      <MDBox mt={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <MDBox mb={1} ml={0.5} lineHeight={0}>
              <MDTypography component="label" variant="button" fontWeight="regular" color="text">
                Job Usage
              </MDTypography>
            </MDBox>
            <FormikTiptap name="usage" label="Job Usage" />
          </Grid>
        </Grid>
      </MDBox>
    </MDBox>
  );
}

export default JobInfo;
