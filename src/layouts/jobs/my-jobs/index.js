import { useEffect, useState, useMemo } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

// @mui components
import Icon from "@mui/material/Icon";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Custom components
import MyJobFilters from "./components/MyJobFilters";
import MyJobResults from "./components/MyJobResults";

function MyJobs() {
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    jobType: "all",
    jobStatus: "all",
    applicationStatus: "all",
  });

  const fetchJobsForCurrentUser = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setLoading(false);
      return;
    }

    const userData = userSnap.data();
    const jobRefs = userData.jobs || [];
    const appliedJobs = userData.appliedJobs || [];
    const invitedJobs = userData.invitedJobs || [];

    // Combine created jobs, applied jobs, and invited jobs
    const allJobRefs = [...new Set([
      ...jobRefs,
      ...appliedJobs.map(j => j.jobReference),
      ...invitedJobs.map(j => j.jobReference)
    ])];

    if (allJobRefs.length === 0) {
      setAllJobs([]);
      setLoading(false);
      return;
    }

    // Firestore "in" queries are limited to 30 items, so we may need to batch
    const batchSize = 30;
    const batches = [];
    for (let i = 0; i < allJobRefs.length; i += batchSize) {
      batches.push(allJobRefs.slice(i, i + batchSize));
    }

    const jobs = [];
    for (const batch of batches) {
      const jobsQuery = query(collection(db, "jobs"), where("reference", "in", batch));
      const jobDocs = await getDocs(jobsQuery);

      jobDocs.forEach((docSnap) => {
        const data = docSnap.data();

        // Check if this is a created job, applied job, or invited job
        const isCreated = jobRefs.includes(data.reference);
        const appliedJob = appliedJobs.find(aj => aj.jobReference === data.reference);
        const isApplied = !!appliedJob;
        const invitedJob = invitedJobs.find(ij => ij.jobReference === data.reference);
        const isInvited = !!invitedJob && !isApplied; // Only show as invited if not already applied

        // Determine application status
        let applicationStatus;
        if (isCreated) {
          applicationStatus = "Owner";
        } else if (isApplied) {
          applicationStatus = appliedJob.status || "pending";
        } else if (isInvited) {
          applicationStatus = "Invited";
        } else {
          applicationStatus = "-";
        }

        jobs.push({
          ...data, // Include all job data for the cards
          applicationStatus,
          appliedAt: appliedJob?.appliedAt,
          invitedAt: invitedJob?.invitedAt,
          invitedByName: invitedJob?.invitedByName,
          isOwner: isCreated,
          isApplied: isApplied,
          isInvited: isInvited,
        });
      });
    }

    // Sort: owned jobs first, then by date
    jobs.sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    setAllJobs(jobs);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobsForCurrentUser();
  }, []);

  // Apply filters
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      // Filter by job type (owned vs applied vs invited)
      if (filters.jobType === "owned" && !job.isOwner) return false;
      if (filters.jobType === "applied" && !job.isApplied) return false;
      if (filters.jobType === "invited" && !job.isInvited) return false;

      // Filter by job status
      if (filters.jobStatus !== "all") {
        const jobStatus = (job.status || "open").toLowerCase();
        if (jobStatus !== filters.jobStatus) return false;
      }

      // Filter by application status (only for applied jobs)
      if (filters.applicationStatus !== "all" && !job.isOwner) {
        const appStatus = (job.applicationStatus || "").toLowerCase();
        if (appStatus !== filters.applicationStatus) return false;
      }

      return true;
    });
  }, [allJobs, filters]);

  // Calculate counts for filter badges
  const jobCounts = useMemo(() => ({
    owned: allJobs.filter(j => j.isOwner).length,
    applied: allJobs.filter(j => j.isApplied).length,
    invited: allJobs.filter(j => j.isInvited).length,
  }), [allJobs]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox my={3}>
        {/* Page Header */}
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
          <MDBox>
            <MDBox display="flex" alignItems="center" gap={1} mb={1}>
              <Icon sx={{ color: "info.main", fontSize: "2rem" }}>business_center</Icon>
              <MDTypography variant="h4" fontWeight="bold" color="dark">
                My Jobs
              </MDTypography>
            </MDBox>
            <MDTypography variant="body2" color="text">
              Manage jobs you've created and track your applications
            </MDTypography>
          </MDBox>

          <Link to="/jobs/new">
            <MDButton variant="gradient" color="info" startIcon={<Icon>add</Icon>}>
              Post New Job
            </MDButton>
          </Link>
        </MDBox>

        {/* Filters */}
        <MyJobFilters
          filters={filters}
          setFilters={setFilters}
          jobCounts={jobCounts}
        />

        {/* Results */}
        <MDBox mt={4}>
          <MyJobResults jobs={filteredJobs} loading={loading} />
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default MyJobs;
