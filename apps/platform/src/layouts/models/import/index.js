import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useAuth } from "context/AuthContext";

// Firebase
import { getFunctions, httpsCallable } from "firebase/functions";

// UI
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";

// Example CSV data for the template
// Gender options: Woman, Man, Transwoman, Transman, Non-binary person, Other
// Female models (Woman, Transwoman) use: bust, cup, ukDress instead of chest
// Male models (Man, Transman) use: chest
const EXAMPLE_CSV_DATA = [
  {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    gender: "Woman",
    phone: "07700900123",
    country: "United Kingdom",
    town: "London",
    county: "Greater London",
    height: "175",
    bust: "34",
    cup: "C",
    waist: "26",
    hips: "36",
    shoeSize: "6",
    ukDress: "10",
    aboutMe: "Experienced model with 5 years in fashion and commercial work.",
    instagram: "@janesmith_model",
  },
  {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    gender: "Man",
    phone: "07700900456",
    country: "United Kingdom",
    town: "Manchester",
    county: "Greater Manchester",
    height: "185",
    chest: "40",
    waist: "32",
    hips: "38",
    shoeSize: "10",
    aboutMe: "Fitness model specialising in sportswear and lifestyle campaigns.",
    instagram: "@johndoe_fitness",
  },
  {
    firstName: "Sophie",
    lastName: "Taylor",
    email: "sophie.taylor@example.com",
    gender: "Transwoman",
    phone: "07700900789",
    country: "United Kingdom",
    town: "Brighton",
    county: "East Sussex",
    height: "178",
    bust: "36",
    cup: "B",
    waist: "28",
    hips: "38",
    shoeSize: "8",
    ukDress: "12",
    aboutMe: "Runway and editorial model with a passion for inclusive fashion.",
    instagram: "@sophietaylor_model",
  },
  {
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex.morgan@example.com",
    gender: "Transman",
    phone: "07700900321",
    country: "United Kingdom",
    town: "Bristol",
    county: "Bristol",
    height: "175",
    chest: "38",
    waist: "30",
    hips: "36",
    shoeSize: "9",
    aboutMe: "Commercial model focusing on lifestyle and fitness campaigns.",
    instagram: "@alexmorgan_fit",
  },
  {
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.lee@example.com",
    gender: "Non-binary person",
    phone: "07700900654",
    country: "United Kingdom",
    town: "Edinburgh",
    county: "Midlothian",
    height: "170",
    bust: "35",
    cup: "B",
    chest: "35",
    waist: "27",
    hips: "37",
    shoeSize: "7",
    ukDress: "10",
    aboutMe: "Androgynous model working in high fashion and editorial.",
    instagram: "@jordanlee_style",
  },
  {
    firstName: "Sam",
    lastName: "Williams",
    email: "sam.williams@example.com",
    gender: "Other",
    phone: "07700900987",
    country: "United Kingdom",
    town: "Cardiff",
    county: "South Glamorgan",
    height: "168",
    bust: "33",
    cup: "A",
    chest: "33",
    waist: "25",
    hips: "35",
    shoeSize: "5",
    ukDress: "8",
    aboutMe: "Creative model specialising in art and conceptual photography.",
    instagram: "@samwilliams_art",
  },
];

// Function to download CSV template
const downloadExampleCSV = () => {
  try {
    const headers = Object.keys(EXAMPLE_CSV_DATA[0]);
    const csvContent = [
      headers.join(","),
      ...EXAMPLE_CSV_DATA.map((row) =>
        headers.map((header) => {
          const value = String(row[header] ?? "");
          // Escape values that contain commas or quotes
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "import-models-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading CSV template:", error);
  }
};

export default function ImportModels() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const allowedRoles = ["admin", "super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  useEffect(() => {
    if (loading) return;
    if (!user || !allowedRoles.includes(user?.role)) {
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    setUploading(true);
    const file = acceptedFiles[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cleaned = res.data
          .filter((row) => row.email)
          .map((row) => {
            const {
              firstName,
              lastName,
              instagram,
              email,
              gender,
              phone,
              country,
              town,
              county,
              height,
              chest,
              bust,
              cup,
              waist,
              hips,
              shoeSize,
              ukDress,
              aboutMe,
            } = row;

            const cityValue = town?.trim() ?? "";
            const countyValue = county?.trim() ?? "";
            // Default to United Kingdom if no country specified
            const countryValue = country?.trim() || "United Kingdom";

            return {
              firstName: firstName?.trim() ?? "",
              lastName: lastName?.trim() ?? "",
              instagram: instagram?.trim() ?? "",
              email: email?.trim().toLowerCase() ?? "",
              gender: gender?.trim() ?? "",
              phone: phone?.trim() ?? "",
              height: height?.trim() ?? "",
              chest: chest?.trim() ?? "",
              bust: bust?.trim() ?? "",
              cup: cup?.trim() ?? "",
              waist: waist?.trim() ?? "",
              hips: hips?.trim() ?? "",
              shoeSize: shoeSize?.trim() ?? "",
              ukDress: ukDress?.trim() ?? "",
              aboutMe: aboutMe?.trim() ?? "",
              // Store location fields separately for filtering
              country: countryValue,
              county: countyValue,
              city: cityValue,
              // Also keep combined location for display
              location: [cityValue, countyValue, countryValue].filter(Boolean).join(", ")
            };
          });

        setRawData(cleaned);
        setUploading(false);
      },
    });
  };

  const handleImport = async () => {
    setProgress(10); // Show initial progress
    setResults([]);

    try {
      const functions = getFunctions();
      const importModels = httpsCallable(functions, "importModels");

      setProgress(30); // Calling cloud function

      const response = await importModels({ models: rawData });
      const { results: importResults, summary } = response.data;

      setProgress(100);
      setResults(importResults);

      // Show summary alert
      alert(
        `Import Complete!\n\n` +
        `Created: ${summary.created}\n` +
        `Updated: ${summary.updated}\n` +
        `Linked to existing Auth: ${summary.linked}\n` +
        `Errors: ${summary.errors}`
      );
    } catch (err) {
      console.error("Import error:", err);
      setResults([{ email: "Import failed", status: "error", message: err.message }]);
      setProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    maxSize: 2 * 1024 * 1024, // 2MB
  });

  if (loading) {
    return (
      <DashboardLayout>
        <MDBox p={3}><MDTypography>Loading...</MDTypography></MDBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={4} pb={3}>
        <Grid container spacing={3}>
          {/* Template Download Card */}
          <Grid item xs={12} lg={4}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" gutterBottom>
                  CSV Template
                </MDTypography>
                <MDTypography variant="body2" color="text" mb={3}>
                  Download the example CSV template to ensure your data is formatted correctly for import.
                </MDTypography>

                <Button
                  variant="contained"
                  color="success"
                  onClick={downloadExampleCSV}
                  startIcon={<Icon>download</Icon>}
                  fullWidth
                  sx={{ mb: 3 }}
                >
                  Download Example CSV
                </Button>

                <Divider sx={{ my: 2 }} />

                <MDTypography variant="h6" gutterBottom>
                  Required Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li><MDTypography variant="caption"><strong>email</strong> - User's email address (required)</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>firstName</strong> - First name</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>lastName</strong> - Last name</MDTypography></li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Optional Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li><MDTypography variant="caption">gender, phone, country, town, county</MDTypography></li>
                  <li><MDTypography variant="caption">height, waist, hips, shoeSize</MDTypography></li>
                  <li><MDTypography variant="caption">aboutMe, instagram</MDTypography></li>
                </MDBox>
                <MDTypography variant="caption" color="text" sx={{ display: "block", mb: 2 }}>
                  <strong>Note:</strong> If country is not specified, it defaults to "United Kingdom"
                </MDTypography>

                <MDTypography variant="h6" gutterBottom>
                  Female Measurements (Woman, Transwoman)
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li><MDTypography variant="caption">bust, cup, ukDress</MDTypography></li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Male Measurements (Man, Transman)
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2 }}>
                  <li><MDTypography variant="caption">chest</MDTypography></li>
                </MDBox>

                <Divider sx={{ my: 2 }} />

                <MDTypography variant="caption" color="text">
                  New users will be created with the default password: <strong>Model123!</strong>
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          {/* Upload Card */}
          <Grid item xs={12} lg={8}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" gutterBottom>
                  Import Models via CSV
                </MDTypography>
                <MDTypography variant="body2" color="text" mb={3}>
                  Upload a CSV file containing model data. Existing users (matched by email) will be updated,
                  new users will be created with Firebase Authentication accounts.
                </MDTypography>

                <MDBox
                  {...getRootProps()}
                  border="2px dashed"
                  borderColor={isDragActive ? "info.main" : "grey.400"}
                  p={4}
                  textAlign="center"
                  borderRadius="lg"
                  sx={{ cursor: "pointer" }}
                >
                  <input {...getInputProps()} />
                  <Icon sx={{ fontSize: 40, color: "info.main" }}>cloud_upload</Icon>
                  <MDTypography variant="body1" mt={1}>
                    {isDragActive ? "Drop the CSV here..." : "Drag & drop or click to upload a CSV file"}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block" mt={1}>
                    Maximum file size: 2MB
                  </MDTypography>
                  {uploading && (
                    <MDBox mt={2}>
                      <CircularProgress size={24} color="info" />
                    </MDBox>
                  )}
                </MDBox>

                {rawData.length > 0 && (
                  <MDBox mt={3}>
                    <MDTypography variant="body2" mb={2}>
                      <strong>{rawData.length}</strong> rows ready to import
                    </MDTypography>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={handleImport}
                      startIcon={<Icon>cloud_upload</Icon>}
                      size="large"
                    >
                      Import {rawData.length} Models
                    </Button>
                  </MDBox>
                )}

                {progress > 0 && progress < 100 && (
                  <MDBox mt={3} textAlign="center">
                    <CircularProgress color="info" />
                    <MDTypography variant="body2" mt={2}>
                      Importing {rawData.length} models... Please do not close this page.
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block" mt={1}>
                      This may take a moment for large imports.
                    </MDTypography>
                  </MDBox>
                )}
              </MDBox>
            </Card>

            {/* Results Card */}
            {results.length > 0 && (
              <Card sx={{ mt: 3 }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Import Summary
                  </MDTypography>
                  <MDBox sx={{ maxHeight: 400, overflow: "auto" }}>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {results.map((res, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          <MDTypography variant="body2">
                            <strong>{res.email}</strong>:{" "}
                            <span style={{
                              color: res.status === "created" ? "green" :
                                     res.status === "updated" ? "blue" :
                                     res.status === "linked" ? "purple" : "red"
                            }}>
                              {res.status}
                            </span>
                            {res.message && ` — ${res.message}`}
                          </MDTypography>
                        </li>
                      ))}
                    </ul>
                  </MDBox>
                </MDBox>
              </Card>
            )}
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
