/**
 * DeleteUserDialog - Confirmation dialog for deleting a user account
 * Used by admins to delete users from admin pages
 */

import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 480,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

const DEFAULT_AVATAR = "https://via.placeholder.com/80x80?text=?";

// Role color mapping
const getRoleColor = (role) => {
  switch (role) {
    case "model":
      return "info";
    case "client":
      return "success";
    case "account manager":
      return "warning";
    case "admin":
      return "primary";
    case "super admin":
      return "error";
    default:
      return "default";
  }
};

// Format role for display
const formatRole = (role) => {
  if (!role) return "Unknown";
  return role
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Get deletion items based on user role
const getDeletionItems = (role) => {
  const baseItems = [
    "User profile and account data",
    "Firebase Authentication account",
  ];

  if (role === "model") {
    return [
      ...baseItems,
      "Profile images from Cloudinary",
      "Message threads and conversations",
      "Job applications",
      "Removal from all favourite lists",
    ];
  }

  if (role === "client" || role === "account manager") {
    return [
      ...baseItems,
      "Profile images from Cloudinary",
      "Message threads and conversations",
      "Created jobs (if any)",
      "Favourite lists",
    ];
  }

  return baseItems;
};

function DeleteUserDialog({
  open,
  onClose,
  onConfirm,
  user,
  loading,
  error,
}) {
  if (!user) return null;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || "Unknown User";
  const email = user.email || "No email";
  const avatar = user.profileAvatar || DEFAULT_AVATAR;
  const role = user.role || "unknown";

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box sx={modalStyle}>
        {/* Header with warning icon */}
        <MDBox display="flex" alignItems="center" mb={2}>
          <Icon sx={{ color: "#d32f2f", fontSize: 32, mr: 1 }}>warning</Icon>
          <MDTypography variant="h5" color="error">
            Delete User Account
          </MDTypography>
        </MDBox>

        {/* User info */}
        <MDBox
          display="flex"
          alignItems="center"
          p={2}
          mb={3}
          sx={{
            backgroundColor: "grey.100",
            borderRadius: 1,
          }}
        >
          <MDAvatar
            src={avatar}
            alt={fullName}
            size="lg"
            shadow="sm"
            sx={{ mr: 2 }}
          />
          <MDBox>
            <MDBox display="flex" alignItems="center" gap={1}>
              <MDTypography variant="h6" fontWeight="medium">
                {fullName}
              </MDTypography>
              <Chip
                label={formatRole(role)}
                color={getRoleColor(role)}
                size="small"
                variant="outlined"
              />
            </MDBox>
            <MDTypography variant="body2" color="text">
              {email}
            </MDTypography>
          </MDBox>
        </MDBox>

        {/* Warning text */}
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>This action is permanent and cannot be undone.</strong>
        </Alert>

        <MDTypography variant="body2" color="text" mb={3}>
          The following will be permanently deleted:
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            {getDeletionItems(role).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </MDTypography>

        <MDTypography variant="caption" color="text" display="block" mb={3}>
          This action will be logged with your admin credentials.
        </MDTypography>

        {/* Error display */}
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
            color="error"
            onClick={handleConfirm}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Icon>delete_forever</Icon>
              )
            }
          >
            {loading ? "Deleting..." : "Delete User"}
          </MDButton>
        </MDBox>
      </Box>
    </Modal>
  );
}

DeleteUserDialog.defaultProps = {
  user: null,
  loading: false,
  error: null,
};

DeleteUserDialog.propTypes = {
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
    profileAvatar: PropTypes.string,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default DeleteUserDialog;
