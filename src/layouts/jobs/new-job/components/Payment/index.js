import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import FormField from "../FormField";

function Payment({ formik }) {
  const { values, handleChange, setFieldValue, touched, errors } = formik;
  return (
    <MDBox>
      <MDTypography variant="h5">Payment Details</MDTypography>
      <MDBox mt={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <FormField
              label="Budget"
              name="budget"
              value={values.budget}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              error={touched.budget && Boolean(errors.budget)}
              helperText={touched.budget && errors.budget}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={["GBP", "EUR", "USD"]}
              value={values.currency}
              onChange={(_, newValue) => setFieldValue("currency", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Currency"
                  InputLabelProps={{ shrink: true }}
                  error={touched.currency && Boolean(errors.currency)}
                  helperText={touched.currency && errors.currency}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={["Flat Fee", "Hourly", "Per Day"]}
              value={values.rateType}
              onChange={(_, newValue) => setFieldValue("rateType", newValue)}
              renderInput={(params) => (
                <FormField
                  {...params}
                  label="Rate Type"
                  InputLabelProps={{ shrink: true }}
                  error={touched.rateType && Boolean(errors.rateType)}
                  helperText={touched.rateType && errors.rateType}
                />
              )}
            />
          </Grid>
        </Grid>
      </MDBox>
    </MDBox>
  );
}

export default Payment;
