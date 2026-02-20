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
import JobCard from "../JobCard";

function JobSearchResults({ results, loading }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter results by search term
  const filteredResults = results.filter((job) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      job.title?.toLowerCase().includes(search) ||
      job.location?.toLowerCase().includes(search) ||
      job.reference?.toLowerCase().includes(search) ||
      job.categories?.some(c => c.toLowerCase().includes(search))
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredResults.length / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedResults = filteredResults.slice(startIndex, startIndex + perPage);

  // Count matches and invitations
  const matchCount = results.filter(job => job.isMatch).length;
  const noMatchCount = results.filter(job => !job.isMatch).length;
  const invitedCount = results.filter(job => job.isInvited).length;

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
          Searching for jobs...
        </MDTypography>
        <style>
          {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
        </style>
      </MDBox>
    );
  }

  if (!results || results.length === 0) {
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
          Try adjusting your filters or click "Search Jobs" to see available positions
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
            {filteredResults.length} {filteredResults.length === 1 ? "Job" : "Jobs"} Found
          </MDTypography>
          <MDBox display="flex" gap={2}>
            <MDBox display="flex" alignItems="center" gap={0.5}>
              <MDBox
                width={10}
                height={10}
                borderRadius="50%"
                sx={{ background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" }}
              />
              <MDTypography variant="caption" color="text">
                {matchCount} {matchCount === 1 ? "Match" : "Matches"}
              </MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" gap={0.5}>
              <MDBox
                width={10}
                height={10}
                borderRadius="50%"
                sx={{ background: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)" }}
              />
              <MDTypography variant="caption" color="text">
                {noMatchCount} No Match
              </MDTypography>
            </MDBox>
            {invitedCount > 0 && (
              <MDBox display="flex" alignItems="center" gap={0.5}>
                <MDBox
                  width={10}
                  height={10}
                  borderRadius="50%"
                  sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                />
                <MDTypography variant="caption" color="text">
                  {invitedCount} {invitedCount === 1 ? "Invitation" : "Invitations"}
                </MDTypography>
              </MDBox>
            )}
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
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={8}>8</MenuItem>
              <MenuItem value={12}>12</MenuItem>
              <MenuItem value={16}>16</MenuItem>
            </Select>
          </FormControl>
        </MDBox>
      </MDBox>

      {/* Job Cards Grid */}
      <Grid container spacing={6}>
        {paginatedResults.map((job, index) => (
          <Grid item xs={12} md={6} xl={3} key={job.reference || index}>
            <JobCard job={job} isMatch={job.isMatch} isInvited={job.isInvited} />
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
          Showing {startIndex + 1} - {Math.min(startIndex + perPage, filteredResults.length)} of {filteredResults.length} jobs
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

export default JobSearchResults;
