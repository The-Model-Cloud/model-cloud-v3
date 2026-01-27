import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function MyJobFilters({ filters, setFilters, jobCounts }) {
  const jobTypeOptions = [
    { value: "all", label: "All Jobs", icon: "folder" },
    { value: "owned", label: "My Listings", icon: "business_center" },
    { value: "applied", label: "Applied To", icon: "send" },
  ];

  const jobStatusOptions = [
    { value: "all", label: "All Status", icon: "list" },
    { value: "open", label: "Open", icon: "lock_open", color: "success" },
    { value: "closed", label: "Closed", icon: "lock", color: "error" },
  ];

  const applicationStatusOptions = [
    { value: "all", label: "All", icon: "list" },
    { value: "pending", label: "Pending", icon: "schedule", color: "warning" },
    { value: "accepted", label: "Accepted", icon: "check_circle", color: "success" },
    { value: "rejected", label: "Rejected", icon: "cancel", color: "error" },
  ];

  const handleJobTypeChange = (value) => {
    setFilters(prev => ({ ...prev, jobType: value }));
  };

  const handleJobStatusChange = (value) => {
    setFilters(prev => ({ ...prev, jobStatus: value }));
  };

  const handleApplicationStatusChange = (value) => {
    setFilters(prev => ({ ...prev, applicationStatus: value }));
  };

  return (
    <Card sx={{ p: 3 }}>
      <MDBox mb={2}>
        <MDTypography variant="h6" fontWeight="medium" color="dark">
          Filter Your Jobs
        </MDTypography>
        <MDTypography variant="body2" color="text">
          View jobs you've created or applied to
        </MDTypography>
      </MDBox>

      <Grid container spacing={3}>
        {/* Job Type Filter */}
        <Grid item xs={12} md={4}>
          <MDTypography variant="caption" fontWeight="medium" color="text" mb={1} display="block">
            Job Type
          </MDTypography>
          <MDBox display="flex" flexWrap="wrap" gap={1}>
            {jobTypeOptions.map((option) => (
              <Chip
                key={option.value}
                label={
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon sx={{ fontSize: "1rem" }}>{option.icon}</Icon>
                    {option.label}
                    {jobCounts && option.value !== "all" && (
                      <MDBox
                        component="span"
                        sx={{
                          backgroundColor: "rgba(0,0,0,0.1)",
                          borderRadius: "10px",
                          px: 0.75,
                          py: 0.25,
                          fontSize: "0.65rem",
                          fontWeight: 600,
                        }}
                      >
                        {option.value === "owned" ? jobCounts.owned : jobCounts.applied}
                      </MDBox>
                    )}
                  </MDBox>
                }
                onClick={() => handleJobTypeChange(option.value)}
                sx={{
                  backgroundColor: filters.jobType === option.value ? "info.main" : "grey.200",
                  color: filters.jobType === option.value ? "white" : "text.primary",
                  fontWeight: 500,
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: filters.jobType === option.value ? "info.dark" : "grey.300",
                  },
                }}
              />
            ))}
          </MDBox>
        </Grid>

        {/* Job Status Filter */}
        <Grid item xs={12} md={4}>
          <MDTypography variant="caption" fontWeight="medium" color="text" mb={1} display="block">
            Job Status
          </MDTypography>
          <MDBox display="flex" flexWrap="wrap" gap={1}>
            {jobStatusOptions.map((option) => (
              <Chip
                key={option.value}
                label={
                  <MDBox display="flex" alignItems="center" gap={0.5}>
                    <Icon sx={{ fontSize: "1rem" }}>{option.icon}</Icon>
                    {option.label}
                  </MDBox>
                }
                onClick={() => handleJobStatusChange(option.value)}
                sx={{
                  backgroundColor: filters.jobStatus === option.value
                    ? option.color ? `${option.color}.main` : "info.main"
                    : "grey.200",
                  color: filters.jobStatus === option.value ? "white" : "text.primary",
                  fontWeight: 500,
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: filters.jobStatus === option.value
                      ? option.color ? `${option.color}.dark` : "info.dark"
                      : "grey.300",
                  },
                }}
              />
            ))}
          </MDBox>
        </Grid>

        {/* Application Status Filter - only show when viewing applied jobs */}
        {filters.jobType !== "owned" && (
          <Grid item xs={12} md={4}>
            <MDTypography variant="caption" fontWeight="medium" color="text" mb={1} display="block">
              Application Status
            </MDTypography>
            <MDBox display="flex" flexWrap="wrap" gap={1}>
              {applicationStatusOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={
                    <MDBox display="flex" alignItems="center" gap={0.5}>
                      <Icon sx={{ fontSize: "1rem" }}>{option.icon}</Icon>
                      {option.label}
                    </MDBox>
                  }
                  onClick={() => handleApplicationStatusChange(option.value)}
                  sx={{
                    backgroundColor: filters.applicationStatus === option.value
                      ? option.color ? `${option.color}.main` : "info.main"
                      : "grey.200",
                    color: filters.applicationStatus === option.value ? "white" : "text.primary",
                    fontWeight: 500,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: filters.applicationStatus === option.value
                        ? option.color ? `${option.color}.dark` : "info.dark"
                        : "grey.300",
                    },
                  }}
                />
              ))}
            </MDBox>
          </Grid>
        )}
      </Grid>
    </Card>
  );
}

export default MyJobFilters;
