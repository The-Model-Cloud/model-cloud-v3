/**
 * RequestChangeModal - Modal for clients/account managers to request organisation detail changes
 */

import { useState } from "react";
import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

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

const changeOptions = [
  "Company Name",
  "Year Established",
  "Company Number",
  "Registered Address",
  "VAT Number",
  "Multiple Fields",
  "Other",
];

function RequestChangeModal({
  open,
  onClose,
  onSubmit,
  currentOrganisation,
  loading,
  error,
  success,
}) {
  const [whatToChange, setWhatToChange] = useState(null);
  const [newDetails, setNewDetails] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [validationError, setValidationError] = useState("");

  // Reset state when dialog opens
  const handleOpen = () => {
    setWhatToChange(null);
    setNewDetails("");
    setAdditionalNotes("");
    setValidationError("");
  };

  // Validate and submit
  const handleSubmit = () => {
    if (!whatToChange) {
      setValidationError("Please select what you would like to change");
      return;
    }
    if (!newDetails.trim()) {
      setValidationError("Please provide the new details");
      return;
    }
    setValidationError("");
    onSubmit({
      whatToChange,
      newDetails: newDetails.trim(),
      additionalNotes: additionalNotes.trim(),
    });
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      onTransitionEnter={handleOpen}
    >
      <Box sx={modalStyle}>
        {/* Header */}
        <MDBox display="flex" alignItems="center" mb={3}>
          <Icon sx={{ color: "#1976d2", fontSize: 28, mr: 1 }}>edit_note</Icon>
          <MDTypography variant="h5">
            Request Details Change
          </MDTypography>
        </MDBox>

        {/* Current organisation info */}
        <MDBox mb={3}>
          <MDTypography variant="body2" color="text">
            Current Organisation:
          </MDTypography>
          <MDTypography variant="h6" fontWeight="medium">
            {currentOrganisation?.companyName || "Not set"}
          </MDTypography>
        </MDBox>

        {/* Success message - show instead of form */}
        {success ? (
          <MDBox>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your request has been sent to the admin team. They will review your request and get back to you.
            </Alert>
            <MDBox display="flex" justifyContent="flex-end">
              <MDButton
                variant="gradient"
                color="info"
                onClick={handleClose}
              >
                Close
              </MDButton>
            </MDBox>
          </MDBox>
        ) : (
          <>
            {/* What to change - Dropdown */}
            <MDBox mb={2}>
              <Autocomplete
                options={changeOptions}
                value={whatToChange}
                onChange={(_, val) => {
                  setWhatToChange(val);
                  setValidationError("");
                }}
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="What would you like to change?"
                    placeholder="Select a field..."
                  />
                )}
              />
            </MDBox>

            {/* New Details - Text Area */}
            <MDBox mb={2}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="New Details"
                placeholder="Enter the new/correct details..."
                value={newDetails}
                onChange={(e) => {
                  setNewDetails(e.target.value);
                  setValidationError("");
                }}
                disabled={loading}
              />
            </MDBox>

            {/* Additional Notes */}
            <MDBox mb={3}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Additional Notes (optional)"
                placeholder="Any additional context or reasons..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                disabled={loading}
              />
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
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </MDButton>
              <MDButton
                variant="gradient"
                color="info"
                onClick={handleSubmit}
                disabled={loading || !whatToChange || !newDetails.trim()}
                startIcon={
                  loading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Icon>send</Icon>
                  )
                }
              >
                {loading ? "Sending..." : "Send Request"}
              </MDButton>
            </MDBox>
          </>
        )}
      </Box>
    </Modal>
  );
}

RequestChangeModal.defaultProps = {
  currentOrganisation: null,
  loading: false,
  error: null,
  success: false,
};

RequestChangeModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  currentOrganisation: PropTypes.shape({
    id: PropTypes.string,
    companyName: PropTypes.string,
    yearEstablished: PropTypes.string,
    companyNumber: PropTypes.string,
    registeredAddress: PropTypes.string,
    vatNumber: PropTypes.string,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  success: PropTypes.bool,
};

export default RequestChangeModal;
