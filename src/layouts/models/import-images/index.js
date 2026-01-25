import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useAuth } from "context/AuthContext";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

// Firebase
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";

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
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;

// Example CSV data for the template
const EXAMPLE_CSV_DATA = [
  {
    email: "jane.smith@example.com",
    picture: "prof_616_1599207369.jpg",
    user_id: "616",
  },
  {
    email: "john.doe@example.com",
    picture: "prof_789_1601234567.jpg",
    user_id: "789",
  },
  {
    email: "sarah.jones@example.com",
    picture: "prof_1024_1605678901.jpg",
    user_id: "1024",
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
    link.download = "import-images-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading CSV template:", error);
  }
};

function CircularProgressWithLabel({ value }) {
  return (
    <Box position="relative" display="inline-flex">
      <CircularProgress variant="determinate" value={value} size={60} />
      <Box
        top={0}
        left={0}
        bottom={0}
        right={0}
        position="absolute"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography variant="caption" component="div" color="text.secondary">
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ImportModelImages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [baseUrl, setBaseUrl] = useState("https://themodelcloud.co.uk/images/jblance/user/");
  const [imageField, setImageField] = useState("profileAvatar");
  const [stats, setStats] = useState({ success: 0, skipped: 0, error: 0 });

  const allowedRoles = ["admin", "super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  useEffect(() => {
    if (loading) return;
    if (!user || !allowedRoles.includes(user?.role)) {
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const onDrop = (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    setUploading(true);
    setResults([]);
    setStats({ success: 0, skipped: 0, error: 0 });
    const file = acceptedFiles[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        // Clean and validate the data
        const cleaned = res.data
          .filter((row) => row.email && row.picture) // Must have both email and picture
          .map((row) => ({
            email: row.email?.trim().toLowerCase(),
            picture: row.picture?.trim(),
            joomla_user_id: row.user_id || row.joomla_user_id || null,
          }));

        setRawData(cleaned);
        setUploading(false);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setUploading(false);
      }
    });
  };

  const uploadToCloudinary = async (imageUrl, userId) => {
    // Create a form data to upload via URL
    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
    formData.append("folder", "users/imported"); // Organize imported images
    formData.append("public_id", `user_${userId}_profile`); // Unique ID for the image

    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.secure_url;
  };

  const handleImport = async () => {
    const db = getFirestore();
    const feedback = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    setUploading(true);
    setProgress(0);

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const email = row.email;
      const pictureFilename = row.picture;

      try {
        // Step 1: Find the user in Firestore by email
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          feedback.push({
            email,
            picture: pictureFilename,
            status: "skipped",
            message: "User not found in Firestore",
          });
          skippedCount++;
          setProgress(((i + 1) / rawData.length) * 100);
          continue;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Step 2: Check if user already has this field populated
        if (userData[imageField] && !userData[imageField].includes("jblance")) {
          feedback.push({
            email,
            picture: pictureFilename,
            status: "skipped",
            message: `User already has ${imageField} set`,
          });
          skippedCount++;
          setProgress(((i + 1) / rawData.length) * 100);
          continue;
        }

        // Step 3: Build the full image URL
        const fullImageUrl = baseUrl.endsWith("/")
          ? `${baseUrl}${pictureFilename}`
          : `${baseUrl}/${pictureFilename}`;

        // Step 4: Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(fullImageUrl, userDoc.id);

        // Step 5: Update Firestore document
        await updateDoc(userDoc.ref, {
          [imageField]: cloudinaryUrl,
          updatedAt: new Date().toISOString(),
        });

        feedback.push({
          email,
          picture: pictureFilename,
          status: "success",
          message: "Image uploaded and profile updated",
          cloudinaryUrl,
        });
        successCount++;

      } catch (err) {
        feedback.push({
          email,
          picture: pictureFilename,
          status: "error",
          message: err.message,
        });
        errorCount++;
      }

      setProgress(((i + 1) / rawData.length) * 100);
      setStats({ success: successCount, skipped: skippedCount, error: errorCount });
    }

    setResults(feedback);
    setUploading(false);

    // Log admin action
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        action: ADMIN_ACTIONS.IMPORT_IMAGES,
        description: `Imported ${successCount} images via CSV`,
        details: {
          total: rawData.length,
          success: successCount,
          skipped: skippedCount,
          errors: errorCount,
          targetField: imageField,
          baseUrl,
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  if (loading) {
    return (
      <DashboardLayout>
        <MDBox p={3}>
          <MDTypography>Loading...</MDTypography>
        </MDBox>
      </DashboardLayout>
    );
  }

  if (!isAuthorised) {
    return (
      <DashboardLayout>
        <MDBox p={3}>
          <Alert severity="error">You do not have permission to access this page.</Alert>
        </MDBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={4} pb={3}>
        <Grid container spacing={3}>
          {/* Configuration Card */}
          <Grid item xs={12} lg={4}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" gutterBottom>
                  CSV Template
                </MDTypography>
                <MDTypography variant="body2" color="text" mb={3}>
                  Download the example CSV template to ensure your data is formatted correctly.
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

                <MDTypography variant="h5" gutterBottom>
                  Configuration
                </MDTypography>

                <MDBox mb={3}>
                  <TextField
                    label="Image Base URL"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    fullWidth
                    helperText="The base URL where Joomla images are hosted"
                    size="small"
                  />
                </MDBox>

                <MDBox mb={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Target Field</InputLabel>
                    <Select
                      value={imageField}
                      onChange={(e) => setImageField(e.target.value)}
                      label="Target Field"
                    >
                      <MenuItem value="profileAvatar">Profile Avatar</MenuItem>
                      <MenuItem value="portfolioImages">Portfolio Images</MenuItem>
                      <MenuItem value="digitalImages">Digital Images</MenuItem>
                    </Select>
                  </FormControl>
                  <MDTypography variant="caption" color="text">
                    Which Firestore field to update with the Cloudinary URL
                  </MDTypography>
                </MDBox>

                <Divider sx={{ my: 2 }} />

                <MDTypography variant="h6" gutterBottom>
                  Required Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li><MDTypography variant="caption"><strong>email</strong> - User's email (to match in Firestore)</MDTypography></li>
                  <li><MDTypography variant="caption"><strong>picture</strong> - Image filename from Joomla</MDTypography></li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Optional Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2 }}>
                  <li><MDTypography variant="caption"><strong>user_id</strong> - Joomla user ID (for reference)</MDTypography></li>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

          {/* Upload Card */}
          <Grid item xs={12} lg={8}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" gutterBottom>
                  Import Model Images from Joomla
                </MDTypography>
                <MDTypography variant="body2" color="text" mb={3}>
                  Upload a CSV file containing email addresses and image filenames from the Joomla database.
                  Images will be fetched from the source, uploaded to Cloudinary, and linked to user profiles.
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
                    {isDragActive
                      ? "Drop the CSV here..."
                      : "Drag & drop or click to upload a CSV file"}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block" mt={1}>
                    CSV with columns: email, picture
                  </MDTypography>
                </MDBox>

                {rawData.length > 0 && !uploading && progress === 0 && (
                  <MDBox mt={3}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>{rawData.length}</strong> records ready to import
                    </Alert>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={handleImport}
                      startIcon={<Icon>cloud_upload</Icon>}
                      size="large"
                    >
                      Start Import ({rawData.length} images)
                    </Button>
                  </MDBox>
                )}

                {uploading && (
                  <MDBox mt={3} textAlign="center">
                    <CircularProgressWithLabel value={progress} />
                    <MDTypography variant="body2" mt={2}>
                      Importing images... Please do not close this page.
                    </MDTypography>
                  </MDBox>
                )}

                {/* Stats Summary */}
                {(stats.success > 0 || stats.skipped > 0 || stats.error > 0) && (
                  <MDBox mt={3} display="flex" gap={2} justifyContent="center">
                    <Chip
                      label={`${stats.success} Success`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${stats.skipped} Skipped`}
                      color="warning"
                      variant="outlined"
                    />
                    <Chip
                      label={`${stats.error} Errors`}
                      color="error"
                      variant="outlined"
                    />
                  </MDBox>
                )}
              </MDBox>
            </Card>

            {/* Results Card */}
            {results.length > 0 && (
              <Card sx={{ mt: 3 }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" gutterBottom>
                    Import Results
                  </MDTypography>
                  <MDBox
                    sx={{
                      maxHeight: 400,
                      overflow: "auto",
                    }}
                  >
                    {results.map((res, i) => (
                      <MDBox
                        key={i}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        py={1}
                        px={2}
                        mb={1}
                        borderRadius="md"
                        sx={{
                          bgcolor:
                            res.status === "success"
                              ? "success.light"
                              : res.status === "skipped"
                              ? "warning.light"
                              : "error.light",
                        }}
                      >
                        <MDBox>
                          <MDTypography variant="button" fontWeight="medium">
                            {res.email}
                          </MDTypography>
                          <MDTypography variant="caption" display="block" color="text">
                            {res.picture}
                          </MDTypography>
                        </MDBox>
                        <MDBox textAlign="right">
                          <Chip
                            label={res.status}
                            size="small"
                            color={
                              res.status === "success"
                                ? "success"
                                : res.status === "skipped"
                                ? "warning"
                                : "error"
                            }
                          />
                          {res.message && (
                            <MDTypography
                              variant="caption"
                              display="block"
                              color="text"
                              sx={{ maxWidth: 300 }}
                            >
                              {res.message}
                            </MDTypography>
                          )}
                        </MDBox>
                      </MDBox>
                    ))}
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
