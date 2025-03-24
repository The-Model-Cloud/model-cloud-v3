import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import FormField from "../FormField";

// Import model fields from Measurements
import selectOptions from "components/Profile/Measurements";

function Requirements({ formik }) {
  const { values, handleChange, setFieldValue, touched, errors } = formik;

  return (
    <MDBox>
      <MDTypography variant="h5">Model Requirements</MDTypography>
      <MDBox mb={1} ml={0.5}>
        <MDTypography component="label" variant="button" fontWeight="regular" color="text">
          Please provide details about the model you are looking for, you don't have to fill in all fields
        </MDTypography>
      </MDBox>
      <MDBox mt={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Height (cm)"
              name="height"
              value={values.height}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.height && Boolean(errors.height)}
              helperText={touched.height && errors.height}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Weight (kg)"
              name="weight"
              value={values.weight}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.weight && Boolean(errors.weight)}
              helperText={touched.weight && errors.weight}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Waist (cm)"
              name="waist"
              value={values.waist}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.waist && Boolean(errors.waist)}
              helperText={touched.waist && errors.waist}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Hips (cm)"
              name="hips"
              value={values.hips}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.hips && Boolean(errors.hips)}
              helperText={touched.hips && errors.hips}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Chest (cm)"
              name="chest"
              value={values.chest}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.chest && Boolean(errors.chest)}
              helperText={touched.chest && errors.chest}
              inputProps={{ type: "number" }}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Autocomplete
              multiple
              value={values.dressSize || []}
              options={selectOptions.dressSizes || []}
              onChange={(_, newValue) => setFieldValue("dressSize", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Dress Size (UK)"
                  InputLabelProps={{ shrink: true }}
                  error={touched.dressSize && Boolean(errors.dressSize)}
                  helperText={touched.dressSize && errors.dressSize}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Autocomplete
              multiple
              value={values.shoeSize || []}
              options={selectOptions.shoeSizes || []}
              onChange={(_, newValue) => setFieldValue("shoeSize", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Shoe Size (UK)"
                  InputLabelProps={{ shrink: true }}
                  error={touched.shoeSize && Boolean(errors.shoeSize)}
                  helperText={touched.shoeSize && errors.shoeSize}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Autocomplete
              multiple
              value={values.eyeColour || []}
              options={selectOptions.eyeColours || []}
              onChange={(_, newValue) => setFieldValue("eyeColour", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Eye Colour"
                  InputLabelProps={{ shrink: true }}
                  error={touched.eyeColour && Boolean(errors.eyeColour)}
                  helperText={touched.eyeColour && errors.eyeColour}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Autocomplete
              multiple
              value={values.hairColour || []}
              options={selectOptions.hairColours || []}
              onChange={(_, newValue) => setFieldValue("hairColour", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Hair Colour"
                  InputLabelProps={{ shrink: true }}
                  error={touched.hairColour && Boolean(errors.hairColour)}
                  helperText={touched.hairColour && errors.hairColour}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Autocomplete
              multiple
              value={values.categories || []}
              options={selectOptions.skills || []} // Multiple select for skills
              onChange={(_, newValue) => setFieldValue("categories", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Categories"
                  InputLabelProps={{ shrink: true }}
                  error={touched.categories && Boolean(errors.categories)}
                  helperText={touched.categories && errors.categories}
                />
              )}
            />
          </Grid>

        </Grid>
      </MDBox>
    </MDBox>
  );
}
console.log("selectOptions.skills:", selectOptions.skills);

export default Requirements;
