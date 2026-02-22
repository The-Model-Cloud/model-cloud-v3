import PropTypes from "prop-types";

// @react-jvectormap components
import { VectorMap } from "@react-jvectormap/core";
import { worldMerc } from "@react-jvectormap/world";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Country flag images (only using available flags)
import GB from "assets/images/icons/flags/GB.png";
import US from "assets/images/icons/flags/US.png";
import DE from "assets/images/icons/flags/DE.png";
import AU from "assets/images/icons/flags/AU.png";
import BR from "assets/images/icons/flags/BR.png";

// Map country names to flags and coordinates
const countryData = {
  "United Kingdom": { flag: GB, latLng: [54.3781, -2.436] },
  "United States": { flag: US, latLng: [40.713, -74.004] },
  Germany: { flag: DE, latLng: [51.177, 10.979] },
  Australia: { flag: AU, latLng: [-25.274, 133.775] },
  Brazil: { flag: BR, latLng: [-14.235, -51.925] },
  // Countries without flag images - only coordinates for map markers
  France: { latLng: [46.228, 2.214] },
  Italy: { latLng: [41.872, 12.567] },
  Spain: { latLng: [40.464, -3.749] },
  Canada: { latLng: [56.1304, -106.3468] },
  Netherlands: { latLng: [52.1326, 5.2913] },
};

function ModelsByCountry({ geographicData }) {
  // Format GA4 country data for display
  const formatCountryData = () => {
    if (!geographicData || !geographicData.countries || geographicData.countries.length === 0) {
      return [];
    }

    return geographicData.countries.map(item => {
      const info = countryData[item.country];
      return {
        country: item.country,
        flag: info?.flag || null,
        sessions: item.sessions,
        users: item.users,
      };
    });
  };

  // Create markers for the map
  const createMarkers = () => {
    if (!geographicData || !geographicData.countries) {
      return [];
    }

    return geographicData.countries
      .filter(item => countryData[item.country])
      .map(item => ({
        name: item.country,
        latLng: countryData[item.country].latLng,
      }));
  };

  const tableData = formatCountryData();
  const markers = createMarkers();

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
          Visits by Country
        </MDTypography>
        <MDTypography
          variant="body2"
          color="text"
          sx={{ fontSize: "14px", mb: 1, ml: 2 }}
        >
          Website traffic by country (last 30 days)
        </MDTypography>
      </MDBox>
      <MDBox p={2}>
        {tableData.length === 0 ? (
          <MDTypography variant="body2" color="text">
            No data available.
          </MDTypography>
        ) : (
          <Grid container>
            <Grid item xs={12} md={7} lg={6}>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {tableData.map((row, index) => (
                      <TableRow
                        key={row.country}
                        sx={{
                          "&:last-child td": { borderBottom: "none" },
                        }}
                      >
                        <TableCell sx={{ py: 1, borderBottom: index === tableData.length - 1 ? "none" : undefined }}>
                          <MDBox display="flex" alignItems="center" gap={1}>
                            {row.flag && (
                              <MDBox
                                component="img"
                                src={row.flag}
                                alt={row.country}
                                sx={{ width: 20, height: 14, objectFit: "cover" }}
                              />
                            )}
                            <MDTypography
                              variant="button"
                              fontWeight="medium"
                            >
                              {row.country}
                            </MDTypography>
                          </MDBox>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, borderBottom: index === tableData.length - 1 ? "none" : undefined }}>
                          <MDBox textAlign="right">
                            <MDTypography variant="button" fontWeight="bold" color="text">
                              {formatNumber(row.sessions)}
                            </MDTypography>
                            <MDTypography variant="caption" color="text" display="block">
                              {formatNumber(row.users)} users
                            </MDTypography>
                          </MDBox>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={5} lg={6} sx={{ mt: { xs: 5, lg: 0 } }}>
              <VectorMap
                map={worldMerc}
                zoomOnScroll={false}
                zoomButtons={false}
                markersSelectable
                backgroundColor="transparent"
                selectedMarkers={markers.map((_, i) => i)}
                markers={markers}
                regionStyle={{
                  initial: {
                    fill: "#dee2e7",
                    "fill-opacity": 1,
                    stroke: "none",
                    "stroke-width": 0,
                    "stroke-opacity": 0,
                  },
                }}
                markerStyle={{
                  initial: {
                    fill: "#1A73E8",
                    stroke: "#ffffff",
                    "stroke-width": 5,
                    "stroke-opacity": 0.5,
                    r: 7,
                  },
                  hover: {
                    fill: "#1A73E8",
                    stroke: "#ffffff",
                    "stroke-width": 5,
                    "stroke-opacity": 0.5,
                  },
                  selected: {
                    fill: "#1A73E8",
                    stroke: "#ffffff",
                    "stroke-width": 5,
                    "stroke-opacity": 0.5,
                  },
                }}
                style={{
                  marginTop: "-1.5rem",
                }}
                onRegionTipShow={() => false}
                onMarkerTipShow={() => false}
              />
            </Grid>
          </Grid>
        )}
      </MDBox>
    </Card>
  );
}

ModelsByCountry.propTypes = {
  geographicData: PropTypes.shape({
    countries: PropTypes.arrayOf(
      PropTypes.shape({
        country: PropTypes.string,
        sessions: PropTypes.number,
        users: PropTypes.number,
      })
    ),
    cities: PropTypes.array,
  }),
};

ModelsByCountry.defaultProps = {
  geographicData: {
    countries: [],
    cities: [],
  },
};

export default ModelsByCountry;
