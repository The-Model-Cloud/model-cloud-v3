/**
 * UpcomingJobs - Shows upcoming scheduled jobs for the organisation
 */

import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function UpcomingJobs({ jobs, loading }) {
  const navigate = useNavigate();

  const formatJobDate = (dates) => {
    if (!dates || dates.length === 0) return "TBD";
    const date = dates[0]?.toDate ? dates[0].toDate() : new Date(dates[0]);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / 86400000);

    const formattedDate = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    if (diffDays === 0) return { date: formattedDate, label: "Today", color: "error" };
    if (diffDays === 1) return { date: formattedDate, label: "Tomorrow", color: "warning" };
    if (diffDays <= 7) return { date: formattedDate, label: `${diffDays} days`, color: "info" };
    return { date: formattedDate, label: `${diffDays} days`, color: "default" };
  };

  const getLocationString = (job) => {
    const parts = [];
    if (job.city) parts.push(job.city);
    if (job.county) parts.push(job.county);
    if (parts.length === 0 && job.country) parts.push(job.country);
    return parts.join(", ") || "Location TBD";
  };

  if (loading) {
    return (
      <Card sx={{ height: "100%" }}>
        <MDBox p={3}>
          <Skeleton width={150} height={28} />
          <MDBox mt={2}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MDBox key={i} mb={2}>
                <Skeleton width="100%" height={60} />
              </MDBox>
            ))}
          </MDBox>
        </MDBox>
      </Card>
    );
  }

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDBox display="flex" alignItems="center">
            <MDBox
              width="3rem"
              height="3rem"
              bgColor="success"
              variant="gradient"
              borderRadius="lg"
              display="flex"
              justifyContent="center"
              alignItems="center"
              color="white"
              mr={2}
            >
              <Icon>event</Icon>
            </MDBox>
            <MDTypography variant="h6" fontWeight="medium">
              Upcoming Jobs
            </MDTypography>
          </MDBox>
          <MDButton
            variant="text"
            color="success"
            size="small"
            onClick={() => navigate("/jobs/my-jobs")}
          >
            View All
          </MDButton>
        </MDBox>

        {jobs.length === 0 ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 1 }}>event_busy</Icon>
            <MDTypography variant="body2" color="text">
              No upcoming jobs scheduled
            </MDTypography>
          </MDBox>
        ) : (
          <MDBox>
            {jobs.map((job, index) => {
              const dateInfo = formatJobDate(job.dates);
              return (
                <MDBox key={job.id}>
                  <MDBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    py={1.5}
                    sx={{ cursor: "pointer", "&:hover": { bgcolor: "grey.50" }, borderRadius: 1, px: 1 }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <MDBox display="flex" alignItems="center" flex={1}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: `${dateInfo.color}.main`,
                          mr: 1.5,
                          fontSize: "0.875rem",
                        }}
                      >
                        <Icon sx={{ fontSize: 20 }}>calendar_today</Icon>
                      </Avatar>
                      <MDBox>
                        <MDTypography variant="button" fontWeight="medium" display="block">
                          {job.title || "Untitled Job"}
                        </MDTypography>
                        <MDTypography variant="caption" color="text">
                          {dateInfo.date} &bull; {getLocationString(job)}
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                    <Chip
                      label={dateInfo.label}
                      size="small"
                      color={dateInfo.color}
                      sx={{ minWidth: 60 }}
                    />
                  </MDBox>
                  {index < jobs.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </MDBox>
              );
            })}
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

UpcomingJobs.propTypes = {
  jobs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      dates: PropTypes.array,
      city: PropTypes.string,
      county: PropTypes.string,
      country: PropTypes.string,
    })
  ).isRequired,
  loading: PropTypes.bool,
};

UpcomingJobs.defaultProps = {
  loading: false,
};

export default UpcomingJobs;
