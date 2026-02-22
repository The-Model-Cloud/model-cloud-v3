import { useState, useEffect, useRef } from "react";
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
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;

/**
 * Strip surrounding single or double quotes from a string
 * Handles CSV exports that wrap values in quotes like 'value' or "value"
 */
function stripQuotes(str) {
  if (!str) return str;
  let result = str.trim();
  // Remove surrounding single quotes
  if (result.startsWith("'") && result.endsWith("'")) {
    result = result.slice(1, -1);
  }
  // Remove surrounding double quotes
  if (result.startsWith('"') && result.endsWith('"')) {
    result = result.slice(1, -1);
  }
  return result.trim();
}

// Example CSV data for the template
const EXAMPLE_CSV_DATA = [
  {
    email: "jane.smith@example.com",
    user_id: "942",
    title: "Main Portfolio",
    picture: '{"0":"photo1.jpg;port_1620403664_photo1.jpg;170831","1":"photo2.jpg;port_1620403665_photo2.jpg;400170"}',
  },
  {
    email: "john.doe@example.com",
    user_id: "619",
    title: "Polaroids/Digitals",
    picture: '{"0":"digital1.jpg;port_1599551314_digital1.jpg;80338","1":"digital2.jpg;port_1599551317_digital2.jpg;95742"}',
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
    link.download = "import-portfolio-images-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading CSV template:", error);
  }
};

function LinearProgressWithLabel({ value, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
      <Box sx={{ width: "100%", mr: 1 }}>
        <LinearProgress variant="determinate" value={value} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">
          {label || `${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Parse the picture JSON and extract image filenames
 * Format: {"0":"original.jpg;cloudinary_filename.jpg;filesize","1":"..."}
 * Returns array of cloudinary filenames
 */
function parsePortfolioImages(pictureJson) {
  if (!pictureJson || pictureJson === "{}" || pictureJson.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(pictureJson);
    const images = [];

    // Iterate through the JSON object keys (0, 1, 2, etc.)
    Object.keys(parsed).forEach((key) => {
      const value = parsed[key];
      if (value && typeof value === "string") {
        // Split by semicolon: original_filename;cloudinary_filename;filesize
        const parts = value.split(";");
        if (parts.length >= 2) {
          // The cloudinary filename is the second part
          const cloudinaryFilename = parts[1].trim();
          if (cloudinaryFilename) {
            images.push({
              index: parseInt(key, 10),
              filename: cloudinaryFilename,
              originalFilename: parts[0],
              filesize: parts[2] ? parseInt(parts[2], 10) : 0,
            });
          }
        }
      }
    });

    // Sort by index to maintain order
    images.sort((a, b) => a.index - b.index);
    return images;
  } catch (error) {
    console.error("Error parsing portfolio images JSON:", error, pictureJson);
    return [];
  }
}

/**
 * Determine target field based on title
 * "Portfolio" -> portfolioImages
 * "Digital" -> digitalImages
 */
function getTargetFieldFromTitle(title) {
  if (!title) return null;
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("digital") || lowerTitle.includes("polaroid")) {
    return "digitalImages";
  }
  if (lowerTitle.includes("portfolio") || lowerTitle.includes("main") || lowerTitle.includes("fashion")) {
    return "portfolioImages";
  }

  // Default to portfolio if neither matches
  return "portfolioImages";
}

/**
 * Get the tracking field name for imported filenames
 * This stores the original filenames from imports to prevent duplicates
 */
function getTrackingFieldFromTargetField(targetField) {
  return targetField === "digitalImages" ? "importedDigitalFilenames" : "importedPortfolioFilenames";
}

export default function ImportPortfolioImages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImage, setCurrentImage] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://app.themodel.cloud/images/jblance/portfolio/original/");
  const [stats, setStats] = useState({ success: 0, skipped: 0, error: 0, duplicates: 0, totalImages: 0 });
  const [stopRequested, setStopRequested] = useState(false);
  const stopRequestedRef = useRef(false);

  const allowedRoles = ["admin", "super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  useEffect(() => {
    if (loading) return;
    if (!user || !allowedRoles.includes(user?.role)) {
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const [filteredOutCount, setFilteredOutCount] = useState(0);

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    setValidating(true);
    setResults([]);
    setStats({ success: 0, skipped: 0, error: 0, duplicates: 0, totalImages: 0 });
    setFilteredOutCount(0);
    setProcessedData([]);
    setStopRequested(false);
    stopRequestedRef.current = false;

    const file = acceptedFiles[0];

    // First, read the file as text to handle the malformed CSV manually
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target.result;
      const lines = csvText.split("\n").filter((line) => line.trim());

      // Get header row
      const headerLine = lines[0];
      const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

      // Find column indices
      const emailIdx = headers.findIndex((h) => h === "email");
      const titleIdx = headers.findIndex((h) => h === "title");
      const userIdIdx = headers.findIndex((h) => h === "user_id" || h === "joomla_user_id");

      // Process data rows (skip header)
      const cleaned = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Find the JSON part - it starts with "{" or "{"
        const jsonStartMatch = line.match(/,\s*"?\{/);
        if (!jsonStartMatch) continue;

        const jsonStartIdx = jsonStartMatch.index + 1; // After the comma
        const beforeJson = line.substring(0, jsonStartMatch.index);
        let pictureJson = line.substring(jsonStartIdx);

        // Strip surrounding double quotes from JSON if present
        pictureJson = pictureJson.trim();
        if (pictureJson.startsWith('"') && pictureJson.endsWith('"')) {
          pictureJson = pictureJson.slice(1, -1);
        }

        // Parse the fields before the JSON
        const fields = beforeJson.split(",").map((f) => stripQuotes(f.trim()));

        // Map fields based on header positions (simplified: assume user_id, email, title order)
        // But check headers to be safe
        let email, title, userId;

        if (emailIdx !== -1 && emailIdx < fields.length) {
          email = fields[emailIdx]?.toLowerCase();
        } else {
          // Fallback: assume second field is email
          email = fields[1]?.toLowerCase();
        }

        if (titleIdx !== -1 && titleIdx < fields.length) {
          title = fields[titleIdx];
        } else {
          // Fallback: assume third field is title
          title = fields[2] || "Portfolio";
        }

        if (userIdIdx !== -1 && userIdIdx < fields.length) {
          userId = fields[userIdIdx];
        } else {
          // Fallback: assume first field is user_id
          userId = fields[0];
        }

        if (email && pictureJson) {
          cleaned.push({
            email,
            title: title || "Portfolio",
            picture: pictureJson,
            joomla_user_id: userId || null,
          });
        }
      }

      // Process each row and validate against Firestore
      const db = getFirestore();
      const validRecords = [];
      let skippedCount = 0;
      let totalImageCount = 0;
      let duplicateCount = 0;

      for (const row of cleaned) {
        try {
          // Parse the portfolio images from JSON
          const images = parsePortfolioImages(row.picture);

          // Skip if no valid images found
          if (images.length === 0) {
            skippedCount++;
            continue;
          }

          // Lookup user by email
          const q = query(collection(db, "users"), where("email", "==", row.email));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            const targetField = getTargetFieldFromTitle(row.title);
            const trackingField = getTrackingFieldFromTargetField(targetField);

            // Get already imported filenames for this user
            const alreadyImported = userData[trackingField] || [];

            // Filter out images that have already been imported
            const newImages = images.filter((img) => {
              const isAlreadyImported = alreadyImported.includes(img.filename);
              if (isAlreadyImported) {
                duplicateCount++;
              }
              return !isAlreadyImported;
            });

            // Only add record if there are new images to import
            if (newImages.length > 0) {
              validRecords.push({
                ...row,
                images: newImages,
                originalImageCount: images.length,
                targetField,
                trackingField,
                userDocRef: userDoc.ref,
                userData: { ...userData, uid: userDoc.id },
              });

              totalImageCount += newImages.length;
            } else if (images.length > 0) {
              // All images were duplicates
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        } catch (err) {
          console.error(`Error processing row for ${row.email}:`, err);
          skippedCount++;
        }
      }

      setFilteredOutCount(skippedCount);
      setRawData(cleaned);
      setProcessedData(validRecords);
      setStats((prev) => ({ ...prev, totalImages: totalImageCount, duplicates: duplicateCount }));
      setValidating(false);
    };

    reader.onerror = (err) => {
      console.error("File read error:", err);
      setValidating(false);
    };

    reader.readAsText(file);
  };

  // Map imageField to folder subfolder name
  const getImageSubfolder = (field) => {
    const mapping = {
      profileAvatar: "profile",
      digitalImages: "digitals",
      portfolioImages: "polaroids",
    };
    return mapping[field] || "uploads";
  };

  // Get user type folder based on role
  const getUserTypeFolder = (role) => {
    const modelRoles = ["model", "talent"];
    return modelRoles.includes(role?.toLowerCase()) ? "models" : "clients";
  };

  const uploadToCloudinary = async (imageUrl, userData, imageType, index) => {
    // Build folder path: /users/{models|clients}/{username}/{imageType}
    const userType = getUserTypeFolder(userData.role);
    const username = userData.username || userData.uid || "unknown";
    const subfolder = getImageSubfolder(imageType);
    const folderPath = `users/${userType}/${username}/${subfolder}`;

    // Create a form data to upload via URL
    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
    formData.append("folder", folderPath);
    formData.append("public_id", `${subfolder}_${Date.now()}_${index}`); // Unique ID with timestamp and index

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

  const handleStop = () => {
    stopRequestedRef.current = true;
    setStopRequested(true);
  };

  const handleImport = async () => {
    const feedback = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let processedImages = 0;
    const totalImages = stats.totalImages;

    // Reset stop state
    stopRequestedRef.current = false;
    setStopRequested(false);

    setUploading(true);
    setProgress(0);

    let wasStopped = false;

    for (let i = 0; i < processedData.length; i++) {
      // Check if stop was requested
      if (stopRequestedRef.current) {
        wasStopped = true;
        break;
      }

      const record = processedData[i];
      const { email, title, images, targetField, trackingField, userDocRef, userData } = record;

      const uploadedUrls = [];
      const uploadedFilenames = []; // Track successfully imported filenames
      const imageErrors = [];

      // Get existing images from user profile
      const existingImages = userData[targetField] || [];
      const existingTrackedFilenames = userData[trackingField] || [];

      // Upload each image
      for (let j = 0; j < images.length; j++) {
        // Check if stop was requested
        if (stopRequestedRef.current) {
          wasStopped = true;
          break;
        }

        const img = images[j];
        setCurrentImage(`${email}: ${img.filename} (${j + 1}/${images.length})`);

        try {
          // Build the full image URL
          const fullImageUrl = baseUrl.endsWith("/")
            ? `${baseUrl}${img.filename}`
            : `${baseUrl}/${img.filename}`;

          // Upload to Cloudinary
          const cloudinaryUrl = await uploadToCloudinary(fullImageUrl, userData, targetField, j);
          uploadedUrls.push(cloudinaryUrl);
          uploadedFilenames.push(img.filename); // Track the original filename
          successCount++;
        } catch (err) {
          console.error(`Error uploading ${img.filename}:`, err);
          imageErrors.push({ filename: img.filename, error: err.message });
          errorCount++;
        }

        processedImages++;
        setProgress((processedImages / totalImages) * 100);
      }

      // If stopped mid-record, still save what we have
      if (wasStopped && uploadedUrls.length === 0) {
        break;
      }

      // Update Firestore with new images (append to existing)
      if (uploadedUrls.length > 0) {
        try {
          const combinedImages = [...existingImages, ...uploadedUrls];
          const combinedTrackedFilenames = [...existingTrackedFilenames, ...uploadedFilenames];

          // Enforce limits: portfolioImages max 30, digitalImages max 15
          const maxImages = targetField === "digitalImages" ? 15 : 30;
          const finalImages = combinedImages.slice(0, maxImages);

          await updateDoc(userDocRef, {
            [targetField]: finalImages,
            [trackingField]: combinedTrackedFilenames, // Track imported filenames to prevent duplicates
            updatedAt: new Date().toISOString(),
          });

          feedback.push({
            email,
            title,
            targetField,
            status: "success",
            message: `Uploaded ${uploadedUrls.length} images to ${targetField}`,
            uploadedCount: uploadedUrls.length,
            errors: imageErrors,
          });
        } catch (err) {
          feedback.push({
            email,
            title,
            targetField,
            status: "error",
            message: `Failed to update Firestore: ${err.message}`,
            uploadedCount: uploadedUrls.length,
            errors: imageErrors,
          });
          errorCount += uploadedUrls.length;
          successCount -= uploadedUrls.length;
        }
      } else if (imageErrors.length > 0) {
        feedback.push({
          email,
          title,
          targetField,
          status: "error",
          message: `All ${images.length} images failed to upload`,
          uploadedCount: 0,
          errors: imageErrors,
        });
      } else {
        feedback.push({
          email,
          title,
          targetField,
          status: "skipped",
          message: "No images to upload",
          uploadedCount: 0,
        });
        skippedCount++;
      }

      setStats({ success: successCount, skipped: skippedCount, error: errorCount, totalImages });
    }

    // Add stop message to feedback if stopped
    if (wasStopped) {
      feedback.unshift({
        email: "IMPORT STOPPED",
        title: "",
        targetField: "",
        status: "skipped",
        message: `Import was stopped by user. ${successCount} images were uploaded before stopping.`,
        uploadedCount: 0,
      });
    }

    setResults(feedback);
    setUploading(false);
    setCurrentImage("");
    setStopRequested(false);
    stopRequestedRef.current = false;

    // Log admin action
    try {
      await logAdminAction({
        adminUid: user.uid,
        adminEmail: user.email,
        adminName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        action: ADMIN_ACTIONS.IMPORT_IMAGES,
        description: `Imported ${successCount} portfolio/digital images via CSV${wasStopped ? " (stopped by user)" : ""}`,
        details: {
          totalRecords: processedData.length,
          totalImages,
          success: successCount,
          skipped: skippedCount,
          errors: errorCount,
          baseUrl,
          wasStopped,
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
    maxSize: 10 * 1024 * 1024, // 10MB for larger CSVs
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

  // Summary of data by target field
  const portfolioCount = processedData.filter((r) => r.targetField === "portfolioImages").length;
  const digitalCount = processedData.filter((r) => r.targetField === "digitalImages").length;
  const portfolioImageCount = processedData
    .filter((r) => r.targetField === "portfolioImages")
    .reduce((sum, r) => sum + r.images.length, 0);
  const digitalImageCount = processedData
    .filter((r) => r.targetField === "digitalImages")
    .reduce((sum, r) => sum + r.images.length, 0);

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
                    helperText="The base URL where portfolio images are hosted"
                    size="small"
                  />
                </MDBox>

                <Divider sx={{ my: 2 }} />

                <MDTypography variant="h6" gutterBottom>
                  Required Columns
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li>
                    <MDTypography variant="caption">
                      <strong>email</strong> - User's email (to match in Firestore)
                    </MDTypography>
                  </li>
                  <li>
                    <MDTypography variant="caption">
                      <strong>title</strong> - Album title (determines target: "Portfolio" or "Digital/Polaroid")
                    </MDTypography>
                  </li>
                  <li>
                    <MDTypography variant="caption">
                      <strong>picture</strong> - JSON with images (format below)
                    </MDTypography>
                  </li>
                </MDBox>

                <MDTypography variant="h6" gutterBottom>
                  Picture JSON Format
                </MDTypography>
                <MDBox
                  sx={{
                    bgcolor: "grey.100",
                    p: 1.5,
                    borderRadius: 1,
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    overflow: "auto",
                  }}
                >
                  {`{"0":"orig.jpg;cloud_file.jpg;size"}`}
                </MDBox>
                <MDTypography variant="caption" color="text" display="block" mt={1}>
                  Each entry: original_filename;cloudinary_filename;filesize
                </MDTypography>

                <Divider sx={{ my: 2 }} />

                <MDTypography variant="h6" gutterBottom>
                  Title Mapping
                </MDTypography>
                <MDBox component="ul" sx={{ pl: 2 }}>
                  <li>
                    <MDTypography variant="caption">
                      Contains "Portfolio", "Main", "Fashion" → <strong>Portfolio Images</strong>
                    </MDTypography>
                  </li>
                  <li>
                    <MDTypography variant="caption">
                      Contains "Digital", "Polaroid" → <strong>Digital Images</strong>
                    </MDTypography>
                  </li>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

          {/* Upload Card */}
          <Grid item xs={12} lg={8}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" gutterBottom>
                  Import Portfolio & Digital Images
                </MDTypography>
                <MDTypography variant="body2" color="text" mb={3}>
                  Upload a CSV file containing portfolio/digital image data from the Joomla database. Images will be
                  fetched from the source, uploaded to Cloudinary, and linked to user profiles.
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
                    CSV with columns: email, title, picture
                  </MDTypography>
                </MDBox>

                {validating && (
                  <MDBox mt={3} textAlign="center">
                    <CircularProgress size={60} />
                    <MDTypography variant="body2" mt={2}>
                      Validating records and parsing image data... Please wait.
                    </MDTypography>
                  </MDBox>
                )}

                {processedData.length > 0 && !uploading && !validating && progress === 0 && (
                  <MDBox mt={3}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>{processedData.length}</strong> user records ready with{" "}
                      <strong>{stats.totalImages}</strong> total images
                      {filteredOutCount > 0 && (
                        <span> ({filteredOutCount} records skipped - no matching email or empty images)</span>
                      )}
                      {stats.duplicates > 0 && (
                        <span> ({stats.duplicates} duplicate images already imported - will be skipped)</span>
                      )}
                    </Alert>

                    {/* Summary breakdown */}
                    <MDBox display="flex" gap={2} mb={3} flexWrap="wrap">
                      <Chip
                        icon={<Icon>photo_library</Icon>}
                        label={`${portfolioCount} Portfolio albums (${portfolioImageCount} images)`}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Icon>camera_alt</Icon>}
                        label={`${digitalCount} Digital albums (${digitalImageCount} images)`}
                        color="secondary"
                        variant="outlined"
                      />
                    </MDBox>

                    <Button
                      variant="contained"
                      color="info"
                      onClick={handleImport}
                      startIcon={<Icon>cloud_upload</Icon>}
                      size="large"
                    >
                      Start Import ({stats.totalImages} images)
                    </Button>
                  </MDBox>
                )}

                {rawData.length === 0 && filteredOutCount > 0 && !validating && (
                  <MDBox mt={3}>
                    <Alert severity="warning">
                      No records to import. All <strong>{filteredOutCount}</strong> records were filtered out (no
                      matching email in Firestore or empty image data).
                    </Alert>
                  </MDBox>
                )}

                {uploading && (
                  <MDBox mt={3}>
                    <MDBox mb={2}>
                      <LinearProgressWithLabel value={progress} />
                    </MDBox>
                    <MDTypography variant="body2" textAlign="center">
                      {stopRequested ? "Stopping import..." : "Importing images... Please do not close this page."}
                    </MDTypography>
                    {currentImage && (
                      <MDTypography variant="caption" color="text" display="block" textAlign="center" mt={1}>
                        Current: {currentImage}
                      </MDTypography>
                    )}
                    <MDBox mt={2} textAlign="center">
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleStop}
                        disabled={stopRequested}
                        startIcon={<Icon>stop</Icon>}
                      >
                        {stopRequested ? "Stopping..." : "Stop Import"}
                      </Button>
                    </MDBox>
                  </MDBox>
                )}

                {/* Stats Summary */}
                {(stats.success > 0 || stats.skipped > 0 || stats.error > 0 || stats.duplicates > 0) && (
                  <MDBox mt={3} display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                    <Chip label={`${stats.success} Success`} color="success" variant="outlined" />
                    <Chip label={`${stats.skipped} Skipped`} color="warning" variant="outlined" />
                    <Chip label={`${stats.error} Errors`} color="error" variant="outlined" />
                    {stats.duplicates > 0 && (
                      <Chip label={`${stats.duplicates} Duplicates`} color="info" variant="outlined" />
                    )}
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
                        alignItems="flex-start"
                        justifyContent="space-between"
                        py={1.5}
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
                            {res.title} → {res.targetField === "portfolioImages" ? "Portfolio" : "Digitals"}
                          </MDTypography>
                          {res.uploadedCount > 0 && (
                            <MDTypography variant="caption" display="block" color="text">
                              {res.uploadedCount} images uploaded
                            </MDTypography>
                          )}
                        </MDBox>
                        <MDBox textAlign="right">
                          <Chip
                            label={res.status}
                            size="small"
                            color={
                              res.status === "success" ? "success" : res.status === "skipped" ? "warning" : "error"
                            }
                          />
                          {res.message && (
                            <MDTypography variant="caption" display="block" color="text" sx={{ maxWidth: 300 }}>
                              {res.message}
                            </MDTypography>
                          )}
                          {res.errors && res.errors.length > 0 && (
                            <MDTypography variant="caption" display="block" color="error" sx={{ maxWidth: 300 }}>
                              {res.errors.length} image(s) failed
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
