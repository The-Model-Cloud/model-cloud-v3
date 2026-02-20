/**
 * Organisation Dashboard - Main dashboard for organisation members
 * Shows key metrics, recent activity, and insights for the organisation
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
import {
  getOrganisationById,
  getOrganisationTeams,
  getOrganisationUsers,
} from "utils/organisations";

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
import OrgStats from "./components/OrgStats";
import RecentJobs from "./components/RecentJobs";
import UpcomingJobs from "./components/UpcomingJobs";
import SpendChart from "./components/SpendChart";
import TopModels from "./components/TopModels";
import TeamActivity from "./components/TeamActivity";

function OrganisationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalSpend: 0,
    teamCount: 0,
    memberCount: 0,
    modelsBooked: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [topModels, setTopModels] = useState([]);
  const [spendData, setSpendData] = useState({ labels: [], data: [] });
  const [teamActivity, setTeamActivity] = useState([]);

  const orgId = user?.organisationId;

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = getFirestore();

      try {
        // Fetch organisation details
        const org = await getOrganisationById(orgId);
        setOrgData(org);

        // Fetch teams and members counts
        const [teams, members] = await Promise.all([
          getOrganisationTeams(orgId),
          getOrganisationUsers(orgId),
        ]);

        // Fetch all organisation jobs
        const jobsRef = collection(db, "jobs");
        const jobsQuery = query(
          jobsRef,
          where("organisationId", "==", orgId),
          orderBy("createdAt", "desc")
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        const allJobs = jobsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Calculate stats
        const now = new Date();
        const activeJobs = allJobs.filter(
          (j) => j.status === "open" || j.status === "awarded"
        );
        const completedJobs = allJobs.filter((j) => j.status === "completed");
        const totalSpend = allJobs
          .filter((j) => j.status === "completed" && j.agreedAmount)
          .reduce((sum, j) => sum + (j.agreedAmount || 0), 0);

        // Get unique models booked
        const uniqueModels = new Set(
          allJobs.filter((j) => j.awardedTo).map((j) => j.awardedTo)
        );

        setStats({
          totalJobs: allJobs.length,
          activeJobs: activeJobs.length,
          completedJobs: completedJobs.length,
          totalSpend,
          teamCount: teams.length,
          memberCount: members.length,
          modelsBooked: uniqueModels.size,
        });

        // Recent jobs (last 5)
        setRecentJobs(allJobs.slice(0, 5));

        // Upcoming jobs (jobs with future dates, sorted by date)
        const upcoming = allJobs
          .filter((j) => {
            if (!j.dates || j.dates.length === 0) return false;
            const jobDate = j.dates[0]?.toDate ? j.dates[0].toDate() : new Date(j.dates[0]);
            return jobDate > now && (j.status === "open" || j.status === "awarded");
          })
          .sort((a, b) => {
            const dateA = a.dates[0]?.toDate ? a.dates[0].toDate() : new Date(a.dates[0]);
            const dateB = b.dates[0]?.toDate ? b.dates[0].toDate() : new Date(b.dates[0]);
            return dateA - dateB;
          })
          .slice(0, 5);
        setUpcomingJobs(upcoming);

        // Calculate spend by month (last 6 months)
        const spendByMonth = calculateSpendByMonth(allJobs);
        setSpendData(spendByMonth);

        // Top models (most frequently booked)
        const modelBookings = await calculateTopModels(allJobs, db);
        setTopModels(modelBookings.slice(0, 5));

        // Team activity (recent job creators)
        const activity = calculateTeamActivity(allJobs, members);
        setTeamActivity(activity.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [orgId]);

  // Calculate spend grouped by month
  const calculateSpendByMonth = (jobs) => {
    const now = new Date();
    const months = [];
    const spendByMonth = {};

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      months.push({ key, label });
      spendByMonth[key] = 0;
    }

    // Sum spend by month
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

  // Calculate top models by booking frequency
  const calculateTopModels = async (jobs, db) => {
    const modelCounts = {};

    jobs.forEach((job) => {
      if (job.awardedTo) {
        if (!modelCounts[job.awardedTo]) {
          modelCounts[job.awardedTo] = { uid: job.awardedTo, bookings: 0, totalSpend: 0 };
        }
        modelCounts[job.awardedTo].bookings++;
        if (job.agreedAmount) {
          modelCounts[job.awardedTo].totalSpend += job.agreedAmount;
        }
      }
    });

    // Get model details
    const modelIds = Object.keys(modelCounts);
    const modelsWithDetails = await Promise.all(
      modelIds.map(async (uid) => {
        try {
          const userRef = collection(db, "users");
          const userQuery = query(userRef, where("uid", "==", uid));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            return {
              ...modelCounts[uid],
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              profileImage: userData.profileImage || null,
              publicSlug: userData.publicSlug || "",
            };
          }
        } catch (e) {
          console.error("Error fetching model:", uid, e);
        }
        return modelCounts[uid];
      })
    );

    return modelsWithDetails.sort((a, b) => b.bookings - a.bookings);
  };

  // Calculate team member activity
  const calculateTeamActivity = (jobs, members) => {
    const memberJobCounts = {};

    jobs.forEach((job) => {
      const creatorId = job.userId;
      if (creatorId) {
        if (!memberJobCounts[creatorId]) {
          memberJobCounts[creatorId] = { uid: creatorId, jobsCreated: 0, recentJob: null };
        }
        memberJobCounts[creatorId].jobsCreated++;
        if (!memberJobCounts[creatorId].recentJob ||
            (job.createdAt && (!memberJobCounts[creatorId].recentJob.createdAt ||
             job.createdAt > memberJobCounts[creatorId].recentJob.createdAt))) {
          memberJobCounts[creatorId].recentJob = job;
        }
      }
    });

    // Match with member details
    return members
      .filter((m) => memberJobCounts[m.uid])
      .map((m) => ({
        ...m,
        ...memberJobCounts[m.uid],
      }))
      .sort((a, b) => b.jobsCreated - a.jobsCreated);
  };

  // No organisation assigned
  if (!orgId) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <Card>
            <MDBox p={3} textAlign="center">
              <Icon sx={{ fontSize: 60, color: "grey.400", mb: 2 }}>business</Icon>
              <MDTypography variant="h5" gutterBottom>
                No Organisation Assigned
              </MDTypography>
              <MDTypography variant="body2" color="text">
                You are not currently assigned to an organisation. Please contact your administrator.
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
            {loading ? (
              <Skeleton width={300} />
            ) : (
              <>
                {orgData?.companyName || "Organisation"} Dashboard
              </>
            )}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Overview of your organisation&apos;s activity and performance
          </MDTypography>
        </MDBox>

        {/* Stats Cards */}
        <MDBox mb={3}>
          <OrgStats stats={stats} loading={loading} />
        </MDBox>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Spend Chart */}
          <Grid item xs={12} lg={8}>
            <SpendChart data={spendData} loading={loading} />
          </Grid>

          {/* Top Models */}
          <Grid item xs={12} lg={4}>
            <TopModels models={topModels} loading={loading} />
          </Grid>

          {/* Recent Jobs */}
          <Grid item xs={12} md={6}>
            <RecentJobs jobs={recentJobs} loading={loading} />
          </Grid>

          {/* Upcoming Jobs */}
          <Grid item xs={12} md={6}>
            <UpcomingJobs jobs={upcomingJobs} loading={loading} />
          </Grid>

          {/* Team Activity */}
          <Grid item xs={12}>
            <TeamActivity activity={teamActivity} loading={loading} />
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default OrganisationDashboard;
