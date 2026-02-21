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
// All imported clients will be "client" role on "free" tier by default
const EXAMPLE_CSV_DATA = [
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@fashionhouse.co.uk",
    phone: "02071234567",
    companyName: "Fashion House Studios",
    companyNumber: "12345678",
    vatNumber: "GB123456789",
    address1: "123 Oxford Street",
    address2: "Suite 4B",
    city: "London",
    county: "Greater London",
    country: "United Kingdom",
    postcode: "W1D 1BS",
    instagram: "@fashionhousestudios",
    companyDescription: "Award-winning fashion photography studio specialising in editorial and commercial campaigns for luxury brands.",
  },
  {
    firstName: "James",
    lastName: "Williams",
    email: "james.williams@creativemedia.com",
    phone: "01234567890",
    companyName: "Creative Media Agency",
    companyNumber: "87654321",
    vatNumber: "",
    address1: "45 High Street",
    address2: "",
    city: "Manchester",
    county: "Greater Manchester",
    country: "United Kingdom",
    postcode: "M1 1AA",
    instagram: "@creativemediauk",
    companyDescription: "Full-service creative agency delivering innovative marketing campaigns and brand experiences.",
  },
  {
    firstName: "Emma",
    lastName: "Brown",
    email: "emma@brownproductions.co.uk",
    phone: "01onal445566",
    companyName: "Brown Productions Ltd",
    companyNumber: "11223344",
    vatNumber: "GB987654321",
    address1: "78 Queen Street",
    address2: "Floor 2",
    city: "Birmingham",
    county: "West Midlands",
    country: "United Kingdom",
    postcode: "B1 1AA",
    instagram: "@brownproductions",
    companyDescription: "Video production company creating compelling content for TV, film, and digital platforms.",
  },
  {
    firstName: "Michael",
    lastName: "Davis",
    email: "m.davis@eventplanners.com",
    phone: "02089991234",
    companyName: "Event Planners International",
    companyNumber: "55667788",
    vatNumber: "",
    address1: "22 Park Lane",
    address2: "",
    city: "Leeds",
    county: "West Yorkshire",
    country: "United Kingdom",
    postcode: "LS1 2AB",
    instagram: "",
    companyDescription: "Professional event management for corporate functions, product launches, and fashion shows.",
  },
  {
    firstName: "Lisa",
    lastName: "Taylor",
    email: "lisa.taylor@independentcreative.com",
    phone: "07700900111",
    companyName: "",
    companyNumber: "",
    vatNumber: "",
    address1: "10 Church Road",
    address2: "",
    city: "Bristol",
    county: "Bristol",
    country: "United Kingdom",
    postcode: "BS1 5TJ",
    instagram: "@lisataylorcreative",
    companyDescription: "",
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
    link.download = "import-clients-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading CSV template:", error);
  }
};

export default function ImportClients() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Only super admin can access this page
  const allowedRoles = ["super admin"];
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
              email,
              phone,
              companyName,
              companyNumber,
              vatNumber,
              address1,
              address2,
              city,
              county,
              country,
              postcode,
              instagram,
              companyDescription,
            } = row;

            // Default to United Kingdom if no country specified
            const countryValue = country?.trim() || "United Kingdom";

            return {
              firstName: firstName?.trim() ?? "",
              lastName: lastName?.trim() ?? "",
              email: email?.trim().toLowerCase() ?? "",
              phone: phone?.trim() ?? "",
              companyName: companyName?.trim() ?? "",
              companyNumber: companyNumber?.trim() ?? "",
              vatNumber: vatNumber?.trim() ?? "",
              address1: address1?.trim() ?? "",
              address2: address2?.trim() ?? "",
              city: city?.trim() ?? "",
              county: county?.trim() ?? "",
              country: countryValue,
              postcode: postcode?.trim() ?? "",
              instagram: instagram?.trim() ?? "",
              companyDescription: companyDescription?.trim() ?? "",
            };
          });

        setRawData(cleaned);
        setUploading(false);
      },
    });
  };

  const handleImport = async () => {
    setProgress(10);
    setResults([]);

    try {
      const functions = getFunctions();
      const importClients = httpsCallable(functions, "importClients");

      setProgress(30);

      const response = await importClients({ clients: rawData });
      const { results: importResults, summary } = response.data;

      setProgress(100);
      setResults(importResults);

      // Show summary alert
      alert(
        `Import Complete!\n\n` +
        `Created: ${summary.created}\n` +
        `Updated: ${summary.updated}\n` +
        `Linked to existing Auth: ${summary.linked}\n` +
        `Organisations created: ${summary.organisationsCreated}\n` +
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
                  <li><MDTypography variant="caption"><strong>email</strong> - Client&apos;s email address (required)</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>firstName</strong> - First name</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>lastName</strong> - Last name</MDTypography></li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Organisation Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li><MDTypography variant="caption"><strong>companyName</strong> - Organisation name (creates or links to org)</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>companyNumber</strong> - Company registration number</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>vatNumber</strong> - VAT number</MDTypography></li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Address Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li><MDTypography variant="caption">address1, address2, city, county, country, postcode</MDTypography></li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Contact Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li><MDTypography variant="caption">phone</MDTypography></li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Company Profile Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2 }}>
                  <li><MDTypography variant="caption"><strong>instagram</strong> - Company Instagram handle</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>companyDescription</strong> - About the company</MDTypography></li>
                </MDBox>

                <Divider sx={{ my: 2 }} />

                <MDTypography variant="caption" color="text" sx={{ display: "block", mb: 2 }}>
                  <strong>Note:</strong> If country is not specified, it defaults to &quot;United Kingdom&quot;
                </MDTypography>

                <MDTypography variant="caption" color="text" sx={{ display: "block", mb: 2 }}>
                  <strong>Organisations:</strong> If companyName is provided, clients will be linked to an existing organisation with that name, or a new one will be created automatically.
                </MDTypography>

                <MDTypography variant="caption" color="text" sx={{ display: "block", mb: 2 }}>
                  <strong>Tier:</strong> All imported clients default to the <strong>Free</strong> tier. Upgrade manually via the Organisations page or when clients self-upgrade.
                </MDTypography>

                <MDTypography variant="caption" color="text">
                  New users will be created with the default password: <strong>Client123!</strong>
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          {/* Upload Card */}
          <Grid item xs={12} lg={8}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" gutterBottom>
                  Import Clients via CSV
                </MDTypography>
                <MDTypography variant="body2" color="text" mb={3}>
                  Upload a CSV file containing client data. Existing users (matched by email) will be updated,
                  new users will be created with Firebase Authentication accounts and linked to organisations.
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
                      Import {rawData.length} Clients
                    </Button>
                  </MDBox>
                )}

                {progress > 0 && progress < 100 && (
                  <MDBox mt={3} textAlign="center">
                    <CircularProgress color="info" />
                    <MDTypography variant="body2" mt={2}>
                      Importing {rawData.length} clients... Please do not close this page.
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
                            {res.organisationName && (
                              <span style={{ color: "grey" }}> ({res.organisationName})</span>
                            )}
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
