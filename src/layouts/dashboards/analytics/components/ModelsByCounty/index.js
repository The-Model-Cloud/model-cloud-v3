import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDProgress from "components/MDProgress";

function ModelsByCounty({ geographicData }) {
  // Format GA4 city data for display
  const formatCityData = () => {
    if (!geographicData || !geographicData.cities || geographicData.cities.length === 0) {
      return [];
    }

    // Calculate total sessions for percentage
    const totalSessions = geographicData.cities.reduce((sum, city) => sum + city.sessions, 0);

    return geographicData.cities.map(item => ({
      city: item.city,
      country: item.country,
      sessions: item.sessions,
      users: item.users,
      percentage: totalSessions > 0 ? Math.round((item.sessions / totalSessions) * 100) : 0,
    }));
  };

  const cityData = formatCityData();

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <Card sx={{ width: "100%" }}>
      <MDBox>
        <MDTypography variant="h6" sx={{ mt: 2, ml: 2 }}>
          Visits by City
        </MDTypography>
        <MDTypography
          variant="body2"
          color="text"
          sx={{ fontSize: "14px", mb: 1, ml: 2 }}
        >
          Top cities by website traffic (last 30 days)
        </MDTypography>
      </MDBox>
      <MDBox p={2}>
        {cityData.length === 0 ? (
          <MDTypography variant="body2" color="text">
            No data available.
          </MDTypography>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="bold" color="text">
                      City
                    </MDTypography>
                  </TableCell>
                  <TableCell align="center">
                    <MDTypography variant="caption" fontWeight="bold" color="text">
                      Sessions
                    </MDTypography>
                  </TableCell>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="bold" color="text">
                      Distribution
                    </MDTypography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cityData.map((row) => (
                  <TableRow
                    key={`${row.city}-${row.country}`}
                  >
                    <TableCell>
                      <MDBox>
                        <MDTypography
                          variant="button"
                          fontWeight="medium"
                        >
                          {row.city}
                        </MDTypography>
                        <MDTypography
                          variant="caption"
                          color="text"
                          display="block"
                        >
                          {row.country}
                        </MDTypography>
                      </MDBox>
                    </TableCell>
                    <TableCell align="center">
                      <MDBox textAlign="center">
                        <MDTypography variant="button" fontWeight="bold" color="text">
                          {formatNumber(row.sessions)}
                        </MDTypography>
                        <MDTypography variant="caption" color="text" display="block">
                          {formatNumber(row.users)} users
                        </MDTypography>
                      </MDBox>
                    </TableCell>
                    <TableCell>
                      <MDBox display="flex" alignItems="center">
                        <MDBox width="100%" mr={1}>
                          <MDProgress
                            value={row.percentage}
                            color="info"
                            variant="gradient"
                          />
                        </MDBox>
                        <MDTypography variant="caption" color="text">
                          {row.percentage}%
                        </MDTypography>
                      </MDBox>
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

ModelsByCounty.propTypes = {
  geographicData: PropTypes.shape({
    countries: PropTypes.array,
    cities: PropTypes.arrayOf(
      PropTypes.shape({
        city: PropTypes.string,
        country: PropTypes.string,
        sessions: PropTypes.number,
        users: PropTypes.number,
      })
    ),
  }),
};

ModelsByCounty.defaultProps = {
  geographicData: {
    countries: [],
    cities: [],
  },
};

export default ModelsByCounty;
