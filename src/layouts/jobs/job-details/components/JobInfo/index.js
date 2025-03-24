import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

function JobInfo({ job }) {
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
        <MDTypography variant="body1">{job.budget} {job.currency}</MDTypography>
      </MDBox>
      <MDBox mt={2}>
        <MDBadge variant="contained" color="info" badgeContent={job.status || "Open"} container />
      </MDBox>
      <MDBox mt={3}>
        <MDTypography variant="h6">Description</MDTypography>
        <MDTypography variant="body2" color="text">{job.description}</MDTypography>
      </MDBox>
    </MDBox>
  );
}

export default JobInfo;
