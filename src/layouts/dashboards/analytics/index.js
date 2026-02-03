// @mui material components
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import { useEffect, useState } from "react";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import ReportsLineChart from "examples/Charts/LineCharts/ReportsLineChart";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

// Anaytics dashboard components
import ModelsByCountry from "layouts/dashboards/analytics/components/ModelsByCountry";
import ModelsByCounty from "layouts/dashboards/analytics/components/ModelsByCounty";

// Data
import reportsBarChartData from "layouts/dashboards/analytics/data/reportsBarChartData";
import reportsLineChartData from "layouts/dashboards/analytics/data/reportsLineChartData";

// Auth context
import { useAuth } from "context/AuthContext";

// API functions
import {
  getGA4Analytics,
  getGA4DailyData,
  getModelProfileViews,
  getTrafficSources,
  getGeographicData,
  getJobCount,
  getUserCount,
  getInstagramFollowers,
} from "utils/api";

function Analytics() {
  const { user } = useAuth();
  const { sales, tasks } = reportsLineChartData;

  // State for analytics data
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    pageViews: 0,
    sessions: 0,
    users: 0,
    jobCount: 0,
    userCount: 0,
    instagramFollowers: 0,
  });
  const [modelProfileViews, setModelProfileViews] = useState([]);
  const [trafficSources, setTrafficSources] = useState([]);
  const [geographicData, setGeographicData] = useState({ countries: [], cities: [] });
  const [websiteViewsData, setWebsiteViewsData] = useState(reportsBarChartData);
  const [sessionsChartData, setSessionsChartData] = useState(sales);
  const [usersChartData, setUsersChartData] = useState(tasks);

  // Check if user has access to analytics (admin or super admin only)
  const hasAccess = user && (user.role === "admin" || user.role === "super admin");

  // Fetch analytics data on component mount
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!hasAccess) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch GA4 data in parallel
        const [
          ga4Response,
          ga4DailyResponse,
          modelViewsResponse,
          sourcesResponse,
          geoResponse,
          jobCountResponse,
          userCountResponse,
          instagramResponse,
        ] = await Promise.all([
          getGA4Analytics("30daysAgo", "today", ["screenPageViews", "sessions", "activeUsers"], [])
            .catch(err => {
              console.error("GA4 Analytics error:", err);
              return { success: false, data: { totals: [0, 0, 0] } };
            }),
          getGA4DailyData("30daysAgo", "today")
            .catch(err => {
              console.error("GA4 Daily data error:", err);
              return { success: false, data: { daily: [], totals: { pageViews: 0, sessions: 0, users: 0 } } };
            }),
          getModelProfileViews("30daysAgo", "today", 10)
            .catch(err => {
              console.error("Model profile views error:", err);
              return { success: false, data: { profiles: [] } };
            }),
          getTrafficSources("30daysAgo", "today")
            .catch(err => {
              console.error("Traffic sources error:", err);
              return { success: false, data: { sources: [] } };
            }),
          getGeographicData("30daysAgo", "today")
            .catch(err => {
              console.error("Geographic data error:", err);
              return { success: false, data: { countries: [], cities: [] } };
            }),
          getJobCount()
            .catch(err => {
              console.error("Job count error:", err);
              return { success: false, data: { totalJobs: 0 } };
            }),
          getUserCount()
            .catch(err => {
              console.error("User count error:", err);
              return { success: false, data: { totalUsers: 0 } };
            }),
          getInstagramFollowers("themodelcloud")
            .catch(err => {
              console.error("Instagram followers error:", err);
              return { success: false, data: { followers: 0 } };
            }),
        ]);

        // Update state with fetched data
        if (ga4Response.success && ga4Response.data.totals) {
          const [pageViews, sessions, users] = ga4Response.data.totals;
          setAnalyticsData(prev => ({
            ...prev,
            pageViews: parseInt(pageViews || "0", 10),
            sessions: parseInt(sessions || "0", 10),
            users: parseInt(users || "0", 10),
          }));
        }

        // Process daily data for charts
        if (ga4DailyResponse.success && ga4DailyResponse.data.daily && ga4DailyResponse.data.daily.length > 0) {
          const dailyData = ga4DailyResponse.data.daily;

          // Format date labels and extract data
          const labels = dailyData.map(day => {
            // Convert YYYYMMDD to readable format (e.g., "Jan 15")
            const dateStr = day.date;
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const dayNum = dateStr.substring(6, 8);
            const date = new Date(year, month - 1, dayNum);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          });

          const pageViewsData = dailyData.map(day => day.pageViews);
          const sessionsData = dailyData.map(day => day.sessions);
          const usersData = dailyData.map(day => day.users);

          // Update website views chart (bar chart)
          setWebsiteViewsData({
            labels: labels,
            datasets: {
              label: "Page Views",
              data: pageViewsData,
            },
          });

          // Update sessions chart (line chart)
          setSessionsChartData({
            labels: labels,
            datasets: {
              label: "Sessions",
              data: sessionsData,
            },
          });

          // Update users chart (line chart)
          setUsersChartData({
            labels: labels,
            datasets: {
              label: "Active Users",
              data: usersData,
            },
          });
        }

        if (modelViewsResponse.success) {
          setModelProfileViews(modelViewsResponse.data.profiles || []);
        }

        if (sourcesResponse.success) {
          setTrafficSources(sourcesResponse.data.sources || []);
        }

        if (geoResponse.success) {
          setGeographicData(geoResponse.data);
        }

        if (jobCountResponse.success) {
          setAnalyticsData(prev => ({
            ...prev,
            jobCount: jobCountResponse.data.totalJobs || 0,
          }));
        }

        if (userCountResponse.success) {
          setAnalyticsData(prev => ({
            ...prev,
            userCount: userCountResponse.data.totalUsers || 0,
          }));
        }

        if (instagramResponse.success) {
          setAnalyticsData(prev => ({
            ...prev,
            instagramFollowers: instagramResponse.data.followers || 0,
          }));
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [hasAccess]);

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Show access denied message if user doesn't have permission
  if (!hasAccess) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <MDBox textAlign="center" py={10}>
            <Icon fontSize="large" color="error">lock</Icon>
            <MDTypography variant="h4" mt={2}>
              Access Denied
            </MDTypography>
            <MDTypography variant="body2" color="text" mt={1}>
              You don't have permission to access this page.
            </MDTypography>
          </MDBox>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pb={3}>
        <MDBox mb={3} ml={1}>
          <MDTypography variant="h4" fontWeight="bold">
            Analytics
          </MDTypography>
          <MDTypography
            variant="button"
            fontWeight="regular"
            sx={{ fontSize: "16px", color: "#737373" }}
          >
            View model distribution, statistics and platform analytics.
          </MDTypography>
        </MDBox>

        {loading ? (
          <MDBox textAlign="center" py={10}>
            <MDTypography variant="h6" color="text">
              Loading analytics data...
            </MDTypography>
          </MDBox>
        ) : (
          <>
            <MDBox>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={4}>
                  <MDBox mb={3}>
                    <ReportsBarChart
                      color="success"
                      title="website views"
                      description="Last 30 Days Performance"
                      date={`Total: ${formatNumber(analyticsData.pageViews)} views`}
                      chart={websiteViewsData}
                    />
                  </MDBox>
                </Grid>
                <Grid item xs={12} md={6} lg={4}>
                  <MDBox mb={3}>
                    <ReportsLineChart
                      color="success"
                      title="sessions"
                      description={
                        <>
                          <strong>{formatNumber(analyticsData.sessions)}</strong> total sessions
                        </>
                      }
                      date="last 30 days"
                      chart={sessionsChartData}
                    />
                  </MDBox>
                </Grid>
                <Grid item xs={12} md={6} lg={4}>
                  <MDBox mb={3}>
                    <ReportsLineChart
                      color="success"
                      title="active users"
                      description={
                        <>
                          <strong>{formatNumber(analyticsData.users)}</strong> active users
                        </>
                      }
                      date="last 30 days"
                      chart={usersChartData}
                    />
                  </MDBox>
                </Grid>
              </Grid>
            </MDBox>

            <MDBox>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={3}>
                  <MDBox>
                    <ComplexStatisticsCard
                      icon="work"
                      title="Job Count"
                      count={analyticsData.jobCount}
                      percentage={{
                        color: "success",
                        amount: "",
                        label: "Total jobs on platform",
                      }}
                    />
                  </MDBox>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <MDBox>
                    <ComplexStatisticsCard
                      icon="people"
                      title="Total Users"
                      count={formatNumber(analyticsData.userCount)}
                      percentage={{
                        color: "success",
                        amount: "",
                        label: "Registered users",
                      }}
                    />
                  </MDBox>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <MDBox>
                    <ComplexStatisticsCard
                      icon="store"
                      title="Revenue"
                      count="34k"
                      percentage={{
                        color: "success",
                        amount: "+1%",
                        label: "than yesterday",
                      }}
                    />
                  </MDBox>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <MDBox>
                    <ComplexStatisticsCard
                      icon="photo_camera"
                      title="Instagram Followers"
                      count={formatNumber(analyticsData.instagramFollowers)}
                      percentage={{
                        color: "success",
                        amount: "",
                        label: "@themodelcloud",
                      }}
                    />
                  </MDBox>
                </Grid>
              </Grid>
            </MDBox>

            {/* Model Profile Views Section */}
            {modelProfileViews.length > 0 && (
              <MDBox mt={3}>
                <MDBox mb={2} ml={1}>
                  <MDTypography variant="h6" fontWeight="bold">
                    Top Model Profile Views
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Most viewed model profiles in the last 30 days
                  </MDTypography>
                </MDBox>
                <MDBox
                  sx={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: 2,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {modelProfileViews.map((profile, index) => (
                    <MDBox
                      key={index}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1.5}
                      borderBottom={index < modelProfileViews.length - 1 ? "1px solid #f0f0f0" : "none"}
                    >
                      <MDTypography variant="button" fontWeight="regular">
                        {profile.title || profile.path}
                      </MDTypography>
                      <MDTypography variant="button" fontWeight="bold" color="success">
                        {formatNumber(profile.views)} views
                      </MDTypography>
                    </MDBox>
                  ))}
                </MDBox>
              </MDBox>
            )}

            {/* Traffic Sources Section */}
            {trafficSources.length > 0 && (
              <MDBox mt={3}>
                <MDBox mb={2} ml={1}>
                  <MDTypography variant="h6" fontWeight="bold">
                    Traffic Sources
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Where your visitors are coming from
                  </MDTypography>
                </MDBox>
                <MDBox
                  sx={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: 2,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {trafficSources.map((source, index) => (
                    <MDBox
                      key={index}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1.5}
                      borderBottom={index < trafficSources.length - 1 ? "1px solid #f0f0f0" : "none"}
                    >
                      <MDBox>
                        <MDTypography variant="button" fontWeight="medium">
                          {source.source}
                        </MDTypography>
                        <MDTypography variant="caption" color="text" display="block">
                          {source.medium}
                        </MDTypography>
                      </MDBox>
                      <MDBox textAlign="right">
                        <MDTypography variant="button" fontWeight="bold">
                          {formatNumber(source.sessions)} sessions
                        </MDTypography>
                        <MDTypography variant="caption" color="text" display="block">
                          {formatNumber(source.users)} users
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                  ))}
                </MDBox>
              </MDBox>
            )}

            <Grid container mt={3} spacing={3}>
              <Grid item xs={12} lg={6}>
                <ModelsByCountry geographicData={geographicData} />
              </Grid>
              <Grid item xs={12} lg={6}>
                <ModelsByCounty geographicData={geographicData} />
              </Grid>
            </Grid>
          </>
        )}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Analytics;
