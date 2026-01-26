import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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
};

function ModelsByCountry() {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalModels, setTotalModels] = useState(0);

  useEffect(() => {
    const fetchModelsByCountry = async () => {
      try {
        const usersRef = collection(db, "users");
        const modelsQuery = query(usersRef, where("role", "==", "model"));
        const snapshot = await getDocs(modelsQuery);

        // Aggregate by country
        const countryCounts = {};
        let notSpecifiedCount = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const country = data.country;
          if (country && country.trim() !== "") {
            countryCounts[country] = (countryCounts[country] || 0) + 1;
          } else {
            notSpecifiedCount += 1;
          }
        });

        // Sort by count descending
        const sortedCountries = Object.entries(countryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10); // Top 10 countries

        // Format data with flag info
        const formattedData = sortedCountries.map(([country, count]) => {
          const info = countryData[country];
          return {
            country,
            flag: info?.flag || null,
            count,
          };
        });

        // Add "Not specified" at the end if there are any
        if (notSpecifiedCount > 0) {
          formattedData.push({
            country: "Not specified",
            flag: null,
            count: notSpecifiedCount,
          });
        }

        // Create markers for the map
        const mapMarkers = sortedCountries
          .filter(([country]) => countryData[country])
          .map(([country]) => ({
            name: country,
            latLng: countryData[country].latLng,
          }));

        const total = snapshot.docs.length;
        setTableData(formattedData);
        setMarkers(mapMarkers);
        setTotalModels(total);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching models by country:", error);
        setLoading(false);
      }
    };

    fetchModelsByCountry();
  }, []);

  const handleCountryClick = (country) => {
    if (country === "Not specified") {
      // Navigate without filter to show all, user can see unfiltered
      navigate("/models/browse");
    } else {
      navigate(`/models/browse?country=${encodeURIComponent(country)}`);
    }
  };

  return (
    <Card sx={{ width: "100%" }}>
      <MDBox>
        <MDTypography variant="h6" sx={{ mt: 2, ml: 2 }}>
          Models by Country
        </MDTypography>
        <MDTypography
          variant="body2"
          color="text"
          sx={{ fontSize: "14px", mb: 1, ml: 2 }}
        >
          Distribution of models across countries. Total: {totalModels} models.
        </MDTypography>
      </MDBox>
      <MDBox p={2}>
        {loading ? (
          <MDTypography variant="body2" color="text">
            Loading...
          </MDTypography>
        ) : tableData.length === 0 ? (
          <MDTypography variant="body2" color="text">
            No model data available.
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
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                        }}
                        onClick={() => handleCountryClick(row.country)}
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
                              sx={{
                                color: "info.main",
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {row.country}
                            </MDTypography>
                          </MDBox>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, borderBottom: index === tableData.length - 1 ? "none" : undefined }}>
                          <MDTypography variant="button" fontWeight="regular" color="text">
                            {row.count}
                          </MDTypography>
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

export default ModelsByCountry;
