/**
 * CMS Page Metadata - Edit SEO metadata for website pages
 * Super admin only
 */

import { useEffect, useState } from "react";
import { useAuth } from "context/AuthContext";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// MUI components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Page metadata configuration
const PAGES = [
  { id: "meta-home", label: "Home Page", path: "/" },
  { id: "meta-about", label: "About Us", path: "/about-us" },
  { id: "meta-pricing", label: "Pricing", path: "/pricing" },
  { id: "meta-whyUs", label: "Why Us", path: "/why-us" },
  { id: "meta-contact", label: "Contact", path: "/contact" },
  { id: "meta-signIn", label: "Sign In", path: "/sign-in" },
  { id: "meta-signUp", label: "Sign Up", path: "/sign-up" },
];

// Default metadata values
const DEFAULT_METADATA = {
  title: "",
  description: "",
  keywords: [],
  ogImage: "",
  ogType: "website",
  twitterCard: "summary_large_image",
  noIndex: false,
  canonicalUrl: "",
};

function CMSPageMetadata() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [metadata, setMetadata] = useState({});
  const [editedMetadata, setEditedMetadata] = useState({});
  const [keywordInput, setKeywordInput] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const isSuperAdmin = user?.role === "super admin";

  // Fetch all page metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = getFirestore();

      try {
        const snapshot = await getDocs(collection(db, "siteContent"));
        const metadataMap = {};
        snapshot.docs.forEach((doc) => {
          if (doc.id.startsWith("meta-")) {
            metadataMap[doc.id] = { ...DEFAULT_METADATA, ...doc.data() };
          }
        });

        // Initialize empty pages with defaults
        PAGES.forEach((page) => {
          if (!metadataMap[page.id]) {
            metadataMap[page.id] = { ...DEFAULT_METADATA };
          }
        });

        setMetadata(metadataMap);
        setEditedMetadata(metadataMap);
      } catch (error) {
        console.error("Error fetching page metadata:", error);
        setSnackbar({
          open: true,
          message: "Failed to load metadata",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [isSuperAdmin]);

  // Handle field change
  const handleFieldChange = (pageId, field, value) => {
    setEditedMetadata((prev) => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [field]: value,
      },
    }));
  };

  // Handle keyword add
  const handleAddKeyword = (pageId) => {
    const keyword = keywordInput[pageId]?.trim();
    if (!keyword) return;

    const currentKeywords = editedMetadata[pageId]?.keywords || [];
    if (currentKeywords.includes(keyword)) return;

    handleFieldChange(pageId, "keywords", [...currentKeywords, keyword]);
    setKeywordInput((prev) => ({ ...prev, [pageId]: "" }));
  };

  // Handle keyword remove
  const handleRemoveKeyword = (pageId, keyword) => {
    const currentKeywords = editedMetadata[pageId]?.keywords || [];
    handleFieldChange(
      pageId,
      "keywords",
      currentKeywords.filter((k) => k !== keyword)
    );
  };

  // Save metadata
  const handleSave = async (pageId) => {
    setSaving((prev) => ({ ...prev, [pageId]: true }));
    const db = getFirestore();

    try {
      await setDoc(
        doc(db, "siteContent", pageId),
        {
          ...editedMetadata[pageId],
          id: pageId,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        },
        { merge: true }
      );

      setMetadata((prev) => ({
        ...prev,
        [pageId]: editedMetadata[pageId],
      }));

      setSnackbar({
        open: true,
        message: "Metadata saved successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving metadata:", error);
      setSnackbar({
        open: true,
        message: "Failed to save metadata",
        severity: "error",
      });
    } finally {
      setSaving((prev) => ({ ...prev, [pageId]: false }));
    }
  };

  // Check if page has changes
  const hasChanges = (pageId) => {
    return JSON.stringify(metadata[pageId]) !== JSON.stringify(editedMetadata[pageId]);
  };

  // Access denied
  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <Card>
            <MDBox p={3} textAlign="center">
              <Icon fontSize="large" color="error">
                lock
              </Icon>
              <MDTypography variant="h5" mt={2}>
                Access Denied
              </MDTypography>
              <MDTypography variant="body2" color="text">
                Only super admins can access CMS management.
              </MDTypography>
            </MDBox>
          </Card>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Page Metadata (SEO)
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Manage SEO metadata for each page on the website
          </MDTypography>
        </MDBox>

        <Alert severity="info" sx={{ mb: 3 }}>
          Changes to metadata require a website rebuild and deploy to take effect.
        </Alert>

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card>
                  <MDBox p={3}>
                    <Skeleton variant="rectangular" height={300} />
                  </MDBox>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {PAGES.map((page) => (
              <Grid item xs={12} lg={6} key={page.id}>
                <Card>
                  <CardContent>
                    <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <MDBox>
                        <MDTypography variant="h6">{page.label}</MDTypography>
                        <MDTypography variant="caption" color="text">
                          {page.path}
                        </MDTypography>
                      </MDBox>
                      {hasChanges(page.id) && (
                        <MDButton
                          variant="gradient"
                          color="info"
                          size="small"
                          onClick={() => handleSave(page.id)}
                          disabled={saving[page.id]}
                        >
                          {saving[page.id] ? "Saving..." : "Save"}
                        </MDButton>
                      )}
                    </MDBox>
                    <Divider sx={{ mb: 2 }} />

                    {/* Title */}
                    <TextField
                      fullWidth
                      label="Page Title"
                      placeholder="e.g., About Us | The Model Cloud"
                      value={editedMetadata[page.id]?.title || ""}
                      onChange={(e) => handleFieldChange(page.id, "title", e.target.value)}
                      helperText="Appears in browser tab and search results (50-60 characters)"
                      sx={{ mb: 2 }}
                    />

                    {/* Description */}
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Meta Description"
                      placeholder="A brief description of the page content..."
                      value={editedMetadata[page.id]?.description || ""}
                      onChange={(e) => handleFieldChange(page.id, "description", e.target.value)}
                      helperText="Shown in search results (150-160 characters)"
                      sx={{ mb: 2 }}
                    />

                    {/* Keywords */}
                    <MDBox mb={2}>
                      <MDBox display="flex" gap={1} mb={1}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Add Keyword"
                          value={keywordInput[page.id] || ""}
                          onChange={(e) =>
                            setKeywordInput((prev) => ({ ...prev, [page.id]: e.target.value }))
                          }
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddKeyword(page.id);
                            }
                          }}
                        />
                        <MDButton
                          variant="outlined"
                          color="info"
                          size="small"
                          onClick={() => handleAddKeyword(page.id)}
                        >
                          Add
                        </MDButton>
                      </MDBox>
                      <MDBox display="flex" flexWrap="wrap" gap={0.5}>
                        {(editedMetadata[page.id]?.keywords || []).map((keyword) => (
                          <Chip
                            key={keyword}
                            label={keyword}
                            size="small"
                            onDelete={() => handleRemoveKeyword(page.id, keyword)}
                          />
                        ))}
                      </MDBox>
                    </MDBox>

                    {/* OG Image */}
                    <TextField
                      fullWidth
                      label="Open Graph Image URL"
                      placeholder="https://example.com/image.jpg"
                      value={editedMetadata[page.id]?.ogImage || ""}
                      onChange={(e) => handleFieldChange(page.id, "ogImage", e.target.value)}
                      helperText="Image shown when shared on social media (1200x630px)"
                      sx={{ mb: 2 }}
                    />

                    {/* OG Type and Twitter Card */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>OG Type</InputLabel>
                          <Select
                            value={editedMetadata[page.id]?.ogType || "website"}
                            label="OG Type"
                            onChange={(e) => handleFieldChange(page.id, "ogType", e.target.value)}
                          >
                            <MenuItem value="website">Website</MenuItem>
                            <MenuItem value="article">Article</MenuItem>
                            <MenuItem value="product">Product</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Twitter Card</InputLabel>
                          <Select
                            value={editedMetadata[page.id]?.twitterCard || "summary_large_image"}
                            label="Twitter Card"
                            onChange={(e) =>
                              handleFieldChange(page.id, "twitterCard", e.target.value)
                            }
                          >
                            <MenuItem value="summary">Summary</MenuItem>
                            <MenuItem value="summary_large_image">Summary Large Image</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    {/* Canonical URL */}
                    <TextField
                      fullWidth
                      label="Canonical URL (optional)"
                      placeholder="https://themodel.cloud/about-us"
                      value={editedMetadata[page.id]?.canonicalUrl || ""}
                      onChange={(e) => handleFieldChange(page.id, "canonicalUrl", e.target.value)}
                      helperText="Leave empty to use default page URL"
                      sx={{ mb: 2 }}
                    />

                    {/* No Index */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editedMetadata[page.id]?.noIndex || false}
                          onChange={(e) => handleFieldChange(page.id, "noIndex", e.target.checked)}
                        />
                      }
                      label="No Index (hide from search engines)"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </MDBox>
      <Footer />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default CMSPageMetadata;
