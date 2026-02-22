/**
 * CMS Pricing - Manage pricing tiers
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
  deleteDoc,
} from "firebase/firestore";

// MUI components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

const EMPTY_TIER = {
  name: "",
  description: "",
  price: 0,
  billingPeriod: "monthly",
  features: [],
  highlighted: false,
  order: 0,
  published: false,
  hide: false,
};

function CMSPricing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, tier: null, isNew: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, tier: null });
  const [featureInput, setFeatureInput] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const isSuperAdmin = user?.role === "super admin";

  // Fetch pricing tiers
  useEffect(() => {
    const fetchTiers = async () => {
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const db = getFirestore();

      try {
        const snapshot = await getDocs(collection(db, "pricingTiers"));
        const tiersData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setTiers(tiersData);
      } catch (error) {
        console.error("Error fetching pricing tiers:", error);
        setSnackbar({
          open: true,
          message: "Failed to load pricing tiers",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
  }, [isSuperAdmin]);

  // Open edit dialog
  const handleEdit = (tier) => {
    setEditDialog({ open: true, tier: { ...tier }, isNew: false });
    setFeatureInput("");
  };

  // Open new tier dialog
  const handleNew = () => {
    const newTier = {
      ...EMPTY_TIER,
      id: `tier_${Date.now()}`,
      order: tiers.length,
    };
    setEditDialog({ open: true, tier: newTier, isNew: true });
    setFeatureInput("");
  };

  // Close edit dialog
  const handleCloseEdit = () => {
    setEditDialog({ open: false, tier: null, isNew: false });
  };

  // Handle field change in dialog
  const handleFieldChange = (field, value) => {
    setEditDialog((prev) => ({
      ...prev,
      tier: {
        ...prev.tier,
        [field]: value,
      },
    }));
  };

  // Add feature
  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setEditDialog((prev) => ({
        ...prev,
        tier: {
          ...prev.tier,
          features: [...(prev.tier.features || []), featureInput.trim()],
        },
      }));
      setFeatureInput("");
    }
  };

  // Remove feature
  const handleRemoveFeature = (index) => {
    setEditDialog((prev) => ({
      ...prev,
      tier: {
        ...prev.tier,
        features: prev.tier.features.filter((_, i) => i !== index),
      },
    }));
  };

  // Save tier
  const handleSave = async () => {
    setSaving(true);
    const db = getFirestore();
    const { tier, isNew } = editDialog;

    try {
      const tierData = { ...tier };
      delete tierData.id; // Don't save id as a field

      await setDoc(doc(db, "pricingTiers", tier.id), tierData);

      if (isNew) {
        setTiers((prev) => [...prev, { id: tier.id, ...tierData }]);
      } else {
        setTiers((prev) =>
          prev.map((t) => (t.id === tier.id ? { id: tier.id, ...tierData } : t))
        );
      }

      handleCloseEdit();
      setSnackbar({
        open: true,
        message: `Pricing tier ${isNew ? "created" : "updated"} successfully`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving pricing tier:", error);
      setSnackbar({
        open: true,
        message: "Failed to save pricing tier",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete tier
  const handleDelete = async () => {
    const db = getFirestore();
    const { tier } = deleteDialog;

    try {
      await deleteDoc(doc(db, "pricingTiers", tier.id));
      setTiers((prev) => prev.filter((t) => t.id !== tier.id));
      setDeleteDialog({ open: false, tier: null });
      setSnackbar({
        open: true,
        message: "Pricing tier deleted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting pricing tier:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete pricing tier",
        severity: "error",
      });
    }
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
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">
              Pricing Tiers
            </MDTypography>
            <MDTypography variant="body2" color="text">
              Manage subscription pricing plans
            </MDTypography>
          </MDBox>
          <MDButton variant="gradient" color="info" onClick={handleNew}>
            <Icon sx={{ mr: 1 }}>add</Icon>
            Add Tier
          </MDButton>
        </MDBox>

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rectangular" height={300} />
              </Grid>
            ))}
          </Grid>
        ) : tiers.length === 0 ? (
          <Card>
            <MDBox p={4} textAlign="center">
              <Icon fontSize="large" color="disabled">
                payments
              </Icon>
              <MDTypography variant="h6" mt={2}>
                No Pricing Tiers
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={2}>
                Create your first pricing tier to get started.
              </MDTypography>
              <MDButton variant="gradient" color="info" onClick={handleNew}>
                Create Tier
              </MDButton>
            </MDBox>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {tiers.map((tier) => (
              <Grid item xs={12} md={4} key={tier.id}>
                <Card
                  sx={{
                    height: "100%",
                    border: tier.highlighted ? "2px solid" : "1px solid",
                    borderColor: tier.highlighted ? "info.main" : "grey.300",
                    opacity: tier.published ? 1 : 0.7,
                  }}
                >
                  <CardContent>
                    <MDBox display="flex" justifyContent="space-between" alignItems="flex-start">
                      <MDBox>
                        <MDTypography variant="h5" fontWeight="medium">
                          {tier.name}
                        </MDTypography>
                        <MDTypography variant="body2" color="text">
                          {tier.description}
                        </MDTypography>
                      </MDBox>
                      <MDBox>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(tier)}>
                            <Icon>edit</Icon>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, tier })}
                          >
                            <Icon>delete</Icon>
                          </IconButton>
                        </Tooltip>
                      </MDBox>
                    </MDBox>

                    <MDBox my={2}>
                      <MDTypography variant="h3" fontWeight="bold">
                        £{tier.price}
                        <MDTypography
                          component="span"
                          variant="body2"
                          color="text"
                          fontWeight="regular"
                        >
                          /{tier.billingPeriod}
                        </MDTypography>
                      </MDTypography>
                    </MDBox>

                    <MDBox mb={2}>
                      {!tier.published && (
                        <Chip label="Draft" size="small" color="warning" sx={{ mr: 0.5 }} />
                      )}
                      {tier.highlighted && (
                        <Chip label="Highlighted" size="small" color="info" sx={{ mr: 0.5 }} />
                      )}
                      {tier.hide && <Chip label="Hidden" size="small" color="default" />}
                    </MDBox>

                    <MDTypography variant="subtitle2" fontWeight="medium" mb={1}>
                      Features:
                    </MDTypography>
                    <MDBox component="ul" pl={2} m={0}>
                      {(tier.features || []).slice(0, 5).map((feature, index) => (
                        <MDBox component="li" key={index}>
                          <MDTypography variant="body2" color="text">
                            {feature}
                          </MDTypography>
                        </MDBox>
                      ))}
                      {(tier.features || []).length > 5 && (
                        <MDTypography variant="caption" color="text">
                          +{tier.features.length - 5} more
                        </MDTypography>
                      )}
                    </MDBox>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </MDBox>
      <Footer />

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editDialog.isNew ? "Create Pricing Tier" : "Edit Pricing Tier"}
        </DialogTitle>
        <DialogContent>
          {editDialog.tier && (
            <MDBox pt={1}>
              <TextField
                fullWidth
                label="Name"
                value={editDialog.tier.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                value={editDialog.tier.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Price"
                    type="number"
                    value={editDialog.tier.price}
                    onChange={(e) => handleFieldChange("price", Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    select
                    label="Billing Period"
                    value={editDialog.tier.billingPeriod}
                    onChange={(e) => handleFieldChange("billingPeriod", e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </TextField>
                </Grid>
              </Grid>
              <TextField
                fullWidth
                label="Order"
                type="number"
                value={editDialog.tier.order}
                onChange={(e) => handleFieldChange("order", Number(e.target.value))}
                sx={{ mb: 2 }}
              />

              <MDTypography variant="subtitle2" fontWeight="medium" mb={1}>
                Features
              </MDTypography>
              <MDBox display="flex" gap={1} mb={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add a feature..."
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddFeature()}
                />
                <MDButton variant="outlined" color="info" onClick={handleAddFeature}>
                  Add
                </MDButton>
              </MDBox>
              <MDBox mb={2}>
                {(editDialog.tier.features || []).map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    size="small"
                    onDelete={() => handleRemoveFeature(index)}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </MDBox>

              <MDBox>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editDialog.tier.published}
                      onChange={(e) => handleFieldChange("published", e.target.checked)}
                    />
                  }
                  label="Published"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={editDialog.tier.highlighted}
                      onChange={(e) => handleFieldChange("highlighted", e.target.checked)}
                    />
                  }
                  label="Highlighted"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={editDialog.tier.hide}
                      onChange={(e) => handleFieldChange("hide", e.target.checked)}
                    />
                  }
                  label="Hidden"
                />
              </MDBox>
            </MDBox>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton onClick={handleCloseEdit}>Cancel</MDButton>
          <MDButton variant="gradient" color="info" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, tier: null })}>
        <DialogTitle>Delete Pricing Tier</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            Are you sure you want to delete &quot;{deleteDialog.tier?.name}&quot;? This action cannot
            be undone.
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={() => setDeleteDialog({ open: false, tier: null })}>Cancel</MDButton>
          <MDButton variant="gradient" color="error" onClick={handleDelete}>
            Delete
          </MDButton>
        </DialogActions>
      </Dialog>

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

export default CMSPricing;
