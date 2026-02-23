/**
 * CMS Site Content - Edit website content sections
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
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Custom components
import CloudinaryImageInput from "components/CloudinaryImageInput";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Content sections configuration
const CONTENT_SECTIONS = [
  {
    id: "home",
    label: "Home Page",
    icon: "home",
    subsections: [
      { id: "home-hero", label: "Hero Section", fields: ["title", "subtitle", "ctaText", "ctaLink"] },
      { id: "home-features", label: "Features", fields: ["title", "subtitle", "items"] },
      { id: "home-howItWorks", label: "How It Works", fields: ["title", "subtitle", "steps"] },
      { id: "home-cta", label: "Call to Action", fields: ["title", "subtitle", "primaryButton", "secondaryButton"] },
    ],
  },
  {
    id: "about",
    label: "About Us",
    icon: "info",
    subsections: [
      { id: "aboutUs-hero", label: "Hero Section", fields: ["title", "subtitle"] },
      { id: "aboutUs-story", label: "Our Story", fields: ["title", "content", "imageUrl"] },
      { id: "aboutUs-values", label: "Values", fields: ["title", "items"] },
      { id: "aboutUs-stats", label: "Statistics", fields: ["items"] },
      { id: "aboutUs-team", label: "Team", fields: ["title", "subtitle", "members"] },
    ],
  },
  {
    id: "pricing",
    label: "Pricing Page",
    icon: "payments",
    subsections: [
      { id: "pricing-hero", label: "Hero Section", fields: ["title", "subtitle"] },
      { id: "pricing-modelFeatures", label: "Model Features", fields: ["items"] },
      { id: "pricing-faqs", label: "FAQs", fields: ["items"] },
    ],
  },
  {
    id: "whyUs",
    label: "Why Us",
    icon: "star",
    subsections: [
      { id: "whyUs-hero", label: "Hero Section", fields: ["title", "subtitle"] },
      { id: "whyUs-benefits", label: "Benefits", fields: ["title", "items"] },
      { id: "whyUs-comparisons", label: "Comparisons", fields: ["title", "items"] },
      { id: "whyUs-testimonials", label: "Testimonials", fields: ["title", "items"] },
    ],
  },
  {
    id: "contact",
    label: "Contact Page",
    icon: "mail",
    subsections: [
      {
        id: "contact-info",
        label: "Contact Info",
        fields: ["heroTitle", "heroSubtitle", "email", "phone", "address", "hours"],
      },
    ],
  },
];

function CMSSiteContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [content, setContent] = useState({});
  const [editedContent, setEditedContent] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const isSuperAdmin = user?.role === "super admin";

  // Fetch all site content
  useEffect(() => {
    const fetchContent = async () => {
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = getFirestore();

      try {
        const snapshot = await getDocs(collection(db, "siteContent"));
        const contentMap = {};
        snapshot.docs.forEach((doc) => {
          contentMap[doc.id] = doc.data();
        });
        setContent(contentMap);
        setEditedContent(contentMap);
      } catch (error) {
        console.error("Error fetching site content:", error);
        setSnackbar({
          open: true,
          message: "Failed to load content",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [isSuperAdmin]);

  // Handle field change
  const handleFieldChange = (sectionId, field, value) => {
    setEditedContent((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value,
      },
    }));
  };

  // Handle array item change (for items arrays)
  const handleArrayItemChange = (sectionId, field, index, subField, value) => {
    setEditedContent((prev) => {
      const section = prev[sectionId] || {};
      const items = [...(section[field] || [])];
      items[index] = {
        ...items[index],
        [subField]: value,
      };
      return {
        ...prev,
        [sectionId]: {
          ...section,
          [field]: items,
        },
      };
    });
  };

  // Add array item
  const handleAddArrayItem = (sectionId, field) => {
    setEditedContent((prev) => {
      const section = prev[sectionId] || {};
      const items = [...(section[field] || [])];
      items.push({});
      return {
        ...prev,
        [sectionId]: {
          ...section,
          [field]: items,
        },
      };
    });
  };

  // Remove array item
  const handleRemoveArrayItem = (sectionId, field, index) => {
    setEditedContent((prev) => {
      const section = prev[sectionId] || {};
      const items = [...(section[field] || [])];
      items.splice(index, 1);
      return {
        ...prev,
        [sectionId]: {
          ...section,
          [field]: items,
        },
      };
    });
  };

  // Save content
  const handleSave = async (sectionId) => {
    setSaving(true);
    const db = getFirestore();

    try {
      await setDoc(
        doc(db, "siteContent", sectionId),
        {
          ...editedContent[sectionId],
          id: sectionId,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        },
        { merge: true }
      );

      setContent((prev) => ({
        ...prev,
        [sectionId]: editedContent[sectionId],
      }));

      setSnackbar({
        open: true,
        message: "Content saved successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving content:", error);
      setSnackbar({
        open: true,
        message: "Failed to save content",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if section has changes
  const hasChanges = (sectionId) => {
    return JSON.stringify(content[sectionId]) !== JSON.stringify(editedContent[sectionId]);
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

  // Render field based on type
  const renderField = (sectionId, field, value) => {
    if (field === "items" || field === "steps" || field === "members") {
      return renderArrayField(sectionId, field, value || []);
    }

    if (field === "address" || field === "hours") {
      return renderObjectField(sectionId, field, value || {});
    }

    if (field === "primaryButton" || field === "secondaryButton") {
      return renderButtonField(sectionId, field, value || {});
    }

    return (
      <TextField
        fullWidth
        label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
        value={value || ""}
        onChange={(e) => handleFieldChange(sectionId, field, e.target.value)}
        multiline={field === "content" || field === "subtitle"}
        rows={field === "content" ? 6 : field === "subtitle" ? 2 : 1}
        sx={{ mb: 2 }}
      />
    );
  };

  // Render array field (items, steps, members)
  const renderArrayField = (sectionId, field, items) => {
    // Check if this is a field that should have image support
    const supportsImages = field === "members" || field === "items";

    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          {field.charAt(0).toUpperCase() + field.slice(1)}
        </MDTypography>
        {items.map((item, index) => (
          <Card key={index} sx={{ mb: 1, p: 2, bgcolor: "grey.50" }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <MDTypography variant="caption" fontWeight="medium">
                Item {index + 1}
              </MDTypography>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveArrayItem(sectionId, field, index)}
              >
                <Icon>delete</Icon>
              </IconButton>
            </MDBox>
            {Object.keys(item).map((key) => {
              // Use CloudinaryImageInput for imageUrl fields
              if (key === "imageUrl") {
                return (
                  <MDBox key={key} mb={1}>
                    <CloudinaryImageInput
                      value={item[key] || ""}
                      onChange={(value) => handleArrayItemChange(sectionId, field, index, key, value)}
                      label="Image URL"
                      folder={`website/${sectionId}`}
                      previewSize={60}
                    />
                  </MDBox>
                );
              }
              return (
                <TextField
                  key={key}
                  fullWidth
                  size="small"
                  label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                  value={item[key] || ""}
                  onChange={(e) => handleArrayItemChange(sectionId, field, index, key, e.target.value)}
                  multiline={key === "quote" || key === "bio" || key === "description"}
                  rows={key === "quote" || key === "bio" || key === "description" ? 2 : 1}
                  sx={{ mb: 1 }}
                />
              );
            })}
            {Object.keys(item).length === 0 && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label="Title"
                  onChange={(e) => handleArrayItemChange(sectionId, field, index, "title", e.target.value)}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  onChange={(e) =>
                    handleArrayItemChange(sectionId, field, index, "description", e.target.value)
                  }
                  sx={{ mb: 1 }}
                />
                {supportsImages && (
                  <MDBox mb={1}>
                    <CloudinaryImageInput
                      value=""
                      onChange={(value) => handleArrayItemChange(sectionId, field, index, "imageUrl", value)}
                      label="Image URL (optional)"
                      folder={`website/${sectionId}`}
                      previewSize={60}
                    />
                  </MDBox>
                )}
              </>
            )}
          </Card>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={() => handleAddArrayItem(sectionId, field)}
        >
          Add Item
        </Button>
      </MDBox>
    );
  };

  // Render object field (address, hours)
  const renderObjectField = (sectionId, field, obj) => {
    const fields =
      field === "address"
        ? ["line1", "line2", "city", "state", "zip"]
        : ["weekday", "weekend"];

    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          {field.charAt(0).toUpperCase() + field.slice(1)}
        </MDTypography>
        <Card sx={{ p: 2, bgcolor: "grey.50" }}>
          {fields.map((subField) => (
            <TextField
              key={subField}
              fullWidth
              size="small"
              label={subField.charAt(0).toUpperCase() + subField.slice(1)}
              value={obj[subField] || ""}
              onChange={(e) =>
                handleFieldChange(sectionId, field, { ...obj, [subField]: e.target.value })
              }
              sx={{ mb: 1 }}
            />
          ))}
        </Card>
      </MDBox>
    );
  };

  // Render button field (primaryButton, secondaryButton)
  const renderButtonField = (sectionId, field, button) => {
    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          {field.replace(/([A-Z])/g, " $1")}
        </MDTypography>
        <Card sx={{ p: 2, bgcolor: "grey.50" }}>
          <TextField
            fullWidth
            size="small"
            label="Text"
            value={button.text || ""}
            onChange={(e) =>
              handleFieldChange(sectionId, field, { ...button, text: e.target.value })
            }
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Link (href)"
            value={button.href || ""}
            onChange={(e) =>
              handleFieldChange(sectionId, field, { ...button, href: e.target.value })
            }
          />
        </Card>
      </MDBox>
    );
  };

  const activeSection = CONTENT_SECTIONS[activeTab];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="medium">
            Site Content Management
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Edit website content sections
          </MDTypography>
        </MDBox>

        {loading ? (
          <Card>
            <MDBox p={3}>
              <Skeleton variant="rectangular" height={400} />
            </MDBox>
          </Card>
        ) : (
          <Card>
            <MDBox>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                {CONTENT_SECTIONS.map((section) => (
                  <Tab
                    key={section.id}
                    label={section.label}
                    icon={<Icon>{section.icon}</Icon>}
                    iconPosition="start"
                  />
                ))}
              </Tabs>

              <MDBox p={3}>
                <Grid container spacing={3}>
                  {activeSection.subsections.map((subsection) => (
                    <Grid item xs={12} lg={6} key={subsection.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <MDBox
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={2}
                          >
                            <MDTypography variant="h6">{subsection.label}</MDTypography>
                            {hasChanges(subsection.id) && (
                              <MDButton
                                variant="gradient"
                                color="info"
                                size="small"
                                onClick={() => handleSave(subsection.id)}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save"}
                              </MDButton>
                            )}
                          </MDBox>
                          <Divider sx={{ mb: 2 }} />
                          {subsection.fields.map((field) => (
                            <MDBox key={field}>
                              {renderField(
                                subsection.id,
                                field,
                                editedContent[subsection.id]?.[field]
                              )}
                            </MDBox>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </MDBox>
            </MDBox>
          </Card>
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

export default CMSSiteContent;
