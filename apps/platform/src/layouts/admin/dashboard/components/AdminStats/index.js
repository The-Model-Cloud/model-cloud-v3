/**
 * AdminStats - Platform-wide key metrics cards
 */

import PropTypes from "prop-types";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard components
import MDBox from "components/MDBox";

// Statistics cards
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

function AdminStats({ stats, loading }) {
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
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Grid item xs={12} sm={6} lg={3} key={i}>
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
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="primary"
            icon="work"
            title="Total Jobs"
            count={stats.totalJobs}
            percentage={{
              color: "success",
              amount: `${stats.activeJobs} active`,
              label: "",
            }}
          />
        </MDBox>
      </Grid>

      {/* Completed Jobs */}
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="success"
            icon="check_circle"
            title="Completed Jobs"
            count={stats.completedJobs}
            percentage={{
              color: "info",
              amount: stats.totalJobs > 0
                ? `${Math.round((stats.completedJobs / stats.totalJobs) * 100)}%`
                : "0%",
              label: "completion rate",
            }}
          />
        </MDBox>
      </Grid>

      {/* Total Platform Spend */}
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="warning"
            icon="payments"
            title="Platform Spend"
            count={formatCurrency(stats.totalSpend)}
            percentage={{
              color: "warning",
              amount: "",
              label: "All time revenue",
            }}
          />
        </MDBox>
      </Grid>

      {/* Total Organisations */}
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="info"
            icon="corporate_fare"
            title="Organisations"
            count={stats.totalOrganisations}
            percentage={{
              color: "info",
              amount: "",
              label: "Active organisations",
            }}
          />
        </MDBox>
      </Grid>

      {/* Total Users */}
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="dark"
            icon="people"
            title="Total Users"
            count={stats.totalUsers}
            percentage={{
              color: "dark",
              amount: "",
              label: "All registered users",
            }}
          />
        </MDBox>
      </Grid>

      {/* Total Models */}
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="secondary"
            icon="person"
            title="Models"
            count={stats.totalModels}
            percentage={{
              color: "secondary",
              amount: "",
              label: "Registered models",
            }}
          />
        </MDBox>
      </Grid>

      {/* Total Clients */}
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="error"
            icon="business_center"
            title="Clients"
            count={stats.totalClients}
            percentage={{
              color: "error",
              amount: "",
              label: "Clients & account managers",
            }}
          />
        </MDBox>
      </Grid>

      {/* Active Jobs */}
      <Grid item xs={12} sm={6} lg={3}>
        <MDBox mb={1.5}>
          <ComplexStatisticsCard
            color="primary"
            icon="pending_actions"
            title="Active Jobs"
            count={stats.activeJobs}
            percentage={{
              color: "success",
              amount: "",
              label: "Open & awarded",
            }}
          />
        </MDBox>
      </Grid>
    </Grid>
  );
}

AdminStats.propTypes = {
  stats: PropTypes.shape({
    totalJobs: PropTypes.number,
    activeJobs: PropTypes.number,
    completedJobs: PropTypes.number,
    totalSpend: PropTypes.number,
    totalOrganisations: PropTypes.number,
    totalUsers: PropTypes.number,
    totalModels: PropTypes.number,
    totalClients: PropTypes.number,
  }).isRequired,
  loading: PropTypes.bool,
};

AdminStats.defaultProps = {
  loading: false,
};

export default AdminStats;
