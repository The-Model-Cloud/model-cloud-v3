/**
 * CreateListModal - Modal for creating a new favourite list
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
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Context
import { useFavourites } from "context/FavouritesContext";
import { useAuth } from "context/AuthContext";

function CreateListModal({ open, onClose, onCreated, linkedJob }) {
  const { user } = useAuth();
  const { createFavouriteList } = useFavourites();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSuperAdmin = user?.role === "super admin";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title for your list");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const listId = await createFavouriteList({
        title: title.trim(),
        description: description.trim(),
        visibility,
        linkedJobId: linkedJob?.id || null,
        linkedJobTitle: linkedJob?.title || null,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setVisibility("private");

      // Notify parent
      if (onCreated) {
        onCreated(listId);
      }

      onClose();
    } catch (err) {
      console.error("Failed to create list:", err);
      setError("Failed to create list. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTitle("");
      setDescription("");
      setVisibility("private");
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <MDTypography variant="h5" fontWeight="medium">
            Create New List
          </MDTypography>
        </DialogTitle>

        <DialogContent>
          <MDBox pt={1} display="flex" flexDirection="column" gap={2}>
            {linkedJob && (
              <MDBox
                p={2}
                borderRadius="lg"
                sx={{ backgroundColor: "info.light", color: "info.contrastText" }}
              >
                <MDTypography variant="body2" color="white">
                  This list will be linked to job: <strong>{linkedJob.title}</strong>
                </MDTypography>
              </MDBox>
            )}

            <TextField
              label="List Title"
              placeholder="e.g., Summer Campaign 2024"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              autoFocus
              error={!!error && !title.trim()}
            />

            <TextField
              label="Description (optional)"
              placeholder="Add a description for your list..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>Visibility</InputLabel>
              <Select
                value={visibility}
                label="Visibility"
                onChange={(e) => setVisibility(e.target.value)}
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

            {error && (
              <MDTypography variant="caption" color="error">
                {error}
              </MDTypography>
            )}
          </MDBox>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </MDButton>
          <MDButton
            type="submit"
            variant="gradient"
            color="info"
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Create List"
            )}
          </MDButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

CreateListModal.defaultProps = {
  onCreated: null,
  linkedJob: null,
};

CreateListModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func,
  linkedJob: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
  }),
};

export default CreateListModal;
