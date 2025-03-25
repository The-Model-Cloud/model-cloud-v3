import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    case "USD":
      return "$";
    default:
      return currency;
  }
};

function JobInfo({ job }) {
  const currencySymbol = getCurrencySymbol(job.currency);

  return (
    <MDBox>
      <MDTypography variant="h3" fontWeight="bold">
        {job.title}
      </MDTypography>

      <MDBox mt={1}>
        <MDTypography variant="h6" fontWeight="medium">Location</MDTypography>
        <MDTypography variant="body1">{job.location}</MDTypography>
      </MDBox>

      <MDBox mt={2}>
        <MDTypography variant="h6" fontWeight="medium">Budget</MDTypography>
        <MDTypography variant="body1">
          {currencySymbol}{job.budget} ({job.rateType})
        </MDTypography>
      </MDBox>

      <MDBox mt={2}>
        <MDBadge variant="contained" color="info" badgeContent={job.status || "Open"} container />
      </MDBox>

      <MDBox mt={3}>
        <MDTypography variant="h6" fontWeight="medium">Description</MDTypography>
        <MDTypography
          variant="body2"
          color="text"
          component="div"
          dangerouslySetInnerHTML={{ __html: job.description }}
          sx={{
            "& ul, & ol": {
              marginLeft: "30px",
              paddingLeft: "20px",
            },
            "& li": {
              marginBottom: "0.5rem",
            },
          }}
        />

      </MDBox>

      {job.usage && (
        <MDBox mt={3}>
          <MDTypography variant="h6" fontWeight="medium">Usage</MDTypography>
          <MDTypography
            variant="body2"
            color="text"
            component="div"
            dangerouslySetInnerHTML={{ __html: job.usage }}
            sx={{
              "& ul, & ol": {
                marginLeft: "30px",
                paddingLeft: "20px",
              },
              "& li": {
                marginBottom: "0.5rem",
              },
            }}
          />

        </MDBox>
      )}

      <MDBox mt={3}>
        <MDTypography variant="h6" fontWeight="medium">Job Type</MDTypography>
        <MDTypography variant="body1">{job.jobType}</MDTypography>
      </MDBox>

      {job.qty && (
        <MDBox mt={2}>
          <MDTypography variant="h6" fontWeight="medium">Number of Models Required</MDTypography>
          <MDTypography variant="body1">{job.qty}</MDTypography>
        </MDBox>
      )}

      {job.dayDate && job.monthDate && job.yearDate && (
        <MDBox mt={2}>
          <MDTypography variant="h6" fontWeight="medium">Date</MDTypography>
          <MDTypography variant="body1">
            {`${job.dayDate} ${job.monthDate} ${job.yearDate}`}
          </MDTypography>
        </MDBox>
      )}
    </MDBox>
  );
}

export default JobInfo;
