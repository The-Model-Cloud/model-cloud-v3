/**
 * UserGrowth - Bar chart showing new model and client signups over time
 */

import PropTypes from "prop-types";
import { useMemo } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Chart
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function UserGrowth({ data, loading }) {
  const totalNewUsers = useMemo(() => {
    const models = data.models.reduce((sum, val) => sum + val, 0);
    const clients = data.clients.reduce((sum, val) => sum + val, 0);
    return { models, clients, total: models + clients };
  }, [data.models, data.clients]);

  const chartData = useMemo(() => ({
    labels: data.labels,
    datasets: [
      {
        label: "Models",
        data: data.models,
        backgroundColor: "rgba(233, 30, 99, 0.8)",
        borderColor: "rgba(233, 30, 99, 1)",
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 12,
      },
      {
        label: "Clients",
        data: data.clients,
        backgroundColor: "rgba(38, 38, 38, 0.8)",
        borderColor: "rgba(38, 38, 38, 1)",
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 12,
      },
    ],
  }), [data]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 15,
          color: "#7b809a",
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#7b809a",
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          color: "#7b809a",
          font: {
            size: 11,
          },
          stepSize: 1,
        },
        beginAtZero: true,
      },
    },
  }), []);

  if (loading) {
    return (
      <Card sx={{ height: "100%" }}>
        <MDBox p={3}>
          <Skeleton width={150} height={28} />
          <Skeleton width={100} height={20} sx={{ mt: 1 }} />
          <MDBox mt={3}>
            <Skeleton variant="rounded" height={280} />
          </MDBox>
        </MDBox>
      </Card>
    );
  }

  const hasData = data.models.some((val) => val > 0) || data.clients.some((val) => val > 0);

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" mb={2}>
          <MDBox
            width="3rem"
            height="3rem"
            bgColor="info"
            variant="gradient"
            borderRadius="lg"
            display="flex"
            justifyContent="center"
            alignItems="center"
            color="white"
            mr={2}
          >
            <Icon>person_add</Icon>
          </MDBox>
          <MDBox>
            <MDTypography variant="h6" fontWeight="medium">
              User Growth
            </MDTypography>
            <MDTypography variant="caption" color="text">
              New signups: {totalNewUsers.total} ({totalNewUsers.models} models, {totalNewUsers.clients} clients)
            </MDTypography>
          </MDBox>
        </MDBox>

        <MDBox height="280px">
          {hasData ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <MDBox
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              height="100%"
            >
              <Icon sx={{ fontSize: 48, color: "grey.300", mb: 2 }}>group_add</Icon>
              <MDTypography variant="body2" color="text">
                No new signups in this period
              </MDTypography>
            </MDBox>
          )}
        </MDBox>
      </MDBox>
    </Card>
  );
}

UserGrowth.propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    models: PropTypes.arrayOf(PropTypes.number).isRequired,
    clients: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  loading: PropTypes.bool,
};

UserGrowth.defaultProps = {
  loading: false,
};

export default UserGrowth;
