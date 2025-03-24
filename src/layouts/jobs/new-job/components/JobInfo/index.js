import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import FormikTiptap from "components/FormikTiptap";
import FormField from "../FormField";

import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

function JobInfo({ formik }) {
  const { values, handleChange, setFieldValue, touched, errors } = formik;

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
          <Grid item xs={12} sm={4}>
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

          <Grid item xs={12} sm={4}>
            <FormField
              type="text"
              label="Location"
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
              options={selectData.gender}
              value={values.gender || []}
              onChange={(_, newValue) => setFieldValue("gender", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Preferred Gender"
                  InputLabelProps={{ shrink: true }}
                  error={touched.gender && Boolean(errors.gender)}
                  helperText={touched.gender && errors.gender}
                />
              )}
            />
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
    </MDBox>
  );
}

export default JobInfo;
