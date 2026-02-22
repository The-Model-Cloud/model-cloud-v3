/**
 * RecentJobs - Shows recent job activity across the platform
 */

import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function RecentJobs({ jobs, loading }) {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "success";
      case "awarded":
        return "info";
      case "completed":
        return "primary";
      case "closed":
        return "default";
      case "paid":
        return "warning";
      default:
        return "default";
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const formatCurrency = (amount) => {
    if (!amount) return "";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
              bgColor="primary"
              variant="gradient"
              borderRadius="lg"
              display="flex"
              justifyContent="center"
              alignItems="center"
              color="white"
              mr={2}
            >
              <Icon>history</Icon>
            </MDBox>
            <MDTypography variant="h6" fontWeight="medium">
              Recent Jobs
            </MDTypography>
          </MDBox>
          <MDButton
            variant="text"
            color="primary"
            size="small"
            onClick={() => navigate("/jobs/search")}
          >
            View All
          </MDButton>
        </MDBox>

        {jobs.length === 0 ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 1 }}>work_off</Icon>
            <MDTypography variant="body2" color="text">
              No jobs created yet
            </MDTypography>
          </MDBox>
        ) : (
          <MDBox>
            {jobs.slice(0, 8).map((job, index) => (
              <MDBox key={job.id}>
                <MDBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  py={1.5}
                  sx={{ cursor: "pointer", "&:hover": { bgcolor: "grey.50" }, borderRadius: 1, px: 1 }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <MDBox flex={1}>
                    <MDTypography variant="button" fontWeight="medium" display="block">
                      {job.title || "Untitled Job"}
                    </MDTypography>
                    <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <MDTypography variant="caption" color="text">
                        {job.reference || job.id.slice(0, 8)}
                      </MDTypography>
                      <MDTypography variant="caption" color="text">
                        &bull; {formatTimeAgo(job.createdAt)}
                      </MDTypography>
                      {job.agreedAmount && (
                        <MDTypography variant="caption" color="success" fontWeight="medium">
                          {formatCurrency(job.agreedAmount)}
                        </MDTypography>
                      )}
                    </MDBox>
                  </MDBox>
                  <Chip
                    label={job.status || "draft"}
                    size="small"
                    color={getStatusColor(job.status)}
                    sx={{ textTransform: "capitalize", minWidth: 70 }}
                  />
                </MDBox>
                {index < Math.min(jobs.length, 8) - 1 && <Divider sx={{ my: 0.5 }} />}
              </MDBox>
            ))}
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

RecentJobs.propTypes = {
  jobs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      status: PropTypes.string,
      reference: PropTypes.string,
      createdAt: PropTypes.any,
      agreedAmount: PropTypes.number,
    })
  ).isRequired,
  loading: PropTypes.bool,
};

RecentJobs.defaultProps = {
  loading: false,
};

export default RecentJobs;
