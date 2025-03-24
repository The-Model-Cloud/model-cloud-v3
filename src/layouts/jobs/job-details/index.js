import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDocs, query, collection, where } from "firebase/firestore";
import { db } from "config/firebase";

// MUI and MD components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Components
import JobImages from "./components/JobImages";
import JobInfo from "./components/JobInfo";

function JobDetails() {
  const { reference } = useParams();
  const [job, setJob] = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      const jobsRef = collection(db, "jobs");
      const q = query(jobsRef, where("reference", "==", reference));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setJob(querySnapshot.docs[0].data());
      }
    };
    fetchJob();
  }, [reference]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card sx={{ overflow: "visible" }}>
          <MDBox p={3}>
            <MDBox mb={3}>
              <MDTypography variant="h5" fontWeight="medium">
                Job Details
              </MDTypography>
            </MDBox>

            {job && (
              <Grid container spacing={3}>
                <Grid item xs={12} lg={6} xl={5}>
                  <JobImages media={job.media} />
                </Grid>
                <Grid item xs={12} lg={5} sx={{ mx: "auto" }}>
                  <JobInfo job={job} />
                </Grid>
              </Grid>
            )}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default JobDetails;
