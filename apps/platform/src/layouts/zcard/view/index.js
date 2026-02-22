/**
 * ZCardView - Public/authenticated view of a shared Z-Card
 * Accessible via /zcard/view/:shareToken
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// MUI components
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Components
import ZCardPreview from "layouts/zcard/components/ZCardPreview";

// Context and utilities
import { useAuth } from "context/AuthContext";
import { getZCardByShareToken, canViewZCard } from "utils/zcard";

// Logo
import logoRectangleDark from "assets/images/logo-rectangle-dark.svg";

function ZCardView() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const previewRef = useRef(null);

  // State
  const [zcard, setZCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Fetch Z-Card by share token
  useEffect(() => {
    const fetchZCard = async () => {
      // Wait for auth to complete
      if (authLoading) return;

      try {
        const zcardData = await getZCardByShareToken(shareToken);

        if (!zcardData) {
          setError("Z-Card not found");
          setLoading(false);
          return;
        }

        // Check visibility permissions
        if (!canViewZCard(zcardData, user)) {
          if (zcardData.visibility === "authenticated" && !user) {
            setError("login_required");
          } else {
            setError("This Z-Card is private");
          }
          setLoading(false);
          return;
        }

        setZCard(zcardData);
      } catch (err) {
        console.error("Error fetching Z-Card:", err);
        setError("Failed to load Z-Card");
      } finally {
        setLoading(false);
      }
    };

    fetchZCard();
  }, [shareToken, user, authLoading]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) {
      showSnackbar("Preview not ready", "error");
      return;
    }

    setGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
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

      const filename = `zcard-${zcard?.modelFirstName || "model"}-${zcard?.modelLastName || ""}.pdf`
        .toLowerCase()
        .replace(/\s+/g, "-");
      pdf.save(filename);

      showSnackbar("PDF downloaded successfully!");
    } catch (err) {
      console.error("Error generating PDF:", err);
      showSnackbar("Failed to generate PDF", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "grey.100",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error states
  if (error) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "grey.100",
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 400, p: 4, textAlign: "center" }}>
          {error === "login_required" ? (
            <>
              <Icon sx={{ fontSize: 48, color: "info.main", mb: 2 }}>lock</Icon>
              <MDTypography variant="h5" fontWeight="medium" mb={1}>
                Login Required
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={3}>
                You need to be logged in to view this Z-Card.
              </MDTypography>
              <MDButton
                variant="gradient"
                color="info"
                component={Link}
                to={`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`}
              >
                Sign In
              </MDButton>
            </>
          ) : (
            <>
              <Icon sx={{ fontSize: 48, color: "error.main", mb: 2 }}>error_outline</Icon>
              <MDTypography variant="h5" fontWeight="medium" mb={1}>
                {error === "Z-Card not found" ? "Z-Card Not Found" : "Access Denied"}
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={3}>
                {error}
              </MDTypography>
              <MDButton variant="gradient" color="dark" component={Link} to="/">
                Go Home
              </MDButton>
            </>
          )}
        </Card>
      </Box>
    );
  }

  const modelName = `${zcard?.modelFirstName || ""} ${zcard?.modelLastName || ""}`.trim();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "grey.100",
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <MDBox display="flex" alignItems="center" gap={2}>
            <Box
              component="img"
              src={logoRectangleDark}
              alt="The Model Cloud"
              sx={{ height: 32 }}
            />
          </MDBox>

          <MDBox display="flex" gap={1}>
            {user && (
              <MDButton
                variant="outlined"
                color="info"
                onClick={handleDownloadPDF}
                disabled={generating}
                startIcon={generating ? <CircularProgress size={16} /> : <Icon>picture_as_pdf</Icon>}
              >
                {generating ? "Generating..." : "Download PDF"}
              </MDButton>
            )}
            <MDButton variant="gradient" color="info" component={Link} to="/sign-in">
              {user ? "Dashboard" : "Join The Model Cloud"}
            </MDButton>
          </MDBox>
        </MDBox>

        {/* Z-Card Title */}
        <MDBox textAlign="center" mb={4}>
          <MDTypography variant="h3" fontWeight="medium">
            {modelName}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Professional Z-Card
          </MDTypography>
        </MDBox>

        {/* Z-Card Preview */}
        <Card sx={{ p: 3, mb: 4 }}>
          <ZCardPreview
            ref={previewRef}
            model={{
              firstName: zcard?.modelFirstName,
              lastName: zcard?.modelLastName,
            }}
            mainImage={zcard?.mainImage}
            gridImages={zcard?.gridImages}
            measurements={zcard?.measurements}
            creatorEmail={zcard?.creatorEmail}
            creatorPhone={zcard?.creatorPhone}
            nameColor={zcard?.nameColor || "white"}
            nameSize={zcard?.nameSize || "medium"}
            mainImagePosition={zcard?.mainImagePosition || { x: 50, y: 50 }}
            gridImagePositions={zcard?.gridImagePositions || []}
          />
        </Card>

        {/* Contact Info */}
        {(zcard?.creatorEmail || zcard?.creatorPhone) && (
          <Card sx={{ p: 3, textAlign: "center" }}>
            <MDTypography variant="h6" fontWeight="medium" mb={1}>
              Contact
            </MDTypography>
            {zcard?.creatorEmail && (
              <MDTypography variant="body2" color="text">
                {zcard.creatorEmail}
              </MDTypography>
            )}
            {zcard?.creatorPhone && (
              <MDTypography variant="body2" color="text">
                {zcard.creatorPhone}
              </MDTypography>
            )}
          </Card>
        )}

        {/* Footer */}
        <MDBox textAlign="center" mt={4}>
          <MDTypography variant="caption" color="text">
            Powered by The Model Cloud
          </MDTypography>
        </MDBox>
      </Container>

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
    </Box>
  );
}

export default ZCardView;
