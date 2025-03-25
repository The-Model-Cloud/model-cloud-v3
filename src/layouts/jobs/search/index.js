import { useState } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

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
        <MDTypography variant="h4" mb={2}>Search Jobs</MDTypography>

        {/* Filters */}
        <JobSearchFilters setFilters={setFilters} setLoading={setLoading} setResults={setResults} />

        {/* Results Table */}
        <Card sx={{ mt: 3 }}>
          <JobSearchResults results={results} loading={loading} />
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default JobSearch;
