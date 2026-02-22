import { useState } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";

import JobSearchFilters from "./components/JobSearchFilters";
import JobSearchResults from "./components/JobSearchResults";

function JobSearch() {
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox my={3}>
        {/* Page Header */}
        <MDBox mb={3}>
          <MDBox display="flex" alignItems="center" gap={1} mb={1}>
            <Icon sx={{ color: "info.main", fontSize: "2rem" }}>work</Icon>
            <MDTypography variant="h4" fontWeight="bold" color="dark">
              Search Jobs
            </MDTypography>
          </MDBox>
          <MDTypography variant="body2" color="text">
            Discover opportunities that match your skills and preferences
          </MDTypography>
        </MDBox>

        {/* Filters */}
        <JobSearchFilters
          setFilters={setFilters}
          setLoading={setLoading}
          setResults={setResults}
        />

        {/* Results */}
        <MDBox mt={4}>
          <JobSearchResults results={results} loading={loading} />
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default JobSearch;
