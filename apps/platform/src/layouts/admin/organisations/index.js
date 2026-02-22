import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllOrganisations,
  getOrganisationUsers,
  createOrganisation,
  ORG_TIERS,
  TIER_CONFIG,
  getPricingTiers,
  isOrganisationExpired,
} from "utils/organisations";

// Firebase
import { getFunctions, httpsCallable } from "firebase/functions";

// MUI components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Dashboard layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Auth context
import { useAuth } from "context/AuthContext";

function Organisations() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pricing tiers from Firestore
  const [pricingTiers, setPricingTiers] = useState(TIER_CONFIG);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [newOrg, setNewOrg] = useState({
    companyName: "",
    companyNumber: "",
    registeredAddress: "",
    vatNumber: "",
    tier: ORG_TIERS.STARTER,
    licenceLimit: TIER_CONFIG.starter.defaultLicences,
    expiryDate: "",
    customLicences: false,
  });

  // Determine user role
  const userRole = currentUser?.role?.toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "super admin";
  const isSuperAdmin = userRole === "super admin";
  const isAccountManager = userRole === "account manager";

  // Handle clicking on company name to view details
  const handleViewOrganisation = useCallback((org) => {
    navigate(`/admin/organisations/${org.id}`);
  }, [navigate]);

  // Handle delete organisation
  const handleDeleteClick = (org) => {
    setOrgToDelete(org);
    setDeleteError("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteOrganisation = async () => {
    if (!orgToDelete) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const functions = getFunctions();
      const deleteOrganisation = httpsCallable(functions, "deleteOrganisation");

      const result = await deleteOrganisation({ organisationId: orgToDelete.id });

      // Remove from local state
      setOrganisations((prev) => prev.filter((org) => org.id !== orgToDelete.id));

      // Close dialog
      setDeleteDialogOpen(false);
      setOrgToDelete(null);

      // Show success message
      alert(
        `Organisation "${result.data.summary.organisationName}" deleted successfully.\n\n` +
        `Users deleted: ${result.data.summary.usersDeleted}`
      );
    } catch (error) {
      console.error("Error deleting organisation:", error);
      setDeleteError(error.message || "Failed to delete organisation");
    } finally {
      setDeleting(false);
    }
  };

  // Fetch pricing tiers on mount
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const tiers = await getPricingTiers();
        setPricingTiers(tiers);
      } catch (error) {
        console.error("Error fetching pricing tiers:", error);
        // Fallback is already set as initial state
      }
    };
    fetchTiers();
  }, []);

  // Handle tier change - update licence limit to default (unless custom)
  const handleTierChange = (tier) => {
    const tierConfig = pricingTiers[tier] || pricingTiers.starter;
    setNewOrg({
      ...newOrg,
      tier,
      licenceLimit: tierConfig?.defaultLicences || 5,
      customLicences: tier === "custom",
    });
  };

  // Handle create organisation
  const handleCreateOrganisation = async () => {
    if (!newOrg.companyName.trim()) {
      setCreateError("Company name is required");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const orgData = {
        companyName: newOrg.companyName.trim(),
        companyNumber: newOrg.companyNumber.trim(),
        registeredAddress: newOrg.registeredAddress.trim(),
        vatNumber: newOrg.vatNumber.trim(),
        tier: newOrg.tier,
        licenceLimit: parseInt(newOrg.licenceLimit, 10) || 5,
        expiryDate: newOrg.expiryDate ? new Date(newOrg.expiryDate) : null,
        createdBy: currentUser?.uid || "",
      };

      const created = await createOrganisation(orgData);

      // Add to local list
      setOrganisations((prev) => [
        {
          ...created,
          contactName: "—",
          phone: "—",
          userCount: 0,
          users: [],
        },
        ...prev,
      ]);

      // Close dialog and reset form
      setCreateDialogOpen(false);
      setNewOrg({
        companyName: "",
        companyNumber: "",
        registeredAddress: "",
        vatNumber: "",
        tier: ORG_TIERS.STARTER,
        licenceLimit: pricingTiers.starter?.defaultLicences || 5,
        expiryDate: "",
        customLicences: false,
      });
    } catch (error) {
      console.error("Error creating organisation:", error);
      setCreateError(error.message || "Failed to create organisation");
    } finally {
      setCreating(false);
    }
  };

  // Fetch organisations on mount
  useEffect(() => {
    const fetchOrganisations = async () => {
      setLoading(true);

      try {
        let allOrganisations = await getAllOrganisations();

        // For account managers, filter to only their organisation
        if (isAccountManager && currentUser?.organisationId) {
          allOrganisations = allOrganisations.filter(
            (org) => org.id === currentUser.organisationId
          );
        }

        // Fetch users for each organisation to get primary contact info
        const orgsWithDetails = await Promise.all(
          allOrganisations.map(async (org) => {
            const users = await getOrganisationUsers(org.id);

            // Find primary contact (prefer account manager, otherwise first client)
            const accountManager = users.find((u) => u.role === "account manager");
            const primaryContact = accountManager || users[0] || null;

            return {
              ...org,
              contactName: primaryContact
                ? `${primaryContact.firstName || ""} ${primaryContact.lastName || ""}`.trim()
                : "—",
              phone: primaryContact?.phone || "—",
              userCount: users.length,
              users,
            };
          })
        );

        setOrganisations(orgsWithDetails);
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchOrganisations();
    }
  }, [currentUser, isAccountManager]);

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get status chip for organisation
  const getStatusChip = (org) => {
    if (isOrganisationExpired(org)) {
      return <Chip label="Expired" size="small" color="error" />;
    }
    if (org.status === "suspended") {
      return <Chip label="Suspended" size="small" color="warning" />;
    }
    return <Chip label="Active" size="small" color="success" />;
  };

  // Get tier chip
  const getTierChip = (tier) => {
    const config = pricingTiers[tier] || pricingTiers.starter || TIER_CONFIG.starter;
    return (
      <Chip
        label={config.name}
        size="small"
        color={config.color}
        variant="outlined"
      />
    );
  };

  // Update table data when organisations change
  useEffect(() => {
    setTableData({
      columns: [
        {
          Header: "Company Name",
          accessor: "companyName",
          Cell: ({ row }) => (
            <MDBox
              component="span"
              sx={{
                color: "info.main",
                cursor: "pointer",
                fontWeight: "medium",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => handleViewOrganisation(row.original)}
            >
              {row.original.companyName}
            </MDBox>
          ),
        },
        {
          Header: "Tier",
          accessor: "tier",
          width: "10%",
          Cell: ({ row }) => getTierChip(row.original.tier || "starter"),
        },
        {
          Header: "Licences",
          accessor: "licences",
          width: "10%",
          Cell: ({ row }) => {
            const used = row.original.userCount || 0;
            const limit = row.original.licenceLimit || "∞";
            const isNearLimit = limit !== "∞" && used >= limit * 0.8;
            const isAtLimit = limit !== "∞" && used >= limit;
            return (
              <MDTypography
                variant="caption"
                fontWeight="medium"
                color={isAtLimit ? "error" : isNearLimit ? "warning" : "text"}
              >
                {used} / {limit}
              </MDTypography>
            );
          },
        },
        {
          Header: "Status",
          accessor: "status",
          width: "10%",
          Cell: ({ row }) => getStatusChip(row.original),
        },
        {
          Header: "Expiry",
          accessor: "expiryDate",
          width: "12%",
          Cell: ({ row }) => {
            const expiry = row.original.expiryDate;
            if (!expiry) return <MDTypography variant="caption" color="text">—</MDTypography>;
            const isExpired = isOrganisationExpired(row.original);
            return (
              <MDTypography
                variant="caption"
                color={isExpired ? "error" : "text"}
                fontWeight={isExpired ? "medium" : "regular"}
              >
                {formatDate(expiry)}
              </MDTypography>
            );
          },
        },
        {
          Header: "Contact",
          accessor: "contactName",
          Cell: ({ row }) => row.original.contactName || "—",
        },
        {
          Header: "Actions",
          accessor: "actions",
          width: "10%",
          Cell: ({ row }) => {
            const org = row.original;
            return (
              <MDBox display="flex" gap={0.5}>
                <Tooltip title="View Organisation">
                  <IconButton
                    size="small"
                    onClick={() => handleViewOrganisation(org)}
                    sx={{ color: "#1976d2" }}
                  >
                    <Icon fontSize="small">visibility</Icon>
                  </IconButton>
                </Tooltip>
                {isSuperAdmin && (
                  <Tooltip title="Delete Organisation">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(org)}
                      sx={{ color: "#d32f2f" }}
                    >
                      <Icon fontSize="small">delete</Icon>
                    </IconButton>
                  </Tooltip>
                )}
              </MDBox>
            );
          },
        },
      ],
      rows: organisations,
    });
  }, [organisations, handleViewOrganisation, pricingTiers, isSuperAdmin]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3} lineHeight={1} display="flex" justifyContent="space-between" alignItems="center">
            <MDBox>
              <MDTypography variant="h5" fontWeight="medium">
                {isAccountManager ? "My Organisation" : "Organisations"}
              </MDTypography>
              <MDTypography variant="button" color="text">
                {loading
                  ? "Loading..."
                  : `${organisations.length} organisation${organisations.length !== 1 ? "s" : ""} found`}
              </MDTypography>
            </MDBox>
            {isAdmin && (
              <MDButton
                variant="gradient"
                color="primary"
                startIcon={<Icon>add</Icon>}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Organisation
              </MDButton>
            )}
          </MDBox>
          <DataTable
            table={tableData}
            canSearch
            entriesPerPage={{ defaultValue: 25 }}
          />
        </Card>
      </MDBox>

      {/* Create Organisation Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="primary">business</Icon>
            <MDTypography variant="h5">Create New Organisation</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Name"
                value={newOrg.companyName}
                onChange={(e) => setNewOrg({ ...newOrg, companyName: e.target.value })}
                fullWidth
                required
                disabled={creating}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Number"
                value={newOrg.companyNumber}
                onChange={(e) => setNewOrg({ ...newOrg, companyNumber: e.target.value })}
                fullWidth
                disabled={creating}
                placeholder="e.g. 12345678"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Registered Address"
                value={newOrg.registeredAddress}
                onChange={(e) => setNewOrg({ ...newOrg, registeredAddress: e.target.value })}
                fullWidth
                multiline
                rows={2}
                disabled={creating}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="VAT Number"
                value={newOrg.vatNumber}
                onChange={(e) => setNewOrg({ ...newOrg, vatNumber: e.target.value })}
                fullWidth
                disabled={creating}
                placeholder="e.g. GB123456789"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Tier"
                value={newOrg.tier}
                onChange={(e) => handleTierChange(e.target.value)}
                fullWidth
                disabled={creating}
              >
                {Object.entries(pricingTiers).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <MDBox>
                      <MDTypography variant="button" fontWeight="medium">
                        {config.name}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {config.description}
                        {key !== "custom" && ` (default: ${config.defaultLicences} licences)`}
                      </MDTypography>
                    </MDBox>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Licence Limit (Seats)"
                type="number"
                value={newOrg.licenceLimit}
                onChange={(e) => setNewOrg({ ...newOrg, licenceLimit: e.target.value, customLicences: true })}
                fullWidth
                disabled={creating}
                inputProps={{ min: 1 }}
                helperText={
                  newOrg.tier === "custom"
                    ? "Set custom number of seats"
                    : `Default for ${pricingTiers[newOrg.tier]?.name || "Starter"}: ${pricingTiers[newOrg.tier]?.defaultLicences || 5}. Edit to override.`
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Expiry Date"
                type="date"
                value={newOrg.expiryDate}
                onChange={(e) => setNewOrg({ ...newOrg, expiryDate: e.target.value })}
                fullWidth
                disabled={creating}
                InputLabelProps={{ shrink: true }}
                helperText="Leave blank for no expiry"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setCreateDialogOpen(false)}
            disabled={creating}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="primary"
            onClick={handleCreateOrganisation}
            disabled={creating || !newOrg.companyName.trim()}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <Icon>add</Icon>}
          >
            {creating ? "Creating..." : "Create Organisation"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Delete Organisation Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="error">warning</Icon>
            <MDTypography variant="h5" color="error">Delete Organisation</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <MDTypography variant="body1" mb={2}>
            Are you sure you want to delete the organisation{" "}
            <strong>&quot;{orgToDelete?.companyName}&quot;</strong>?
          </MDTypography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <MDTypography variant="body2">
              This action will permanently delete:
            </MDTypography>
            <MDBox component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
              <li><MDTypography variant="body2">The organisation record</MDTypography></li>
              <li><MDTypography variant="body2">{orgToDelete?.userCount || 0} user account(s) (including Firebase Auth)</MDTypography></li>
              <li><MDTypography variant="body2">All teams within the organisation</MDTypography></li>
              <li><MDTypography variant="body2">All organisation favourite lists</MDTypography></li>
            </MDBox>
          </Alert>
          <MDTypography variant="body2" color="error" fontWeight="medium">
            This action cannot be undone.
          </MDTypography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="error"
            onClick={handleDeleteOrganisation}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Icon>delete</Icon>}
          >
            {deleting ? "Deleting..." : "Delete Organisation"}
          </MDButton>
        </DialogActions>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default Organisations;
