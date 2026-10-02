import PropTypes from "prop-types";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import CircularProgress from "@mui/material/CircularProgress";

import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

/** A plain "are you sure" dialog for account actions. `children` holds the explanation of what will happen. */
function ConfirmDialog({ open, title, confirmLabel, confirmColor, busy, onConfirm, onClose, children }) {
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <MDTypography variant="body2" color="text" component="div">
          {children}
        </MDTypography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="text" color="dark" onClick={onClose} disabled={busy}>
          Go back
        </MDButton>
        <MDButton variant="gradient" color={confirmColor} onClick={onConfirm} disabled={busy}>
          {busy ? <CircularProgress size={18} color="inherit" /> : confirmLabel}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

ConfirmDialog.defaultProps = { confirmColor: "info", busy: false };
ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string.isRequired,
  confirmColor: PropTypes.string,
  busy: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default ConfirmDialog;
