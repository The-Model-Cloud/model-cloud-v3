import { useEffect, useState, useMemo } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "context/AuthContext";

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
  const { user } = useAuth();
  const [allJobs, setAllJobs] = useState([]);
  const [organisationJobs, setOrganisationJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userOrganisationId, setUserOrganisationId] = useState(null);
  const [filters, setFilters] = useState({
    jobType: "all",
    jobStatus: "all",
    applicationStatus: "all",
  });

  // Roles that can create jobs
  const canCreateJobs = user?.role && ["client", "account manager", "admin", "super admin"].includes(user.role);

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

    // Store organisation ID for filtering
    const orgId = userData.organisationId || null;
    setUserOrganisationId(orgId);

    // Combine created jobs, applied jobs, and invited jobs
    const allJobRefs = [...new Set([
      ...jobRefs,
      ...appliedJobs.map(j => j.jobReference),
      ...invitedJobs.map(j => j.jobReference)
    ])];

    // Don't return early if no personal jobs - still need to fetch org jobs for account managers
    if (allJobRefs.length === 0) {
      setAllJobs([]);
      // Continue to fetch organisation jobs below
    }

    // Firestore "in" queries are limited to 30 items, so we may need to batch
    const batchSize = 30;
    const batches = [];
    for (let i = 0; i < allJobRefs.length; i += batchSize) {
      batches.push(allJobRefs.slice(i, i + batchSize));
    }

    const jobs = [];
    for (const batch of batches) {
      try {
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
      } catch (err) {
        console.error("Error fetching jobs batch:", err);
        // Continue with other batches even if one fails
      }
    }

    // Sort: owned jobs first, then by date
    jobs.sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    setAllJobs(jobs);

    // Fetch organisation jobs if user belongs to an organisation
    if (orgId) {
      try {
        const orgJobsQuery = query(
          collection(db, "jobs"),
          where("organisationId", "==", orgId)
        );
        const orgJobDocs = await getDocs(orgJobsQuery);
        const orgJobs = [];

        orgJobDocs.forEach((docSnap) => {
          const data = docSnap.data();
          // Check if this job is already in user's personal list
          const isAlreadyInList = jobs.some(j => j.reference === data.reference);

          orgJobs.push({
            ...data,
            applicationStatus: data.userId === user.uid ? "Owner" : "Org Job",
            isOwner: data.userId === user.uid,
            isOrgJob: true,
            isAlreadyInList, // Flag to track if also in personal list
          });
        });

        // Sort by creation date
        orgJobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrganisationJobs(orgJobs);
      } catch (err) {
        console.error("Error fetching organisation jobs:", err);
        setOrganisationJobs([]);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchJobsForCurrentUser();
  }, []);

  // Apply filters
  const filteredJobs = useMemo(() => {
    // Use organisation jobs when that filter is selected
    const jobsToFilter = filters.jobType === "organisation" ? organisationJobs : allJobs;

    return jobsToFilter.filter(job => {
      // Filter by job type (owned vs applied vs invited vs organisation)
      if (filters.jobType === "owned" && !job.isOwner) return false;
      if (filters.jobType === "applied" && !job.isApplied) return false;
      if (filters.jobType === "invited" && !job.isInvited) return false;
      // Organisation filter already handled by using organisationJobs array

      // Filter by job status
      if (filters.jobStatus !== "all") {
        const jobStatus = (job.status || "open").toLowerCase();
        if (jobStatus !== filters.jobStatus) return false;
      }

      // Filter by application status (only for applied jobs)
      if (filters.applicationStatus !== "all" && !job.isOwner && !job.isOrgJob) {
        const appStatus = (job.applicationStatus || "").toLowerCase();
        if (appStatus !== filters.applicationStatus) return false;
      }

      return true;
    });
  }, [allJobs, organisationJobs, filters]);

  // Calculate counts for filter badges
  const jobCounts = useMemo(() => ({
    owned: allJobs.filter(j => j.isOwner).length,
    applied: allJobs.filter(j => j.isApplied).length,
    invited: allJobs.filter(j => j.isInvited).length,
    organisation: organisationJobs.length,
  }), [allJobs, organisationJobs]);

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

          {canCreateJobs && (
            <Link to="/jobs/new">
              <MDButton variant="gradient" color="info" startIcon={<Icon>add</Icon>}>
                Post New Job
              </MDButton>
            </Link>
          )}
        </MDBox>

        {/* Filters */}
        <MyJobFilters
          filters={filters}
          setFilters={setFilters}
          jobCounts={jobCounts}
          hasOrganisation={!!userOrganisationId}
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
