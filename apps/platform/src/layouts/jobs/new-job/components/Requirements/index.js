import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import FormField from "../FormField";

// Import model fields from Measurements
import selectOptions from "components/Profile/Measurements";

function Requirements({ formik }) {
  const { values, handleChange, setFieldValue, touched, errors } = formik;
  const includesAny = (targetList, valuesList) => valuesList.some(g => targetList.includes(g));

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
              label="Minimum Height (cm)"
              name="minHeight"
              value={values.minHeight}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.minHeight && Boolean(errors.minHeight)}
              helperText={touched.minHeight && errors.minHeight}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Max Height (cm)"
              name="maxHeight"
              value={values.maxHeight}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.maxHeight && Boolean(errors.maxHeight)}
              helperText={touched.maxHeight && errors.maxHeight}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Minimum Weight (kg)"
              name="minWeight"
              value={values.minWeight}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.minWeight && Boolean(errors.minWeight)}
              helperText={touched.minWeight && errors.minWeight}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="Max Weight (kg)"
              name="maxWeight"
              value={values.maxWeight}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.maxWeight && Boolean(errors.maxWeight)}
              helperText={touched.maxWeight && errors.maxWeight}
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
          {includesAny(["Woman", "Transwoman", "Other"], values.gender) && (
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
          )}
          {includesAny(["Man", "Transman", "Other"], values.gender) && (
          <Grid item xs={12} sm={3}>
            <FormField
              label="Collar (cm)"
              name="collar"
              value={values.collar}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.collar && Boolean(errors.collar)}
              helperText={touched.collar && errors.collar}
              inputProps={{ type: "number" }}
            />
          </Grid>
          )}
          {includesAny(["Man", "Transman", "Other"], values.gender) && (
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
          )}
          {values.gender.includes("Woman", "Transwoman", "Other") && (
            <Grid item xs={12} sm={3}>
              <Autocomplete
                multiple
                value={values.braSize || []}
                options={selectOptions.braSizes || []}
                onChange={(_, newValue) => setFieldValue("braSize", newValue)}
                renderInput={(params) => (
                  <FormField
                    {...params}
                    label="Bra Size"
                    InputLabelProps={{ shrink: true }}
                    error={touched.braSize && Boolean(errors.braSize)}
                    helperText={touched.braSize && errors.braSize}
                  />
                )}
              />
            </Grid>
          )}
          {values.gender.includes("Woman", "Transwoman", "Other") && (
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
          )}
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
