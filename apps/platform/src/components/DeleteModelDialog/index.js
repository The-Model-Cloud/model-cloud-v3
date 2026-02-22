/**
 * DeleteModelDialog - Confirmation dialog for deleting a single model account
 * Used by admins to delete models from Browse Models and All Models pages
 */

import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

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

function DeleteModelDialog({
  open,
  onClose,
  onConfirm,
  model,
  loading,
  error,
}) {
  if (!model) return null;

  const fullName = `${model.firstName || ""} ${model.lastName || ""}`.trim() || model.name || "Unknown Model";
  const email = model.email || "No email";
  const avatar = model.profileAvatar || DEFAULT_AVATAR;

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
            Delete Model Account
          </MDTypography>
        </MDBox>

        {/* Model info */}
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
            <MDTypography variant="h6" fontWeight="medium">
              {fullName}
            </MDTypography>
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
            <li>User profile and account data</li>
            <li>Profile images from Cloudinary</li>
            <li>Firebase Authentication account</li>
            <li>Message threads and conversations</li>
            <li>Job applications</li>
            <li>Removal from all favourite lists</li>
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
            {loading ? "Deleting..." : "Delete Model"}
          </MDButton>
        </MDBox>
      </Box>
    </Modal>
  );
}

DeleteModelDialog.defaultProps = {
  model: null,
  loading: false,
  error: null,
};

DeleteModelDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  model: PropTypes.shape({
    uid: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    profileAvatar: PropTypes.string,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default DeleteModelDialog;
