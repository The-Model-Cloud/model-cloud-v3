import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import FormField from "../FormField";

function Payment() {
  return (
    <MDBox>
      <MDTypography variant="h5">Payment Details</MDTypography>
      <MDBox mt={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <FormField type="text" label="Budget"
              InputLabelProps={{ shrink: true }} placeholder="e.g., 500.00" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              defaultValue="GBP"
              options={["GBP", "EUR", "USD"]}
              InputLabelProps={{ shrink: true }}
              renderInput={(params) => <MDInput {...params}
                variant="standard"
                InputLabelProps={{ shrink: true }}
                label="Currency"
              />}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              defaultValue="Flat Fee"
              options={["Flat Fee", "Hourly", "Per Day"]}
              renderInput={(params) => <MDInput {...params}
                variant="standard"
                InputLabelProps={{ shrink: true }}
                label="Rate Type"
              />}
            />
          </Grid>
        </Grid>
      </MDBox>
    </MDBox>
  );
}

export default Payment;
