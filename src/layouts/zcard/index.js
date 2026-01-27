/**
 * ZCardBuilder - Main page for creating and managing Z-Cards
 *
 * For Models: Shows their own images and allows Z-Card creation/editing
 * For Admins: Shows model selector, then images for selected model
 */

import { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "config/firebase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// MUI components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Z-Card components
import ImageSelector from "layouts/zcard/components/ImageSelector";
import ModelSelector from "layouts/zcard/components/ModelSelector";
import ZCardPreview from "layouts/zcard/components/ZCardPreview";
import ShareZCardModal from "layouts/zcard/components/ShareZCardModal";
import ImagePositioner from "layouts/zcard/components/ImagePositioner";

// Context
import { useAuth } from "context/AuthContext";

// Utilities
import {
  createZCard,
  updateZCard,
  getModelZCards,
  deleteZCard,
  canEditZCard,
} from "utils/zcard";

function ZCardBuilder() {
  const { user } = useAuth();
  const previewRef = useRef(null);
  const pdfPreviewRef = useRef(null);

  // Role checks
  const isModel = user?.role === "model";
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  // State
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [gridImages, setGridImages] = useState([]);
  const [existingZCard, setExistingZCard] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [nameColor, setNameColor] = useState("white");
  const [nameSize, setNameSize] = useState("medium");
  const [mainImagePosition, setMainImagePosition] = useState({ x: 50, y: 50 });
  const [gridImagePositions, setGridImagePositions] = useState([
    { x: 50, y: 50 },
    { x: 50, y: 50 },
    { x: 50, y: 50 },
    { x: 50, y: 50 },
  ]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Load model data for the logged-in model user
  useEffect(() => {
    const loadModelData = async () => {
      if (isModel && user?.uid) {
        setLoading(true);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = { uid: user.uid, ...docSnap.data() };
            setModelData(data);
            setSelectedModel(data);

            // Combine portfolio and digital images
            const portfolio = data.portfolioImages || [];
            const digitals = data.digitalImages || [];
            setAllImages([...portfolio, ...digitals]);

            // Load existing Z-Card
            const zcards = await getModelZCards(user.uid);
            if (zcards.length > 0) {
              const zcard = zcards[0];
              setExistingZCard(zcard);
              setMainImage(zcard.mainImage);
              setGridImages(zcard.gridImages || []);
              setNameColor(zcard.nameColor || "white");
              setNameSize(zcard.nameSize || "medium");
              setMainImagePosition(zcard.mainImagePosition || { x: 50, y: 50 });
              setGridImagePositions(zcard.gridImagePositions || [
                { x: 50, y: 50 },
                { x: 50, y: 50 },
                { x: 50, y: 50 },
                { x: 50, y: 50 },
              ]);
            }
          }
        } catch (error) {
          console.error("Error loading model data:", error);
          showSnackbar("Failed to load your data", "error");
        } finally {
          setLoading(false);
        }
      } else if (isAdmin) {
        setLoading(false);
      }
    };

    loadModelData();
  }, [user, isModel, isAdmin]);

  // Load data when admin selects a model
  useEffect(() => {
    const loadSelectedModelData = async () => {
      if (isAdmin && selectedModel?.uid) {
        setLoading(true);

        // Reset state immediately when model changes
        setExistingZCard(null);
        setMainImage(null);
        setGridImages([]);
        setNameColor("white");
        setNameSize("medium");
        setMainImagePosition({ x: 50, y: 50 });
        setGridImagePositions([
          { x: 50, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 50 },
        ]);
        setModelData(null);
        setAllImages([]);

        try {
          // Get fresh model data
          const docRef = doc(db, "users", selectedModel.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = { uid: selectedModel.uid, ...docSnap.data() };
            setModelData(data);

            // Combine portfolio and digital images
            const portfolio = data.portfolioImages || [];
            const digitals = data.digitalImages || [];
            setAllImages([...portfolio, ...digitals]);

            // Load existing Z-Card for this model
            const zcards = await getModelZCards(selectedModel.uid);
            if (zcards.length > 0) {
              const zcard = zcards[0];
              setExistingZCard(zcard);
              setMainImage(zcard.mainImage);
              setGridImages(zcard.gridImages || []);
              setNameColor(zcard.nameColor || "white");
              setNameSize(zcard.nameSize || "medium");
              setMainImagePosition(zcard.mainImagePosition || { x: 50, y: 50 });
              setGridImagePositions(zcard.gridImagePositions || [
                { x: 50, y: 50 },
                { x: 50, y: 50 },
                { x: 50, y: 50 },
                { x: 50, y: 50 },
              ]);
            }
            // No else needed - state was already reset at the start
          }
        } catch (error) {
          console.error("Error loading selected model:", error);
          showSnackbar("Failed to load model data", "error");
        } finally {
          setLoading(false);
        }
      }
    };

    loadSelectedModelData();
  }, [selectedModel, isAdmin]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleMainImageSelect = (selected) => {
    setMainImage(selected[0] || null);
  };

  const handleGridImagesSelect = (selected) => {
    // Keep the order, limit to 4
    setGridImages(selected.slice(0, 4));
  };

  const getMeasurements = () => {
    if (!modelData) return {};
    const measurements = {
      height: modelData.height,
      bust: modelData.bust,
      braSize: modelData.braSize,
      waist: modelData.waist,
      hips: modelData.hips,
      shoeSize: modelData.shoeSize,
      dressSize: modelData.dressSize,
      gender: modelData.gender,
    };
    // Filter out undefined values - Firestore doesn't accept undefined
    return Object.fromEntries(
      Object.entries(measurements).filter(([_, value]) => value !== undefined)
    );
  };

  const handleSave = async () => {
    if (!mainImage || gridImages.length < 4) {
      showSnackbar("Please select 1 main image and 4 grid images", "error");
      return;
    }

    if (!modelData) {
      showSnackbar("No model selected", "error");
      return;
    }

    setSaving(true);
    try {
      const zcardData = {
        modelId: modelData.uid,
        modelFirstName: modelData.firstName || "",
        modelLastName: modelData.lastName || "",
        modelPublicSlug: modelData.publicSlug || "",
        createdBy: user.uid,
        creatorName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        creatorRole: user.role,
        creatorEmail: user.email,
        creatorPhone: user.phone || "",
        mainImage,
        gridImages,
        measurements: getMeasurements(),
        nameColor,
        nameSize,
        mainImagePosition,
        gridImagePositions,
      };

      if (existingZCard) {
        // Update existing
        await updateZCard(existingZCard.id, zcardData);
        setExistingZCard({ ...existingZCard, ...zcardData });
        showSnackbar("Z-Card updated successfully!");
      } else {
        // Create new
        const newZCard = await createZCard(zcardData);
        setExistingZCard(newZCard);
        showSnackbar("Z-Card created successfully!");
      }
    } catch (error) {
      console.error("Error saving Z-Card:", error);
      showSnackbar("Failed to save Z-Card", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfPreviewRef.current) {
      showSnackbar("Preview not ready", "error");
      return;
    }

    setGenerating(true);
    try {
      // Wait a bit for images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(pdfPreviewRef.current, {
        scale: 3, // Higher scale for better PDF quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Fit entire Z-Card on page (contain mode - no cropping)
      const canvasAspect = canvas.width / canvas.height;
      const pageAspect = pageWidth / pageHeight;

      let imgWidth, imgHeight, x, y;

      if (canvasAspect > pageAspect) {
        // Canvas is wider than page - fit to width
        imgWidth = pageWidth;
        imgHeight = imgWidth / canvasAspect;
        x = 0;
        y = (pageHeight - imgHeight) / 2;
      } else {
        // Canvas is taller than page - fit to height
        imgHeight = pageHeight;
        imgWidth = imgHeight * canvasAspect;
        x = (pageWidth - imgWidth) / 2;
        y = 0;
      }

      pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);

      const filename = `zcard-${modelData?.firstName || "model"}-${modelData?.lastName || ""}.pdf`
        .toLowerCase()
        .replace(/\s+/g, "-");
      pdf.save(filename);

      showSnackbar("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showSnackbar("Failed to generate PDF", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = () => {
    if (!existingZCard) {
      showSnackbar("Please save your Z-Card first", "error");
      return;
    }
    setShareModalOpen(true);
  };

  const handleDelete = async () => {
    if (!existingZCard) return;

    if (!window.confirm("Are you sure you want to delete this Z-Card?")) {
      return;
    }

    try {
      await deleteZCard(existingZCard.id);
      setExistingZCard(null);
      setMainImage(null);
      setGridImages([]);
      showSnackbar("Z-Card deleted successfully!");
    } catch (error) {
      console.error("Error deleting Z-Card:", error);
      showSnackbar("Failed to delete Z-Card", "error");
    }
  };

  // Get images excluding already selected ones
  const getAvailableImagesForMain = () => allImages;
  const getAvailableImagesForGrid = () => allImages.filter((img) => img !== mainImage);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Z-Card Builder
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Create a professional comp card for {isModel ? "yourself" : "a model"}
          </MDTypography>
        </MDBox>

        {/* Model Selector (Admin only) */}
        {isAdmin && (
          <Card sx={{ mb: 3, p: 3 }}>
            <ModelSelector
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
            />
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <MDBox display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </MDBox>
        )}

        {/* No model selected (Admin) */}
        {isAdmin && !selectedModel && !loading && (
          <Card sx={{ p: 4, textAlign: "center" }}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 2 }}>person_search</Icon>
            <MDTypography variant="h6" color="text">
              Select a model to create their Z-Card
            </MDTypography>
          </Card>
        )}

        {/* Main content when model is selected */}
        {modelData && !loading && (
          <Grid container spacing={3}>
            {/* Left side - Image Selection */}
            <Grid item xs={12} lg={7}>
              <Card sx={{ p: 3 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                  <Tab label="Main Image" />
                  <Tab label="Grid Images (4)" />
                </Tabs>

                {activeTab === 0 && (
                  <ImageSelector
                    images={getAvailableImagesForMain()}
                    selectedImages={mainImage ? [mainImage] : []}
                    onSelect={handleMainImageSelect}
                    maxSelect={1}
                    title="Select Main Image"
                    subtitle="This will be the large image on the left of your Z-Card"
                  />
                )}

                {activeTab === 1 && (
                  <ImageSelector
                    images={getAvailableImagesForGrid()}
                    selectedImages={gridImages}
                    onSelect={handleGridImagesSelect}
                    maxSelect={4}
                    title="Select Grid Images"
                    subtitle="Select 4 images for the right side of your Z-Card (in order)"
                  />
                )}

                {allImages.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    No images available. Please upload portfolio or digital images first.
                  </Alert>
                )}
              </Card>
            </Grid>

            {/* Right side - Preview and Actions */}
            <Grid item xs={12} lg={5}>
              <Card sx={{ p: 3, mb: 3 }}>
                <MDTypography variant="h6" fontWeight="medium" mb={2}>
                  Preview
                </MDTypography>

                {/* Name Color Selector */}
                <MDBox mb={2}>
                  <MDTypography variant="caption" color="text" mb={1} display="block">
                    Name Color
                  </MDTypography>
                  <MDBox display="flex" gap={1}>
                    <MDButton
                      variant={nameColor === "white" ? "gradient" : "outlined"}
                      color="dark"
                      size="small"
                      onClick={() => setNameColor("white")}
                      sx={{
                        minWidth: 80,
                        backgroundColor: nameColor === "white" ? undefined : "#333",
                        color: "white",
                        "&:hover": { backgroundColor: nameColor === "white" ? undefined : "#444" },
                      }}
                    >
                      White
                    </MDButton>
                    <MDButton
                      variant={nameColor === "black" ? "gradient" : "outlined"}
                      color="light"
                      size="small"
                      onClick={() => setNameColor("black")}
                      sx={{
                        minWidth: 80,
                        backgroundColor: nameColor === "black" ? undefined : "#fff",
                        color: "#333",
                        border: "1px solid #ccc",
                        "&:hover": { backgroundColor: nameColor === "black" ? undefined : "#f5f5f5" },
                      }}
                    >
                      Black
                    </MDButton>
                  </MDBox>
                </MDBox>

                {/* Name Size Selector */}
                <MDBox mb={2}>
                  <MDTypography variant="caption" color="text" mb={1} display="block">
                    Name Size
                  </MDTypography>
                  <MDBox display="flex" flexWrap="wrap" gap={1}>
                    <MDButton
                      variant={nameSize === "small" ? "gradient" : "outlined"}
                      color="info"
                      size="small"
                      onClick={() => setNameSize("small")}
                      sx={{ minWidth: 60 }}
                    >
                      S
                    </MDButton>
                    <MDButton
                      variant={nameSize === "medium" ? "gradient" : "outlined"}
                      color="info"
                      size="small"
                      onClick={() => setNameSize("medium")}
                      sx={{ minWidth: 60 }}
                    >
                      M
                    </MDButton>
                    <MDButton
                      variant={nameSize === "large" ? "gradient" : "outlined"}
                      color="info"
                      size="small"
                      onClick={() => setNameSize("large")}
                      sx={{ minWidth: 60 }}
                    >
                      L
                    </MDButton>
                    <MDButton
                      variant={nameSize === "extra-large" ? "gradient" : "outlined"}
                      color="info"
                      size="small"
                      onClick={() => setNameSize("extra-large")}
                      sx={{ minWidth: 60 }}
                    >
                      XL
                    </MDButton>
                    <MDButton
                      variant={nameSize === "xxl" ? "gradient" : "outlined"}
                      color="info"
                      size="small"
                      onClick={() => setNameSize("xxl")}
                      sx={{ minWidth: 60 }}
                    >
                      XXL
                    </MDButton>
                  </MDBox>
                </MDBox>

                <ZCardPreview
                  ref={previewRef}
                  model={modelData}
                  mainImage={mainImage}
                  gridImages={gridImages}
                  measurements={getMeasurements()}
                  creatorEmail={user?.email}
                  creatorPhone={user?.phone}
                  nameColor={nameColor}
                  nameSize={nameSize}
                  mainImagePosition={mainImagePosition}
                  gridImagePositions={gridImagePositions}
                  compact
                />
              </Card>

              {/* Image Position Adjustments */}
              {(mainImage || gridImages.length > 0) && (
                <Card sx={{ p: 3, mb: 3 }}>
                  <MDTypography variant="h6" fontWeight="medium" mb={2}>
                    Adjust Image Positions
                  </MDTypography>
                  <MDTypography variant="body2" color="text" mb={2}>
                    Click and drag on images to adjust their focal point
                  </MDTypography>

                  <MDBox display="flex" flexWrap="wrap" gap={2}>
                    {mainImage && (
                      <ImagePositioner
                        image={mainImage}
                        position={mainImagePosition}
                        onChange={setMainImagePosition}
                        label="Main Image"
                      />
                    )}

                    {gridImages.map((img, index) => (
                      img && (
                        <ImagePositioner
                          key={index}
                          image={img}
                          position={gridImagePositions[index]}
                          onChange={(pos) => {
                            const newPositions = [...gridImagePositions];
                            newPositions[index] = pos;
                            setGridImagePositions(newPositions);
                          }}
                          label={`Grid ${index + 1}`}
                        />
                      )
                    ))}
                  </MDBox>
                </Card>
              )}

              {/* Action Buttons */}
              <Card sx={{ p: 3 }}>
                <MDBox display="flex" flexDirection="column" gap={2}>
                  <MDButton
                    variant="gradient"
                    color="info"
                    fullWidth
                    onClick={handleSave}
                    disabled={saving || !mainImage || gridImages.length < 4}
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Icon>save</Icon>}
                  >
                    {saving ? "Saving..." : existingZCard ? "Update Z-Card" : "Save Z-Card"}
                  </MDButton>

                  <MDButton
                    variant="outlined"
                    color="info"
                    fullWidth
                    onClick={handleDownloadPDF}
                    disabled={generating || !mainImage || gridImages.length < 4}
                    startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <Icon>picture_as_pdf</Icon>}
                  >
                    {generating ? "Generating..." : "Download PDF"}
                  </MDButton>

                  <MDButton
                    variant="outlined"
                    color="success"
                    fullWidth
                    onClick={handleShare}
                    disabled={!existingZCard}
                    startIcon={<Icon>share</Icon>}
                  >
                    Share Z-Card
                  </MDButton>

                  {existingZCard && (
                    <MDButton
                      variant="outlined"
                      color="error"
                      fullWidth
                      onClick={handleDelete}
                      startIcon={<Icon>delete</Icon>}
                    >
                      Delete Z-Card
                    </MDButton>
                  )}
                </MDBox>

                {/* Status */}
                {existingZCard && (
                  <MDBox mt={2} pt={2} borderTop="1px solid" borderColor="grey.200">
                    <MDTypography variant="caption" color="text">
                      Z-Card created by {existingZCard.creatorName || "Unknown"}
                      {existingZCard.creatorRole && ` (${existingZCard.creatorRole})`}
                    </MDTypography>
                  </MDBox>
                )}
              </Card>
            </Grid>
          </Grid>
        )}
      </MDBox>

      {/* Share Modal */}
      <ShareZCardModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        zcard={existingZCard}
        onZCardUpdated={setExistingZCard}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Hidden PDF Preview - Full size for better quality export (landscape) */}
      {modelData && (
        <MDBox
          sx={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "1000px",
          }}
        >
          <ZCardPreview
            ref={pdfPreviewRef}
            model={modelData}
            mainImage={mainImage}
            gridImages={gridImages}
            measurements={getMeasurements()}
            creatorEmail={user?.email}
            creatorPhone={user?.phone}
            nameColor={nameColor}
            nameSize={nameSize}
            mainImagePosition={mainImagePosition}
            gridImagePositions={gridImagePositions}
          />
        </MDBox>
      )}

      <Footer />
    </DashboardLayout>
  );
}

export default ZCardBuilder;
