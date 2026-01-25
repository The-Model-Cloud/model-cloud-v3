/**
 * ShareListModal - Modal for sharing a favourite list via email, link, or social media
 */

import { useState } from "react";
import PropTypes from "prop-types";

// MUI components
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Icons
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EmailIcon from "@mui/icons-material/Email";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

// Context
import { useAuth } from "context/AuthContext";

// Utilities
import { updateListVisibility, generateShareUrl } from "utils/favourites";
import { sendShareListEmail } from "utils/api";

function ShareListModal({ open, onClose, list, onListUpdated }) {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState(list?.visibility || "private");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const isSuperAdmin = user?.role === "super admin";
  const shareUrl = list ? generateShareUrl(list.shareToken) : "";

  // Initialize email fields when modal opens
  useState(() => {
    if (list) {
      setVisibility(list.visibility || "private");
      setEmailSubject(`Check out my model list: ${list.title}`);
      setEmailBody(
        `Hi,\n\nI wanted to share my favourite models list "${list.title}" with you.\n\nView the list here: ${shareUrl}\n\nBest regards`
      );
    }
  }, [list, shareUrl]);

  const handleVisibilityChange = async (e) => {
    const newVisibility = e.target.value;
    setVisibility(newVisibility);

    if (list) {
      try {
        await updateListVisibility(list.id, newVisibility);
        if (onListUpdated) {
          onListUpdated({ ...list, visibility: newVisibility });
        }
        showSnackbar("Visibility updated");
      } catch (error) {
        console.error("Error updating visibility:", error);
        showSnackbar("Failed to update visibility");
      }
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    showSnackbar("Link copied to clipboard!");
  };

  const handleEmailShare = () => {
    const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, "_blank");
  };

  const handleSendEmail = async () => {
    if (!emailTo) return;

    setSendingEmail(true);
    try {
      const senderName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Someone";
      const result = await sendShareListEmail(
        emailTo,
        list.title,
        list.description || "",
        shareUrl,
        list.modelCount || 0,
        senderName
      );

      if (result.success) {
        showSnackbar("Email sent successfully!");
        setEmailTo("");
      } else if (result.skipped) {
        showSnackbar("Email service not configured. Use 'Open Email Client' instead.", "warning");
      } else {
        showSnackbar("Failed to send email", "error");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      showSnackbar("Failed to send email", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const handleTwitterShare = () => {
    const text = `Check out this model list: ${list?.title}`;
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const handleWhatsAppShare = () => {
    const text = `Check out this model list: ${list?.title} - ${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (!list) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDTypography variant="h5" fontWeight="medium">
            Share List
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {list.title}
          </MDTypography>
        </DialogTitle>

        <DialogContent dividers>
          {/* Visibility Setting */}
          <MDBox mb={3}>
            <MDTypography variant="subtitle2" fontWeight="medium" mb={1}>
              Visibility
            </MDTypography>
            <FormControl fullWidth size="small">
              <InputLabel>Who can view this list?</InputLabel>
              <Select
                value={visibility}
                label="Who can view this list?"
                onChange={handleVisibilityChange}
              >
                <MenuItem value="private">
                  Private - Only you can see this list
                </MenuItem>
                <MenuItem value="authenticated">
                  Shared - Anyone with the link (must be logged in)
                </MenuItem>
                {isSuperAdmin && (
                  <MenuItem value="public">
                    Public - Anyone with the link can view
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {visibility === "private" && (
              <MDTypography variant="caption" color="warning" mt={1} display="block">
                Change visibility to "Shared" or "Public" to share this list with others.
              </MDTypography>
            )}
          </MDBox>

          <Divider sx={{ my: 2 }} />

          {/* Copy Link */}
          <MDBox mb={3}>
            <MDTypography variant="subtitle2" fontWeight="medium" mb={1}>
              Share Link
            </MDTypography>
            <MDBox
              display="flex"
              alignItems="center"
              p={1.5}
              borderRadius="lg"
              sx={{ backgroundColor: "grey.100" }}
            >
              <MDTypography
                variant="body2"
                fontFamily="monospace"
                sx={{
                  flexGrow: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {shareUrl}
              </MDTypography>
              <Tooltip title="Copy link">
                <IconButton onClick={handleCopyLink} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </MDBox>
          </MDBox>

          <Divider sx={{ my: 2 }} />

          {/* Social Sharing */}
          <MDBox mb={3}>
            <MDTypography variant="subtitle2" fontWeight="medium" mb={1}>
              Share on Social Media
            </MDTypography>
            <MDBox display="flex" gap={1} flexWrap="wrap">
              <Tooltip title="Share on Facebook">
                <IconButton
                  onClick={handleFacebookShare}
                  sx={{
                    backgroundColor: "#1877F2",
                    color: "white",
                    "&:hover": { backgroundColor: "#166FE5" },
                  }}
                >
                  <FacebookIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share on Twitter/X">
                <IconButton
                  onClick={handleTwitterShare}
                  sx={{
                    backgroundColor: "#1DA1F2",
                    color: "white",
                    "&:hover": { backgroundColor: "#1A91DA" },
                  }}
                >
                  <TwitterIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share on LinkedIn">
                <IconButton
                  onClick={handleLinkedInShare}
                  sx={{
                    backgroundColor: "#0A66C2",
                    color: "white",
                    "&:hover": { backgroundColor: "#095196" },
                  }}
                >
                  <LinkedInIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share on WhatsApp">
                <IconButton
                  onClick={handleWhatsAppShare}
                  sx={{
                    backgroundColor: "#25D366",
                    color: "white",
                    "&:hover": { backgroundColor: "#22C35E" },
                  }}
                >
                  <WhatsAppIcon />
                </IconButton>
              </Tooltip>
            </MDBox>
          </MDBox>

          <Divider sx={{ my: 2 }} />

          {/* Email Sharing */}
          <MDBox>
            <MDTypography variant="subtitle2" fontWeight="medium" mb={1}>
              Share via Email
            </MDTypography>
            <MDBox display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Recipient Email"
                placeholder="email@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Message"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={3}
              />
              <MDBox display="flex" gap={1}>
                <MDButton
                  variant="gradient"
                  color="info"
                  startIcon={<EmailIcon />}
                  onClick={handleSendEmail}
                  disabled={!emailTo || sendingEmail}
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </MDButton>
                <MDButton
                  variant="outlined"
                  color="info"
                  onClick={handleEmailShare}
                  disabled={!emailTo}
                >
                  Open Email Client
                </MDButton>
              </MDBox>
            </MDBox>
          </MDBox>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <MDButton variant="gradient" color="dark" onClick={onClose}>
            Done
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

ShareListModal.defaultProps = {
  list: null,
  onListUpdated: null,
};

ShareListModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  list: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    shareToken: PropTypes.string.isRequired,
    visibility: PropTypes.oneOf(["private", "authenticated", "public"]),
  }),
  onListUpdated: PropTypes.func,
};

export default ShareListModal;
