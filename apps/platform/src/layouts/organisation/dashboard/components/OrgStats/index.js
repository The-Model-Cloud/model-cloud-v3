/**
 * OrgStats - Key metrics cards for organisation dashboard
 */

import PropTypes from "prop-types";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard components
import MDBox from "components/MDBox";

// Statistics cards
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

function OrgStats({ stats, loading }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid item xs={12} sm={6} lg={4} xl={2} key={i}>
            <MDBox mb={1.5}>
              <Skeleton variant="rounded" height={100} />
            </MDBox>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Total Jobs */}
      <Grid item xs={12} sm={6} lg={4} xl={2}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="primary"
            icon="work"
            title="Total Jobs"
            count={stats.totalJobs}
            percentage={{
              color: "info",
              amount: "",
              label: "All time bookings",
            }}
          />
        </MDBox>
      </Grid>

      {/* Active Jobs */}
      <Grid item xs={12} sm={6} lg={4} xl={2}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="success"
            icon="pending_actions"
            title="Active Jobs"
            count={stats.activeJobs}
            percentage={{
              color: "success",
              amount: "",
              label: "In progress",
            }}
          />
        </MDBox>
      </Grid>

      {/* Completed Jobs */}
      <Grid item xs={12} sm={6} lg={4} xl={2}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="info"
            icon="check_circle"
            title="Completed"
            count={stats.completedJobs}
            percentage={{
              color: "info",
              amount: "",
              label: "Successfully finished",
            }}
          />
        </MDBox>
      </Grid>

      {/* Total Spend */}
      <Grid item xs={12} sm={6} lg={4} xl={2}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="warning"
            icon="payments"
            title="Total Spend"
            count={formatCurrency(stats.totalSpend)}
            percentage={{
              color: "warning",
              amount: "",
              label: "All time spend",
            }}
          />
        </MDBox>
      </Grid>

      {/* Team Members */}
      <Grid item xs={12} sm={6} lg={4} xl={2}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="dark"
            icon="groups"
            title="Team Members"
            count={stats.memberCount}
            percentage={{
              color: "dark",
              amount: stats.teamCount > 0 ? `${stats.teamCount} teams` : "",
              label: stats.teamCount > 0 ? "" : "In your organisation",
            }}
          />
        </MDBox>
      </Grid>

      {/* Models Booked */}
      <Grid item xs={12} sm={6} lg={4} xl={2}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="secondary"
            icon="person_search"
            title="Models Booked"
            count={stats.modelsBooked}
            percentage={{
              color: "secondary",
              amount: "",
              label: "Unique models used",
            }}
          />
        </MDBox>
      </Grid>
    </Grid>
  );
}

OrgStats.propTypes = {
  stats: PropTypes.shape({
    totalJobs: PropTypes.number,
    activeJobs: PropTypes.number,
    completedJobs: PropTypes.number,
    totalSpend: PropTypes.number,
    teamCount: PropTypes.number,
    memberCount: PropTypes.number,
    modelsBooked: PropTypes.number,
  }).isRequired,
  loading: PropTypes.bool,
};

OrgStats.defaultProps = {
  loading: false,
};

export default OrgStats;
