/**
 * Admin Dashboard - Platform-wide dashboard for admins and super admins
 * Shows aggregated metrics across all organisations
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { getAllOrganisations } from "utils/organisations";

// MUI components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Dashboard components
import AdminStats from "./components/AdminStats";
import PlatformSpendChart from "./components/PlatformSpendChart";
import TopOrganisations from "./components/TopOrganisations";
import RecentJobs from "./components/RecentJobs";
import OrganisationsOverview from "./components/OrganisationsOverview";
import UserGrowth from "./components/UserGrowth";

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalSpend: 0,
    totalOrganisations: 0,
    totalUsers: 0,
    totalModels: 0,
    totalClients: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [topOrganisations, setTopOrganisations] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [spendData, setSpendData] = useState({ labels: [], data: [] });
  const [userGrowthData, setUserGrowthData] = useState({ labels: [], models: [], clients: [] });

  // Check access
  const hasAccess = user && (user.role === "admin" || user.role === "super admin");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!hasAccess) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = getFirestore();

      try {
        // Fetch all data in parallel
        const [orgsData, jobsSnapshot, usersSnapshot] = await Promise.all([
          getAllOrganisations(),
          getDocs(query(collection(db, "jobs"), orderBy("createdAt", "desc"))),
          getDocs(collection(db, "users")),
        ]);

        setOrganisations(orgsData);

        // Process jobs
        const allJobs = jobsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Process users
        const allUsers = usersSnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        const models = allUsers.filter((u) => u.role === "model");
        const clients = allUsers.filter((u) => u.role === "client" || u.role === "account manager");

        // Calculate stats
        const activeJobs = allJobs.filter(
          (j) => j.status === "open" || j.status === "awarded"
        );
        const completedJobs = allJobs.filter((j) => j.status === "completed");
        const totalSpend = allJobs
          .filter((j) => j.status === "completed" && j.agreedAmount)
          .reduce((sum, j) => sum + (j.agreedAmount || 0), 0);

        setStats({
          totalJobs: allJobs.length,
          activeJobs: activeJobs.length,
          completedJobs: completedJobs.length,
          totalSpend,
          totalOrganisations: orgsData.length,
          totalUsers: allUsers.length,
          totalModels: models.length,
          totalClients: clients.length,
        });

        // Recent jobs (last 10)
        setRecentJobs(allJobs.slice(0, 10));

        // Calculate spend by month (last 6 months)
        const spendByMonth = calculateSpendByMonth(allJobs);
        setSpendData(spendByMonth);

        // Calculate user growth (last 6 months)
        const userGrowth = calculateUserGrowth(allUsers);
        setUserGrowthData(userGrowth);

        // Calculate top organisations
        const orgStats = calculateOrgStats(allJobs, orgsData);
        setTopOrganisations(orgStats.slice(0, 5));
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [hasAccess]);

  // Calculate spend grouped by month
  const calculateSpendByMonth = (jobs) => {
    const now = new Date();
    const months = [];
    const spendByMonth = {};

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      months.push({ key, label });
      spendByMonth[key] = 0;
    }

    jobs.forEach((job) => {
      if (job.status === "completed" && job.agreedAmount && job.completedAt) {
        const completedDate = job.completedAt?.toDate
          ? job.completedAt.toDate()
          : new Date(job.completedAt);
        const key = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}`;
        if (spendByMonth[key] !== undefined) {
          spendByMonth[key] += job.agreedAmount;
        }
      }
    });

    return {
      labels: months.map((m) => m.label),
      data: months.map((m) => spendByMonth[m.key]),
    };
  };

  // Calculate user growth by month
  const calculateUserGrowth = (users) => {
    const now = new Date();
    const months = [];
    const modelsByMonth = {};
    const clientsByMonth = {};

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      months.push({ key, label });
      modelsByMonth[key] = 0;
      clientsByMonth[key] = 0;
    }

    users.forEach((user) => {
      if (user.createdAt) {
        const createdDate = user.createdAt?.toDate
          ? user.createdAt.toDate()
          : new Date(user.createdAt);
        const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
        if (user.role === "model" && modelsByMonth[key] !== undefined) {
          modelsByMonth[key]++;
        } else if ((user.role === "client" || user.role === "account manager") && clientsByMonth[key] !== undefined) {
          clientsByMonth[key]++;
        }
      }
    });

    return {
      labels: months.map((m) => m.label),
      models: months.map((m) => modelsByMonth[m.key]),
      clients: months.map((m) => clientsByMonth[m.key]),
    };
  };

  // Calculate organisation stats
  const calculateOrgStats = (jobs, orgs) => {
    const orgJobCounts = {};

    jobs.forEach((job) => {
      const orgId = job.organisationId;
      if (orgId) {
        if (!orgJobCounts[orgId]) {
          orgJobCounts[orgId] = { orgId, totalJobs: 0, activeJobs: 0, totalSpend: 0 };
        }
        orgJobCounts[orgId].totalJobs++;
        if (job.status === "open" || job.status === "awarded") {
          orgJobCounts[orgId].activeJobs++;
        }
        if (job.status === "completed" && job.agreedAmount) {
          orgJobCounts[orgId].totalSpend += job.agreedAmount;
        }
      }
    });

    // Match with org details
    return orgs
      .map((org) => ({
        ...org,
        ...(orgJobCounts[org.id] || { totalJobs: 0, activeJobs: 0, totalSpend: 0 }),
      }))
      .sort((a, b) => b.totalJobs - a.totalJobs);
  };

  // Access denied
  if (!hasAccess) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <Card>
            <MDBox p={3} textAlign="center">
              <Icon sx={{ fontSize: 60, color: "error.main", mb: 2 }}>lock</Icon>
              <MDTypography variant="h5" gutterBottom>
                Access Denied
              </MDTypography>
              <MDTypography variant="body2" color="text">
                You need admin privileges to view this dashboard.
              </MDTypography>
            </MDBox>
          </Card>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        {/* Header */}
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Platform Dashboard
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Overview of all platform activity and organisation performance
          </MDTypography>
        </MDBox>

        {/* Stats Cards */}
        <MDBox mb={3}>
          <AdminStats stats={stats} loading={loading} />
        </MDBox>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Platform Spend Chart */}
          <Grid item xs={12} lg={8}>
            <PlatformSpendChart data={spendData} loading={loading} />
          </Grid>

          {/* User Growth */}
          <Grid item xs={12} lg={4}>
            <UserGrowth data={userGrowthData} loading={loading} />
          </Grid>

          {/* Top Organisations */}
          <Grid item xs={12} md={6}>
            <TopOrganisations organisations={topOrganisations} loading={loading} />
          </Grid>

          {/* Recent Jobs */}
          <Grid item xs={12} md={6}>
            <RecentJobs jobs={recentJobs} loading={loading} />
          </Grid>

          {/* All Organisations Overview */}
          <Grid item xs={12}>
            <OrganisationsOverview organisations={organisations} loading={loading} />
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default AdminDashboard;
