/**
 * SpendChart - Line chart showing organisation spend over time
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
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function SpendChart({ data, loading }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalSpend = useMemo(() => {
    return data.data.reduce((sum, val) => sum + val, 0);
  }, [data.data]);

  const chartData = useMemo(() => ({
    labels: data.labels,
    datasets: [
      {
        label: "Spend",
        data: data.data,
        fill: true,
        backgroundColor: "rgba(233, 30, 99, 0.1)",
        borderColor: "rgba(233, 30, 99, 1)",
        borderWidth: 3,
        pointBackgroundColor: "rgba(233, 30, 99, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
      },
    ],
  }), [data]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => formatCurrency(context.raw),
        },
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
            size: 12,
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
            size: 12,
          },
          callback: (value) => formatCurrency(value),
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  }), []);

  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <Skeleton width={200} height={28} />
          <Skeleton width={150} height={20} sx={{ mt: 1 }} />
          <MDBox mt={3}>
            <Skeleton variant="rounded" height={300} />
          </MDBox>
        </MDBox>
      </Card>
    );
  }

  const hasData = data.data.some((val) => val > 0);

  return (
    <Card>
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <MDBox>
            <MDBox display="flex" alignItems="center" mb={0.5}>
              <MDBox
                width="3rem"
                height="3rem"
                bgColor="warning"
                variant="gradient"
                borderRadius="lg"
                display="flex"
                justifyContent="center"
                alignItems="center"
                color="white"
                mr={2}
              >
                <Icon>trending_up</Icon>
              </MDBox>
              <MDBox>
                <MDTypography variant="h6" fontWeight="medium">
                  Spending Overview
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Last 6 months
                </MDTypography>
              </MDBox>
            </MDBox>
          </MDBox>
          <MDBox textAlign="right">
            <MDTypography variant="h4" fontWeight="bold" color="primary">
              {formatCurrency(totalSpend)}
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Total period spend
            </MDTypography>
          </MDBox>
        </MDBox>

        <MDBox height="300px" mt={2}>
          {hasData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <MDBox
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              height="100%"
            >
              <Icon sx={{ fontSize: 64, color: "grey.300", mb: 2 }}>show_chart</Icon>
              <MDTypography variant="body2" color="text">
                No spend data available yet
              </MDTypography>
              <MDTypography variant="caption" color="text">
                Complete jobs to see your spending trends
              </MDTypography>
            </MDBox>
          )}
        </MDBox>
      </MDBox>
    </Card>
  );
}

SpendChart.propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    data: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  loading: PropTypes.bool,
};

SpendChart.defaultProps = {
  loading: false,
};

export default SpendChart;
