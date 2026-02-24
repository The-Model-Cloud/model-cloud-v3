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
    id: "layout",
    label: "Layout",
    icon: "view_quilt",
    subsections: [
      {
        id: "layout-header",
        label: "Header",
        fields: ["logoLightUrl", "logoDarkUrl", "navLinks", "signInButtonText", "signUpButtonText"],
      },
      {
        id: "layout-footer",
        label: "Footer",
        fields: ["logoLightUrl", "logoDarkUrl", "tagline", "sections", "socialLinks", "copyrightText"],
      },
    ],
  },
  {
    id: "home",
    label: "Home Page",
    icon: "home",
    subsections: [
      { id: "home-hero", label: "Hero Section", fields: ["badge", "title", "titleHighlight", "subtitle", "primaryCta", "secondaryCta", "trustText", "heroImage"] },
      { id: "home-features", label: "Features", fields: ["sectionTitle", "sectionSubtitle", "items"] },
      { id: "home-howItWorks", label: "How It Works", fields: ["sectionTitle", "sectionSubtitle", "items"] },
      { id: "home-testimonials", label: "Testimonials", fields: ["sectionTitle", "sectionSubtitle", "items"] },
      { id: "home-cta", label: "Call to Action", fields: ["title", "subtitle", "primaryCta", "secondaryCta"] },
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
      { id: "aboutUs-cta", label: "Call to Action", fields: ["title", "subtitle", "primaryButtonText", "primaryButtonLink", "secondaryButtonText", "secondaryButtonLink"] },
    ],
  },
  {
    id: "pricing",
    label: "Pricing Page",
    icon: "payments",
    subsections: [
      { id: "pricing-hero", label: "Hero Section", fields: ["title", "subtitle", "modelButtonText", "clientButtonText"] },
      { id: "pricing-modelsSection", label: "Models Section", fields: ["title", "subtitle", "icon"] },
      { id: "pricing-modelCard", label: "Model Card", fields: ["badge", "title", "description", "price", "priceSuffix", "buttonText", "buttonLink"] },
      { id: "pricing-modelFeatures", label: "Model Features", fields: ["items"] },
      { id: "pricing-clientsSection", label: "Clients Section", fields: ["title", "subtitle", "icon"] },
      { id: "pricing-comparison", label: "Plan Comparison", fields: ["title", "subtitle", "rows"] },
      { id: "pricing-faqs", label: "FAQs", fields: ["items"] },
      { id: "pricing-cta", label: "Call to Action", fields: ["title", "subtitle", "modelButtonText", "modelButtonLink", "clientButtonText", "clientButtonLink"] },
    ],
  },
  {
    id: "whyUs",
    label: "Why Us",
    icon: "star",
    subsections: [
      { id: "whyUs-hero", label: "Hero Section", fields: ["title", "subtitle"] },
      { id: "whyUs-benefits", label: "Benefits", fields: ["title", "items"] },
      { id: "whyUs-comparisons", label: "Comparisons", fields: ["title", "subtitle", "items"] },
      { id: "whyUs-forModels", label: "For Models Section", fields: ["title", "features", "ctaTitle", "ctaSubtitle", "ctaButtonText", "ctaButtonLink"] },
      { id: "whyUs-forClients", label: "For Clients Section", fields: ["title", "features", "ctaTitle", "ctaSubtitle", "ctaButtonText", "ctaButtonLink"] },
      { id: "whyUs-testimonials", label: "Testimonials", fields: ["title", "items"] },
      { id: "whyUs-cta", label: "Call to Action", fields: ["title", "subtitle", "buttonText", "buttonLink"] },
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
      {
        id: "contact-faqTeaser",
        label: "FAQ Teaser Section",
        fields: ["title", "subtitle", "buttonText", "buttonLink"],
      },
    ],
  },
  {
    id: "faq",
    label: "FAQ Page",
    icon: "help",
    subsections: [
      {
        id: "faq-content",
        label: "FAQ Content",
        fields: ["heroTitle", "heroSubtitle", "categories"],
      },
      {
        id: "faq-cta",
        label: "Contact CTA Section",
        fields: ["title", "subtitle", "buttonText", "buttonLink"],
      },
    ],
  },
  {
    id: "legal",
    label: "Legal Pages",
    icon: "gavel",
    subsections: [
      {
        id: "legal-privacy",
        label: "Privacy Policy",
        fields: ["title", "lastUpdated", "content"],
      },
      {
        id: "legal-terms",
        label: "Terms of Service",
        fields: ["title", "lastUpdated", "content"],
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

    if (field === "primaryButton" || field === "secondaryButton" || field === "primaryCta" || field === "secondaryCta") {
      return renderButtonField(sectionId, field, value || {});
    }

    if (field === "navLinks") {
      return renderNavLinksField(sectionId, field, value || []);
    }

    if (field === "sections") {
      return renderFooterSectionsField(sectionId, field, value || []);
    }

    if (field === "socialLinks") {
      return renderSocialLinksField(sectionId, field, value || []);
    }

    if (field === "categories") {
      return renderFAQCategoriesField(sectionId, field, value || []);
    }

    if (field === "rows") {
      return renderComparisonRowsField(sectionId, field, value || []);
    }

    if (field === "features") {
      return renderFeaturesField(sectionId, field, value || []);
    }

    if (field === "logoLightUrl" || field === "logoDarkUrl") {
      return (
        <MDBox mb={2}>
          <CloudinaryImageInput
            value={value || ""}
            onChange={(val) => handleFieldChange(sectionId, field, val)}
            label={field === "logoLightUrl" ? "Logo (Light Mode)" : "Logo (Dark Mode)"}
            folder="website/logos"
            previewSize={80}
          />
        </MDBox>
      );
    }

    if (field === "heroImage" || field === "imageUrl") {
      return (
        <MDBox mb={2}>
          <CloudinaryImageInput
            value={value || ""}
            onChange={(val) => handleFieldChange(sectionId, field, val)}
            label={field === "heroImage" ? "Hero Image" : "Image"}
            folder={`website/${sectionId}`}
            previewSize={120}
          />
        </MDBox>
      );
    }

    // Determine if this is a legal page content field (needs larger textarea)
    const isLegalContent = sectionId.startsWith("legal-") && field === "content";
    const isMultiline = field === "content" || field === "subtitle" || field === "tagline" || field === "sectionSubtitle";
    const rowCount = isLegalContent ? 20 : field === "content" ? 6 : isMultiline ? 2 : 1;

    return (
      <TextField
        fullWidth
        label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
        value={value || ""}
        onChange={(e) => handleFieldChange(sectionId, field, e.target.value)}
        multiline={isMultiline}
        rows={rowCount}
        helperText={isLegalContent ? "Supports markdown formatting (## for headings, - for lists, **bold**)" : undefined}
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

  // Render navigation links field (header navLinks)
  const renderNavLinksField = (sectionId, field, links) => {
    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          Navigation Links
        </MDTypography>
        {links.map((link, index) => (
          <Card key={index} sx={{ mb: 1, p: 2, bgcolor: "grey.50" }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <MDTypography variant="caption" fontWeight="medium">
                Link {index + 1}
              </MDTypography>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveArrayItem(sectionId, field, index)}
              >
                <Icon>delete</Icon>
              </IconButton>
            </MDBox>
            <TextField
              fullWidth
              size="small"
              label="Label"
              value={link.label || ""}
              onChange={(e) => handleArrayItemChange(sectionId, field, index, "label", e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Link (href)"
              value={link.href || ""}
              onChange={(e) => handleArrayItemChange(sectionId, field, index, "href", e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Icon (Font Awesome name, e.g., 'home', 'users')"
              value={link.icon || ""}
              onChange={(e) => handleArrayItemChange(sectionId, field, index, "icon", e.target.value)}
              sx={{ mb: 1 }}
            />
          </Card>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={() => handleAddArrayItem(sectionId, field)}
        >
          Add Navigation Link
        </Button>
      </MDBox>
    );
  };

  // Render footer sections field (sections with title and links)
  const renderFooterSectionsField = (sectionId, field, sections) => {
    const handleSectionChange = (sectionIndex, key, value) => {
      setEditedContent((prev) => {
        const currentSections = [...(prev[sectionId]?.[field] || [])];
        currentSections[sectionIndex] = {
          ...currentSections[sectionIndex],
          [key]: value,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentSections,
          },
        };
      });
    };

    const handleSectionLinkChange = (sectionIndex, linkIndex, key, value) => {
      setEditedContent((prev) => {
        const currentSections = [...(prev[sectionId]?.[field] || [])];
        const currentLinks = [...(currentSections[sectionIndex]?.links || [])];
        currentLinks[linkIndex] = {
          ...currentLinks[linkIndex],
          [key]: value,
        };
        currentSections[sectionIndex] = {
          ...currentSections[sectionIndex],
          links: currentLinks,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentSections,
          },
        };
      });
    };

    const addLinkToSection = (sectionIndex) => {
      setEditedContent((prev) => {
        const currentSections = [...(prev[sectionId]?.[field] || [])];
        const currentLinks = [...(currentSections[sectionIndex]?.links || [])];
        currentLinks.push({ label: "", href: "" });
        currentSections[sectionIndex] = {
          ...currentSections[sectionIndex],
          links: currentLinks,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentSections,
          },
        };
      });
    };

    const removeLinkFromSection = (sectionIndex, linkIndex) => {
      setEditedContent((prev) => {
        const currentSections = [...(prev[sectionId]?.[field] || [])];
        const currentLinks = [...(currentSections[sectionIndex]?.links || [])];
        currentLinks.splice(linkIndex, 1);
        currentSections[sectionIndex] = {
          ...currentSections[sectionIndex],
          links: currentLinks,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentSections,
          },
        };
      });
    };

    const addSection = () => {
      setEditedContent((prev) => {
        const currentSections = [...(prev[sectionId]?.[field] || [])];
        currentSections.push({ title: "", links: [] });
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentSections,
          },
        };
      });
    };

    const removeSection = (sectionIndex) => {
      setEditedContent((prev) => {
        const currentSections = [...(prev[sectionId]?.[field] || [])];
        currentSections.splice(sectionIndex, 1);
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentSections,
          },
        };
      });
    };

    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          Footer Sections
        </MDTypography>
        {sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} sx={{ mb: 2, p: 2, bgcolor: "grey.50" }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <MDTypography variant="caption" fontWeight="medium">
                Section {sectionIndex + 1}
              </MDTypography>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeSection(sectionIndex)}
              >
                <Icon>delete</Icon>
              </IconButton>
            </MDBox>
            <TextField
              fullWidth
              size="small"
              label="Section Title"
              value={section.title || ""}
              onChange={(e) => handleSectionChange(sectionIndex, "title", e.target.value)}
              sx={{ mb: 2 }}
            />
            <MDTypography variant="caption" color="text" mb={1}>
              Links in this section:
            </MDTypography>
            {(section.links || []).map((link, linkIndex) => (
              <Card key={linkIndex} sx={{ mb: 1, p: 1, bgcolor: "white" }}>
                <MDBox display="flex" alignItems="center" gap={1}>
                  <TextField
                    size="small"
                    label="Label"
                    value={link.label || ""}
                    onChange={(e) =>
                      handleSectionLinkChange(sectionIndex, linkIndex, "label", e.target.value)
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="href"
                    value={link.href || ""}
                    onChange={(e) =>
                      handleSectionLinkChange(sectionIndex, linkIndex, "href", e.target.value)
                    }
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeLinkFromSection(sectionIndex, linkIndex)}
                  >
                    <Icon fontSize="small">close</Icon>
                  </IconButton>
                </MDBox>
              </Card>
            ))}
            <Button
              variant="text"
              size="small"
              startIcon={<Icon>add</Icon>}
              onClick={() => addLinkToSection(sectionIndex)}
            >
              Add Link
            </Button>
          </Card>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={addSection}
        >
          Add Footer Section
        </Button>
      </MDBox>
    );
  };

  // Render social links field
  const renderSocialLinksField = (sectionId, field, socialLinks) => {
    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          Social Media Links
        </MDTypography>
        {socialLinks.map((social, index) => (
          <Card key={index} sx={{ mb: 1, p: 2, bgcolor: "grey.50" }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <MDTypography variant="caption" fontWeight="medium">
                Social Link {index + 1}
              </MDTypography>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveArrayItem(sectionId, field, index)}
              >
                <Icon>delete</Icon>
              </IconButton>
            </MDBox>
            <TextField
              fullWidth
              size="small"
              label="Platform Name (e.g., instagram, linkedin)"
              value={social.platform || ""}
              onChange={(e) => handleArrayItemChange(sectionId, field, index, "platform", e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="URL"
              value={social.url || ""}
              onChange={(e) => handleArrayItemChange(sectionId, field, index, "url", e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Icon (e.g., 'fa-brands fa-instagram')"
              value={social.icon || ""}
              onChange={(e) => handleArrayItemChange(sectionId, field, index, "icon", e.target.value)}
              helperText="Use Font Awesome format: 'fa-brands fa-instagram' for brands"
            />
          </Card>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={() => handleAddArrayItem(sectionId, field)}
        >
          Add Social Link
        </Button>
      </MDBox>
    );
  };

  // Render FAQ categories field (categories with items)
  const renderFAQCategoriesField = (sectionId, field, categories) => {
    const handleCategoryChange = (categoryIndex, key, value) => {
      setEditedContent((prev) => {
        const currentCategories = [...(prev[sectionId]?.[field] || [])];
        currentCategories[categoryIndex] = {
          ...currentCategories[categoryIndex],
          [key]: value,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentCategories,
          },
        };
      });
    };

    const handleFAQItemChange = (categoryIndex, itemIndex, key, value) => {
      setEditedContent((prev) => {
        const currentCategories = [...(prev[sectionId]?.[field] || [])];
        const currentItems = [...(currentCategories[categoryIndex]?.items || [])];
        currentItems[itemIndex] = {
          ...currentItems[itemIndex],
          [key]: value,
        };
        currentCategories[categoryIndex] = {
          ...currentCategories[categoryIndex],
          items: currentItems,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentCategories,
          },
        };
      });
    };

    const addItemToCategory = (categoryIndex) => {
      setEditedContent((prev) => {
        const currentCategories = [...(prev[sectionId]?.[field] || [])];
        const currentItems = [...(currentCategories[categoryIndex]?.items || [])];
        currentItems.push({ question: "", answer: "" });
        currentCategories[categoryIndex] = {
          ...currentCategories[categoryIndex],
          items: currentItems,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentCategories,
          },
        };
      });
    };

    const removeItemFromCategory = (categoryIndex, itemIndex) => {
      setEditedContent((prev) => {
        const currentCategories = [...(prev[sectionId]?.[field] || [])];
        const currentItems = [...(currentCategories[categoryIndex]?.items || [])];
        currentItems.splice(itemIndex, 1);
        currentCategories[categoryIndex] = {
          ...currentCategories[categoryIndex],
          items: currentItems,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentCategories,
          },
        };
      });
    };

    const addCategory = () => {
      setEditedContent((prev) => {
        const currentCategories = [...(prev[sectionId]?.[field] || [])];
        currentCategories.push({ title: "", icon: "", items: [] });
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentCategories,
          },
        };
      });
    };

    const removeCategory = (categoryIndex) => {
      setEditedContent((prev) => {
        const currentCategories = [...(prev[sectionId]?.[field] || [])];
        currentCategories.splice(categoryIndex, 1);
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentCategories,
          },
        };
      });
    };

    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          FAQ Categories
        </MDTypography>
        {categories.map((category, categoryIndex) => (
          <Card key={categoryIndex} sx={{ mb: 2, p: 2, bgcolor: "grey.50" }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <MDTypography variant="caption" fontWeight="medium">
                Category {categoryIndex + 1}
              </MDTypography>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeCategory(categoryIndex)}
              >
                <Icon>delete</Icon>
              </IconButton>
            </MDBox>
            <TextField
              fullWidth
              size="small"
              label="Category Title"
              value={category.title || ""}
              onChange={(e) => handleCategoryChange(categoryIndex, "title", e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Icon (Font Awesome name, e.g., 'question-circle', 'credit-card')"
              value={category.icon || ""}
              onChange={(e) => handleCategoryChange(categoryIndex, "icon", e.target.value)}
              sx={{ mb: 2 }}
            />
            <MDTypography variant="caption" color="text" mb={1}>
              FAQ Items:
            </MDTypography>
            {(category.items || []).map((item, itemIndex) => (
              <Card key={itemIndex} sx={{ mb: 1, p: 1.5, bgcolor: "white" }}>
                <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <MDTypography variant="caption">Q&A {itemIndex + 1}</MDTypography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeItemFromCategory(categoryIndex, itemIndex)}
                  >
                    <Icon fontSize="small">close</Icon>
                  </IconButton>
                </MDBox>
                <TextField
                  fullWidth
                  size="small"
                  label="Question"
                  value={item.question || ""}
                  onChange={(e) =>
                    handleFAQItemChange(categoryIndex, itemIndex, "question", e.target.value)
                  }
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Answer"
                  value={item.answer || ""}
                  onChange={(e) =>
                    handleFAQItemChange(categoryIndex, itemIndex, "answer", e.target.value)
                  }
                  multiline
                  rows={2}
                />
              </Card>
            ))}
            <Button
              variant="text"
              size="small"
              startIcon={<Icon>add</Icon>}
              onClick={() => addItemToCategory(categoryIndex)}
            >
              Add FAQ Item
            </Button>
          </Card>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={addCategory}
        >
          Add FAQ Category
        </Button>
      </MDBox>
    );
  };

  // Render comparison rows field (for pricing plan comparison table)
  const renderComparisonRowsField = (sectionId, field, rows) => {
    const handleRowChange = (rowIndex, key, value) => {
      setEditedContent((prev) => {
        const currentRows = [...(prev[sectionId]?.[field] || [])];
        currentRows[rowIndex] = {
          ...currentRows[rowIndex],
          [key]: value,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentRows,
          },
        };
      });
    };

    const addRow = () => {
      setEditedContent((prev) => {
        const currentRows = [...(prev[sectionId]?.[field] || [])];
        currentRows.push({ feature: "", starter: "", professional: "", enterprise: "" });
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentRows,
          },
        };
      });
    };

    const removeRow = (rowIndex) => {
      setEditedContent((prev) => {
        const currentRows = [...(prev[sectionId]?.[field] || [])];
        currentRows.splice(rowIndex, 1);
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentRows,
          },
        };
      });
    };

    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          Comparison Table Rows
        </MDTypography>
        <MDTypography variant="caption" color="text" mb={2} display="block">
          Use &quot;check&quot; for a checkmark, &quot;-&quot; for not available, or any text value
        </MDTypography>
        {rows.map((row, rowIndex) => (
          <Card key={rowIndex} sx={{ mb: 1, p: 2, bgcolor: "grey.50" }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <MDTypography variant="caption" fontWeight="medium">
                Row {rowIndex + 1}
              </MDTypography>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeRow(rowIndex)}
              >
                <Icon>delete</Icon>
              </IconButton>
            </MDBox>
            <TextField
              fullWidth
              size="small"
              label="Feature Name"
              value={row.feature || ""}
              onChange={(e) => handleRowChange(rowIndex, "feature", e.target.value)}
              sx={{ mb: 1 }}
            />
            <MDBox display="flex" gap={1}>
              <TextField
                size="small"
                label="Starter"
                value={row.starter || ""}
                onChange={(e) => handleRowChange(rowIndex, "starter", e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Professional"
                value={row.professional || ""}
                onChange={(e) => handleRowChange(rowIndex, "professional", e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Enterprise"
                value={row.enterprise || ""}
                onChange={(e) => handleRowChange(rowIndex, "enterprise", e.target.value)}
                sx={{ flex: 1 }}
              />
            </MDBox>
          </Card>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={addRow}
        >
          Add Comparison Row
        </Button>
      </MDBox>
    );
  };

  // Render features field (for Why Us For Models/Clients sections)
  const renderFeaturesField = (sectionId, field, features) => {
    const handleFeatureChange = (featureIndex, key, value) => {
      setEditedContent((prev) => {
        const currentFeatures = [...(prev[sectionId]?.[field] || [])];
        currentFeatures[featureIndex] = {
          ...currentFeatures[featureIndex],
          [key]: value,
        };
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentFeatures,
          },
        };
      });
    };

    const addFeature = () => {
      setEditedContent((prev) => {
        const currentFeatures = [...(prev[sectionId]?.[field] || [])];
        currentFeatures.push({ title: "", description: "" });
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentFeatures,
          },
        };
      });
    };

    const removeFeature = (featureIndex) => {
      setEditedContent((prev) => {
        const currentFeatures = [...(prev[sectionId]?.[field] || [])];
        currentFeatures.splice(featureIndex, 1);
        return {
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            [field]: currentFeatures,
          },
        };
      });
    };

    return (
      <MDBox mb={2}>
        <MDTypography variant="subtitle2" mb={1}>
          Features
        </MDTypography>
        {features.map((feature, featureIndex) => (
          <Card key={featureIndex} sx={{ mb: 1, p: 2, bgcolor: "grey.50" }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <MDTypography variant="caption" fontWeight="medium">
                Feature {featureIndex + 1}
              </MDTypography>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeFeature(featureIndex)}
              >
                <Icon>delete</Icon>
              </IconButton>
            </MDBox>
            <TextField
              fullWidth
              size="small"
              label="Title"
              value={feature.title || ""}
              onChange={(e) => handleFeatureChange(featureIndex, "title", e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Description"
              value={feature.description || ""}
              onChange={(e) => handleFeatureChange(featureIndex, "description", e.target.value)}
              multiline
              rows={2}
            />
          </Card>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={addFeature}
        >
          Add Feature
        </Button>
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
