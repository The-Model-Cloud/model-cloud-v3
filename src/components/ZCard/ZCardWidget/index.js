/**
 * ZCardWidget - Dashboard widget showing model's Z-Card
 *
 * Features:
 * - Thumbnail preview of Z-Card
 * - Quick actions: View, Edit, Download
 * - Shows "Create Z-Card" button if none exists
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// MUI components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Context and utilities
import { useAuth } from "context/AuthContext";
import { getModelZCards, generateZCardShareUrl } from "utils/zcard";

/**
 * Transform Cloudinary URL for thumbnail display
 */
const transformCloudinaryUrl = (url, width = 300, height = 400) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_fill,g_face,w_${width},h_${height}/${parts[1]}`;
};

function ZCardWidget() {
  const { user } = useAuth();
  const [zcard, setZCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZCard = async () => {
      if (user?.uid && user?.role === "model") {
        try {
          const zcards = await getModelZCards(user.uid);
          setZCard(zcards[0] || null);
        } catch (error) {
          console.error("Error fetching Z-Card:", error);
        }
      }
      setLoading(false);
    };

    fetchZCard();
  }, [user]);

  // Don't render for non-models
  if (user?.role !== "model") return null;

  // Loading state
  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Skeleton variant="text" width={100} />
            <Skeleton variant="circular" width={24} height={24} />
          </MDBox>
          <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
        </MDBox>
      </Card>
    );
  }

  return (
    <Card>
      <MDBox p={3}>
        {/* Header */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDTypography variant="h6" fontWeight="medium">
            My Z-Card
          </MDTypography>
          <Icon sx={{ color: "info.main" }}>badge</Icon>
        </MDBox>

        {zcard ? (
          <MDBox>
            {/* Thumbnail preview */}
            <MDBox
              sx={{
                position: "relative",
                borderRadius: 2,
                overflow: "hidden",
                mb: 2,
                cursor: "pointer",
                "&:hover": {
                  "& .overlay": {
                    opacity: 1,
                  },
                },
              }}
              component={Link}
              to="/zcard"
            >
              <Box
                component="img"
                src={transformCloudinaryUrl(zcard.mainImage, 300, 400)}
                alt="Z-Card Preview"
                sx={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {/* Model name overlay */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  py: 1,
                  px: 1.5,
                  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                }}
              >
                <MDTypography
                  variant="button"
                  fontWeight="bold"
                  sx={{ color: "white", textTransform: "uppercase" }}
                >
                  {zcard.modelFirstName}
                </MDTypography>
              </Box>

              {/* Hover overlay */}
              <Box
                className="overlay"
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.2s ease-in-out",
                }}
              >
                <MDTypography variant="button" sx={{ color: "white" }}>
                  Click to Edit
                </MDTypography>
              </Box>
            </MDBox>

            {/* Action buttons */}
            <MDBox display="flex" gap={1}>
              <MDButton
                component={Link}
                to="/zcard"
                variant="outlined"
                color="info"
                size="small"
                fullWidth
                startIcon={<Icon>edit</Icon>}
              >
                Edit
              </MDButton>
              <MDButton
                component="a"
                href={generateZCardShareUrl(zcard.shareToken)}
                target="_blank"
                variant="gradient"
                color="info"
                size="small"
                fullWidth
                startIcon={<Icon>visibility</Icon>}
              >
                View
              </MDButton>
            </MDBox>

            {/* Visibility indicator */}
            <MDBox mt={2} display="flex" alignItems="center" gap={0.5}>
              <Icon sx={{ fontSize: 16, color: "text.secondary" }}>
                {zcard.visibility === "public"
                  ? "public"
                  : zcard.visibility === "authenticated"
                  ? "lock_open"
                  : "lock"}
              </Icon>
              <MDTypography variant="caption" color="text">
                {zcard.visibility === "public"
                  ? "Public"
                  : zcard.visibility === "authenticated"
                  ? "Shared (login required)"
                  : "Private"}
              </MDTypography>
            </MDBox>
          </MDBox>
        ) : (
          <MDBox textAlign="center" py={3}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 1 }}>add_photo_alternate</Icon>
            <MDTypography variant="body2" color="text" mb={2}>
              Create your professional Z-Card to showcase your portfolio and measurements
            </MDTypography>
            <MDButton
              component={Link}
              to="/zcard"
              variant="gradient"
              color="info"
              size="small"
            >
              Create Z-Card
            </MDButton>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

export default ZCardWidget;
