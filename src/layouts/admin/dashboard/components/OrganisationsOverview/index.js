/**
 * OrganisationsOverview - Table showing all organisations with key metrics
 */

import PropTypes from "prop-types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function OrganisationsOverview({ organisations, loading }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("totalJobs");
  const [sortDirection, setSortDirection] = useState("desc");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const words = name.split(" ");
    if (words.length === 1) return name.charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort organisations
  const filteredOrgs = organisations
    .filter((org) =>
      org.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <Skeleton width={200} height={28} />
          <MDBox mt={2}>
            <Skeleton variant="rounded" height={300} />
          </MDBox>
        </MDBox>
      </Card>
    );
  }

  return (
    <Card>
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDBox display="flex" alignItems="center">
            <MDBox
              width="3rem"
              height="3rem"
              bgColor="dark"
              variant="gradient"
              borderRadius="lg"
              display="flex"
              justifyContent="center"
              alignItems="center"
              color="white"
              mr={2}
            >
              <Icon>domain</Icon>
            </MDBox>
            <MDBox>
              <MDTypography variant="h6" fontWeight="medium">
                All Organisations
              </MDTypography>
              <MDTypography variant="caption" color="text">
                {filteredOrgs.length} of {organisations.length} organisations
              </MDTypography>
            </MDBox>
          </MDBox>
          <MDBox display="flex" alignItems="center" gap={2}>
            <TextField
              size="small"
              placeholder="Search organisations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon sx={{ color: "grey.400" }}>search</Icon>
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
            <MDButton
              variant="outlined"
              color="dark"
              size="small"
              onClick={() => navigate("/admin/organisations")}
            >
              Manage
            </MDButton>
          </MDBox>
        </MDBox>

        {organisations.length === 0 ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 1 }}>business_center</Icon>
            <MDTypography variant="body2" color="text">
              No organisations registered yet
            </MDTypography>
          </MDBox>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Organisation
                    </MDTypography>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortField === "userCount"}
                      direction={sortField === "userCount" ? sortDirection : "asc"}
                      onClick={() => handleSort("userCount")}
                    >
                      <MDTypography variant="caption" fontWeight="medium" color="text">
                        Users
                      </MDTypography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortField === "totalJobs"}
                      direction={sortField === "totalJobs" ? sortDirection : "asc"}
                      onClick={() => handleSort("totalJobs")}
                    >
                      <MDTypography variant="caption" fontWeight="medium" color="text">
                        Jobs
                      </MDTypography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">
                    <TableSortLabel
                      active={sortField === "activeJobs"}
                      direction={sortField === "activeJobs" ? sortDirection : "asc"}
                      onClick={() => handleSort("activeJobs")}
                    >
                      <MDTypography variant="caption" fontWeight="medium" color="text">
                        Active
                      </MDTypography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === "totalSpend"}
                      direction={sortField === "totalSpend" ? sortDirection : "asc"}
                      onClick={() => handleSort("totalSpend")}
                    >
                      <MDTypography variant="caption" fontWeight="medium" color="text">
                        Total Spend
                      </MDTypography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Created
                    </MDTypography>
                  </TableCell>
                  <TableCell align="center">
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Actions
                    </MDTypography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow
                    key={org.id}
                    sx={{
                      "&:hover": { bgcolor: "grey.50" },
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/admin/organisations/${org.id}`)}
                  >
                    <TableCell>
                      <MDBox display="flex" alignItems="center">
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            mr: 1.5,
                            bgcolor: "info.main",
                            fontSize: "0.875rem",
                          }}
                        >
                          {getInitials(org.companyName)}
                        </Avatar>
                        <MDBox>
                          <MDTypography variant="button" fontWeight="medium">
                            {org.companyName}
                          </MDTypography>
                          {org.companyNumber && (
                            <MDTypography variant="caption" color="text" display="block">
                              {org.companyNumber}
                            </MDTypography>
                          )}
                        </MDBox>
                      </MDBox>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<Icon sx={{ fontSize: "14px !important" }}>people</Icon>}
                        label={org.userCount || 0}
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 50 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <MDTypography variant="button" fontWeight="medium">
                        {org.totalJobs || 0}
                      </MDTypography>
                    </TableCell>
                    <TableCell align="center">
                      {(org.activeJobs || 0) > 0 ? (
                        <Chip
                          label={org.activeJobs}
                          size="small"
                          color="success"
                          sx={{ minWidth: 40 }}
                        />
                      ) : (
                        <MDTypography variant="caption" color="text">
                          0
                        </MDTypography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <MDTypography
                        variant="button"
                        fontWeight="medium"
                        color={org.totalSpend > 0 ? "success" : "text"}
                      >
                        {formatCurrency(org.totalSpend)}
                      </MDTypography>
                    </TableCell>
                    <TableCell>
                      <MDTypography variant="caption" color="text">
                        {formatDate(org.createdAt)}
                      </MDTypography>
                    </TableCell>
                    <TableCell align="center">
                      <MDButton
                        variant="text"
                        color="info"
                        size="small"
                        iconOnly
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/organisations/${org.id}`);
                        }}
                      >
                        <Icon>visibility</Icon>
                      </MDButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MDBox>
    </Card>
  );
}

OrganisationsOverview.propTypes = {
  organisations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      companyName: PropTypes.string,
      companyNumber: PropTypes.string,
      userCount: PropTypes.number,
      totalJobs: PropTypes.number,
      activeJobs: PropTypes.number,
      totalSpend: PropTypes.number,
      createdAt: PropTypes.any,
    })
  ).isRequired,
  loading: PropTypes.bool,
};

OrganisationsOverview.defaultProps = {
  loading: false,
};

export default OrganisationsOverview;
