/**
 * ChangeRoleDialog - Dialog for changing a user's role and organisation assignment (Admin only)
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 520,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  maxHeight: "90vh",
  overflow: "auto",
};

// Platform roles
const PLATFORM_ROLES = [
  { value: "model", label: "Model", color: "info" },
  { value: "client", label: "Client", color: "success" },
  { value: "account manager", label: "Account Manager", color: "warning" },
  { value: "admin", label: "Admin", color: "primary" },
  { value: "super admin", label: "Super Admin", color: "error" },
];

// Organisation roles
const ORG_ROLES = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

function ChangeRoleDialog({
  open,
  onClose,
  onConfirm,
  user,
  organisations,
  loading,
  error,
  isSuperAdmin,
}) {
  const [platformRole, setPlatformRole] = useState("");
  const [organisationId, setOrganisationId] = useState("");
  const [organisationRole, setOrganisationRole] = useState("member");
  const [validationError, setValidationError] = useState("");

  // Reset state when user changes or dialog opens
  useEffect(() => {
    if (open && user) {
      setPlatformRole(user.role || "client");
      setOrganisationId(user.organisationId || "");
      setOrganisationRole(user.organisationRole || "member");
      setValidationError("");
    }
  }, [open, user]);

  // Check if anything has changed
  const hasChanges = () => {
    if (platformRole !== (user?.role || "")) return true;
    if (organisationId !== (user?.organisationId || "")) return true;
    if (organisationId && organisationRole !== (user?.organisationRole || "member")) return true;
    return false;
  };

  // Validate and submit
  const handleSubmit = () => {
    if (!hasChanges()) {
      setValidationError("No changes have been made");
      return;
    }

    // Warn if changing to admin/super admin
    if ((platformRole === "admin" || platformRole === "super admin") &&
        user?.role !== "admin" && user?.role !== "super admin") {
      // Allow but the UI should make this clear
    }

    // If assigning to org, must have a role
    if (organisationId && !organisationRole) {
      setValidationError("Please select an organisation role");
      return;
    }

    setValidationError("");
    onConfirm({
      platformRole,
      organisationId: organisationId || null,
      organisationRole: organisationId ? organisationRole : null,
    });
  };

  // Handle organisation change
  const handleOrganisationChange = (e) => {
    const newOrgId = e.target.value;
    setOrganisationId(newOrgId);
    // If clearing org, clear org role too
    if (!newOrgId) {
      setOrganisationRole("member");
    }
  };

  const userName = user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown";
  const email = user?.email || "No email";
  const currentRole = user ? PLATFORM_ROLES.find((r) => r.value === user.role) : null;
  const currentOrg = user && organisations?.find((o) => o.id === user.organisationId);

  // Determine which platform roles this admin can assign
  const availableRoles = isSuperAdmin
    ? PLATFORM_ROLES
    : PLATFORM_ROLES.filter((r) => r.value !== "super admin");

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      {user ? (
      <Box sx={modalStyle}>
        {/* Header */}
        <MDBox display="flex" alignItems="center" mb={3}>
          <Icon sx={{ color: "#1976d2", fontSize: 28, mr: 1 }}>manage_accounts</Icon>
          <MDTypography variant="h5">Change User Role</MDTypography>
        </MDBox>

        {/* User info */}
        <MDBox mb={3} p={2} sx={{ bgcolor: "grey.100", borderRadius: 2 }}>
          <MDTypography variant="h6" fontWeight="medium">
            {userName}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {email}
          </MDTypography>
          <MDBox display="flex" gap={1} mt={1}>
            {currentRole && (
              <Chip
                label={currentRole.label}
                color={currentRole.color}
                size="small"
                variant="outlined"
              />
            )}
            {currentOrg && (
              <Chip
                label={currentOrg.companyName}
                size="small"
                variant="outlined"
                icon={<Icon sx={{ fontSize: "16px !important" }}>business</Icon>}
              />
            )}
          </MDBox>
        </MDBox>

        {/* Platform Role */}
        <MDBox mb={3}>
          <MDTypography variant="button" fontWeight="medium" color="text" mb={1} display="block">
            Platform Role
          </MDTypography>
          <FormControl fullWidth size="medium">
            <InputLabel id="platform-role-label">Account Type</InputLabel>
            <Select
              labelId="platform-role-label"
              value={platformRole}
              label="Account Type"
              onChange={(e) => setPlatformRole(e.target.value)}
              disabled={loading}
              sx={{ minHeight: 44 }}
            >
              {availableRoles.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(platformRole === "admin" || platformRole === "super admin") &&
           user?.role !== "admin" && user?.role !== "super admin" && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              This will grant administrative access to the platform.
            </Alert>
          )}
        </MDBox>

        <Divider sx={{ my: 2 }} />

        {/* Organisation Assignment */}
        <MDBox mb={3}>
          <MDTypography variant="button" fontWeight="medium" color="text" mb={1} display="block">
            Organisation Assignment
          </MDTypography>
          <FormControl fullWidth sx={{ mb: 2 }} size="medium">
            <InputLabel id="organisation-label">Organisation</InputLabel>
            <Select
              labelId="organisation-label"
              value={organisationId}
              label="Organisation"
              onChange={handleOrganisationChange}
              disabled={loading}
              sx={{ minHeight: 44 }}
            >
              <MenuItem value="">
                <em>No Organisation</em>
              </MenuItem>
              {organisations?.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.companyName} {org.userCount !== undefined ? `(${org.userCount} users)` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {organisationId && (
            <FormControl fullWidth>
              <InputLabel>Organisation Role</InputLabel>
              <Select
                value={organisationRole}
                label="Organisation Role"
                onChange={(e) => setOrganisationRole(e.target.value)}
                disabled={loading}
              >
                {ORG_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {organisationId && (
            <MDBox mt={2} p={2} sx={{ bgcolor: "grey.50", borderRadius: 1 }}>
              <MDTypography variant="caption" color="text">
                <strong>Role permissions:</strong>
                <br />
                {organisationRole === "owner" && "Full control - manage organisation, teams, members, and view all jobs/analytics"}
                {organisationRole === "admin" && "Team management - manage team members, view all org jobs, invite new members"}
                {organisationRole === "member" && "Standard access - create and manage own jobs, view favourites"}
              </MDTypography>
            </MDBox>
          )}
        </MDBox>

        {/* Validation error */}
        {validationError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}

        {/* API error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Action buttons */}
        <MDBox display="flex" justifyContent="flex-end" gap={2}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleSubmit}
            disabled={loading || !hasChanges()}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Icon>save</Icon>
              )
            }
          >
            {loading ? "Updating..." : "Update Role"}
          </MDButton>
        </MDBox>
      </Box>
      ) : (
        <Box sx={modalStyle}>
          <MDTypography>Loading...</MDTypography>
        </Box>
      )}
    </Modal>
  );
}

ChangeRoleDialog.defaultProps = {
  user: null,
  organisations: [],
  loading: false,
  error: null,
  isSuperAdmin: false,
};

ChangeRoleDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  user: PropTypes.shape({
    uid: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    organisationId: PropTypes.string,
    organisationRole: PropTypes.string,
  }),
  organisations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      companyName: PropTypes.string.isRequired,
      userCount: PropTypes.number,
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  isSuperAdmin: PropTypes.bool,
};

export default ChangeRoleDialog;
