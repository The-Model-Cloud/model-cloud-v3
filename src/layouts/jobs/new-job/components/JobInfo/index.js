import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import FormikTiptap from "components/FormikTiptap";
import FormField from "../FormField";

import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

function JobInfo({ formik }) {
  const { values, handleChange, setFieldValue, touched, errors } = formik;
  const currentDay = (new Date().getDate()).toString(); // "1" to "31"
  const currentMonth = new Date().toLocaleString("default", { month: "long" }); // e.g., "March"
  const currentYear = new Date().getFullYear();
  const futureYears = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());


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
            <FormField
              type="text"
              label="Job Location"
              name="location"
              placeholder="e.g., London, UK"
              value={values.location}
              onChange={handleChange}
              error={touched.location && Boolean(errors.location)}
              helperText={touched.location && errors.location}
            />
          </Grid>
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
