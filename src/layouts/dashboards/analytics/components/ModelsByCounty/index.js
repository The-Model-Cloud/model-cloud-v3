import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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

function ModelsByCounty() {
  const navigate = useNavigate();
  const [countyData, setCountyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalModels, setTotalModels] = useState(0);

  const handleCountyClick = (county) => {
    if (county === "Not specified") {
      navigate(`/models/browse?country=${encodeURIComponent("United Kingdom")}`);
    } else {
      navigate(`/models/browse?country=${encodeURIComponent("United Kingdom")}&county=${encodeURIComponent(county)}`);
    }
  };

  useEffect(() => {
    const fetchModelsByCounty = async () => {
      try {
        const usersRef = collection(db, "users");
        const modelsQuery = query(
          usersRef,
          where("role", "==", "model"),
          where("country", "==", "United Kingdom")
        );
        const snapshot = await getDocs(modelsQuery);

        // Aggregate by county
        const countyCounts = {};
        let notSpecifiedCount = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const county = data.county;
          if (county && county.trim() !== "") {
            countyCounts[county] = (countyCounts[county] || 0) + 1;
          } else {
            notSpecifiedCount += 1;
          }
        });

        // Sort by count descending
        const sortedCounties = Object.entries(countyCounts)
          .sort(([, a], [, b]) => b - a);

        const total = snapshot.docs.length;

        // Format data with percentage
        const formattedData = sortedCounties.map(([county, count]) => ({
          county,
          models: count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }));

        // Add "Not specified" at the end if there are any
        if (notSpecifiedCount > 0) {
          formattedData.push({
            county: "Not specified",
            models: notSpecifiedCount,
            percentage: total > 0 ? Math.round((notSpecifiedCount / total) * 100) : 0,
          });
        }

        setCountyData(formattedData);
        setTotalModels(total);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching models by county:", error);
        setLoading(false);
      }
    };

    fetchModelsByCounty();
  }, []);

  return (
    <Card sx={{ width: "100%" }}>
      <MDBox>
        <MDTypography variant="h6" sx={{ mt: 2, ml: 2 }}>
          Models by County (UK)
        </MDTypography>
        <MDTypography
          variant="body2"
          color="text"
          sx={{ fontSize: "14px", mb: 1, ml: 2 }}
        >
          Distribution of UK models across counties. Total: {totalModels} models.
        </MDTypography>
      </MDBox>
      <MDBox p={2}>
        {loading ? (
          <MDTypography variant="body2" color="text">
            Loading...
          </MDTypography>
        ) : countyData.length === 0 ? (
          <MDTypography variant="body2" color="text">
            No UK model data available.
          </MDTypography>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="bold" color="text">
                      County
                    </MDTypography>
                  </TableCell>
                  <TableCell align="center">
                    <MDTypography variant="caption" fontWeight="bold" color="text">
                      Models
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
                {countyData.map((row) => (
                  <TableRow
                    key={row.county}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                    }}
                    onClick={() => handleCountyClick(row.county)}
                  >
                    <TableCell>
                      <MDTypography
                        variant="button"
                        fontWeight="medium"
                        sx={{
                          color: "info.main",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {row.county}
                      </MDTypography>
                    </TableCell>
                    <TableCell align="center">
                      <MDTypography variant="button" fontWeight="regular" color="text">
                        {row.models}
                      </MDTypography>
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

export default ModelsByCounty;
