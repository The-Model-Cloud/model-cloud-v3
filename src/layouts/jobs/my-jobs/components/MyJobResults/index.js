import { useState } from "react";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Pagination from "@mui/material/Pagination";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MyJobCard from "../MyJobCard";

function MyJobResults({ jobs, loading }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(9);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter by search term
  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      job.title?.toLowerCase().includes(search) ||
      job.location?.toLowerCase().includes(search) ||
      job.reference?.toLowerCase().includes(search) ||
      job.city?.toLowerCase().includes(search) ||
      job.country?.toLowerCase().includes(search) ||
      job.categories?.some(c => c.toLowerCase().includes(search))
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredJobs.length / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + perPage);

  // Count by type
  const ownedCount = jobs.filter(job => job.isOwner).length;
  const appliedCount = jobs.filter(job => !job.isOwner).length;

  const handlePageChange = (_, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <MDBox
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={8}
      >
        <Icon sx={{ fontSize: "3rem", color: "info.main", animation: "spin 1s linear infinite" }}>
          hourglass_empty
        </Icon>
        <MDTypography variant="h6" color="text" mt={2}>
          Loading your jobs...
        </MDTypography>
        <style>
          {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
        </style>
      </MDBox>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <MDBox
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={8}
      >
        <Icon sx={{ fontSize: "4rem", color: "text.secondary", opacity: 0.5 }}>work_off</Icon>
        <MDTypography variant="h5" color="text" mt={2}>
          No jobs found
        </MDTypography>
        <MDTypography variant="body2" color="text" textAlign="center" mt={1}>
          You haven't created or applied to any jobs yet
        </MDTypography>
      </MDBox>
    );
  }

  return (
    <MDBox>
      {/* Header with stats and search */}
      <MDBox
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={3}
      >
        {/* Stats */}
        <MDBox display="flex" alignItems="center" gap={3}>
          <MDTypography variant="h6" fontWeight="medium" color="dark">
            {filteredJobs.length} {filteredJobs.length === 1 ? "Job" : "Jobs"}
          </MDTypography>
          <MDBox display="flex" gap={2}>
            <MDBox display="flex" alignItems="center" gap={0.5}>
              <MDBox
                width={10}
                height={10}
                borderRadius="50%"
                sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
              />
              <MDTypography variant="caption" color="text">
                {ownedCount} Created
              </MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" gap={0.5}>
              <MDBox
                width={10}
                height={10}
                borderRadius="50%"
                sx={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}
              />
              <MDTypography variant="caption" color="text">
                {appliedCount} Applied
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>

        {/* Search and per page */}
        <MDBox display="flex" alignItems="center" gap={2}>
          <MDInput
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            size="small"
            InputProps={{
              startAdornment: <Icon sx={{ color: "text.secondary", mr: 1 }}>search</Icon>,
            }}
            sx={{ width: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Show</InputLabel>
            <Select
              value={perPage}
              label="Show"
              onChange={(e) => {
                setPerPage(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value={6}>6</MenuItem>
              <MenuItem value={9}>9</MenuItem>
              <MenuItem value={12}>12</MenuItem>
              <MenuItem value={24}>24</MenuItem>
            </Select>
          </FormControl>
        </MDBox>
      </MDBox>

      {/* Job Cards Grid */}
      <Grid container spacing={3}>
        {paginatedJobs.map((job, index) => (
          <Grid item xs={12} sm={6} lg={4} key={job.reference || index}>
            <MyJobCard job={job} />
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <MDBox display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="info"
            size="large"
            showFirstButton
            showLastButton
          />
        </MDBox>
      )}

      {/* Results info */}
      <MDBox textAlign="center" mt={2}>
        <MDTypography variant="caption" color="text">
          Showing {startIndex + 1} - {Math.min(startIndex + perPage, filteredJobs.length)} of {filteredJobs.length} jobs
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

export default MyJobResults;
