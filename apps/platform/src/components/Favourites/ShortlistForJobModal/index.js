/**
 * ShortlistForJobModal - Modal to link a favourite list to a job or create a new shortlist
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";

// MUI components
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Radio from "@mui/material/Radio";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Components
import CreateListModal from "components/Favourites/CreateListModal";

// Context and utilities
import { useFavourites } from "context/FavouritesContext";
import { linkListToJob, unlinkListFromJob, getListsForJob } from "utils/favourites";

function ShortlistForJobModal({ open, onClose, job, onShortlistUpdated }) {
  const { favouriteLists, createFavouriteList } = useFavourites();

  const [selectedListId, setSelectedListId] = useState(null);
  const [currentLinkedListId, setCurrentLinkedListId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Find currently linked list when modal opens
  useEffect(() => {
    if (open && job) {
      const linkedList = favouriteLists.find((list) => list.linkedJobId === job.id);
      if (linkedList) {
        setSelectedListId(linkedList.id);
        setCurrentLinkedListId(linkedList.id);
      } else {
        setSelectedListId(null);
        setCurrentLinkedListId(null);
      }
    }
  }, [open, job, favouriteLists]);

  const handleSelectList = (listId) => {
    setSelectedListId(listId === selectedListId ? null : listId);
  };

  const handleSave = async () => {
    if (!job) return;

    setLoading(true);

    try {
      // If there was a previously linked list and it's different, unlink it
      if (currentLinkedListId && currentLinkedListId !== selectedListId) {
        await unlinkListFromJob(currentLinkedListId);
      }

      // Link the new list if one is selected
      if (selectedListId) {
        await linkListToJob(selectedListId, job.id, job.title || job.reference);
      }

      if (onShortlistUpdated) {
        onShortlistUpdated(selectedListId);
      }

      onClose();
    } catch (error) {
      console.error("Failed to update shortlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListSuccess = async (listId) => {
    // Auto-select and link the newly created list
    setSelectedListId(listId);
    setCreateModalOpen(false);
  };

  const handleCreateNewShortlist = () => {
    setCreateModalOpen(true);
  };

  const hasChanges = selectedListId !== currentLinkedListId;

  // Filter lists that are not already linked to other jobs
  const availableLists = favouriteLists.filter(
    (list) => !list.linkedJobId || list.linkedJobId === job?.id
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDBox>
            <MDTypography variant="h5" fontWeight="medium">
              Shortlist for Job
            </MDTypography>
            {job && (
              <MDTypography variant="body2" color="text">
                {job.title || job.reference}
              </MDTypography>
            )}
          </MDBox>
        </DialogTitle>

        <DialogContent dividers>
          <MDTypography variant="body2" color="text" mb={2}>
            Select an existing favourite list to use as a shortlist for this job, or create a new one.
          </MDTypography>

          {availableLists.length === 0 ? (
            <MDBox textAlign="center" py={4}>
              <Icon sx={{ fontSize: 48, color: "grey.400" }}>folder_open</Icon>
              <MDTypography variant="body1" color="text" mt={2}>
                No available lists
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={2}>
                Create a new shortlist for this job
              </MDTypography>
              <MDButton
                variant="gradient"
                color="info"
                onClick={handleCreateNewShortlist}
                startIcon={<Icon>add</Icon>}
              >
                Create Shortlist
              </MDButton>
            </MDBox>
          ) : (
            <List sx={{ pt: 0 }}>
              {/* Option to remove shortlist */}
              {currentLinkedListId && (
                <>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelectList(null)}>
                      <ListItemIcon>
                        <Radio
                          edge="start"
                          checked={selectedListId === null}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <MDTypography variant="body2" color="text">
                            No shortlist
                          </MDTypography>
                        }
                        secondary="Remove shortlist from this job"
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                </>
              )}

              {/* Available lists */}
              {availableLists.map((list) => (
                <ListItem key={list.id} disablePadding>
                  <ListItemButton onClick={() => handleSelectList(list.id)}>
                    <ListItemIcon>
                      <Radio
                        edge="start"
                        checked={selectedListId === list.id}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={list.title}
                      secondary={`${list.modelCount || 0} models`}
                    />
                    {list.linkedJobId === job?.id && (
                      <Chip
                        label="Current"
                        size="small"
                        color="info"
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}

              <Divider sx={{ my: 1 }} />

              {/* Create new option */}
              <ListItem disablePadding>
                <ListItemButton onClick={handleCreateNewShortlist}>
                  <ListItemIcon>
                    <Icon color="info">add_circle</Icon>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <MDTypography variant="body2" color="info" fontWeight="medium">
                        Create New Shortlist
                      </MDTypography>
                    }
                    secondary="Create a new list specifically for this job"
                  />
                </ListItemButton>
              </ListItem>
            </List>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <MDButton variant="outlined" color="secondary" onClick={onClose}>
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleSave}
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Save"
            )}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Create List Modal - pre-linked to job */}
      <CreateListModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreateListSuccess}
        linkedJob={job}
      />
    </>
  );
}

ShortlistForJobModal.defaultProps = {
  job: null,
  onShortlistUpdated: null,
};

ShortlistForJobModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    reference: PropTypes.string,
  }),
  onShortlistUpdated: PropTypes.func,
};

export default ShortlistForJobModal;
