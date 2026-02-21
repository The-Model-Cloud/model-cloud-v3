/**
 * AddToListModal - Modal for adding a model to one or more favourite lists
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
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Avatar from "@mui/material/Avatar";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Components
import CreateListModal from "components/Favourites/CreateListModal";

// Context
import { useFavourites } from "context/FavouritesContext";

function AddToListModal({ open, onClose, model }) {
  const {
    favouriteLists,
    organisationLists,
    teamLists,
    addModelToList,
    removeModelFromList,
    getListsWithModel,
  } = useFavourites();

  // Combine all accessible lists
  const allLists = [
    ...favouriteLists.map(l => ({ ...l, section: "personal" })),
    ...organisationLists.map(l => ({ ...l, section: "organisation" })),
    ...teamLists.map(l => ({ ...l, section: "team" })),
  ];

  const [selectedLists, setSelectedLists] = useState([]);
  const [initialLists, setInitialLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Initialize selected lists when modal opens
  useEffect(() => {
    if (open && model) {
      const listsWithModel = getListsWithModel(model.uid);
      const listIds = listsWithModel.map((list) => list.id);
      setSelectedLists(listIds);
      setInitialLists(listIds);
    }
  }, [open, model, getListsWithModel]);

  const handleToggleList = (listId) => {
    setSelectedLists((prev) => {
      if (prev.includes(listId)) {
        return prev.filter((id) => id !== listId);
      } else {
        return [...prev, listId];
      }
    });
  };

  const handleSave = async () => {
    if (!model) return;

    setLoading(true);

    try {
      // Find lists to add to and remove from
      const listsToAdd = selectedLists.filter((id) => !initialLists.includes(id));
      const listsToRemove = initialLists.filter((id) => !selectedLists.includes(id));

      // Add to new lists
      for (const listId of listsToAdd) {
        await addModelToList(listId, model);
      }

      // Remove from unchecked lists
      for (const listId of listsToRemove) {
        await removeModelFromList(listId, model.uid);
      }

      onClose();
    } catch (error) {
      console.error("Failed to update lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListSuccess = (listId) => {
    // Auto-select the newly created list
    setSelectedLists((prev) => [...prev, listId]);
    setCreateModalOpen(false);
  };

  const modelName = model
    ? `${model.firstName || ""} ${model.lastName || ""}`.trim() || "Model"
    : "Model";

  const hasChanges =
    selectedLists.length !== initialLists.length ||
    selectedLists.some((id) => !initialLists.includes(id));

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={2}>
            {model?.profileAvatar && (
              <Avatar src={model.profileAvatar} alt={modelName} />
            )}
            <MDBox>
              <MDTypography variant="h6" fontWeight="medium">
                Add to List
              </MDTypography>
              <MDTypography variant="caption" color="text">
                {modelName}
              </MDTypography>
            </MDBox>
          </MDBox>
        </DialogTitle>

        <DialogContent dividers>
          {allLists.length === 0 ? (
            <MDBox textAlign="center" py={4}>
              <Icon sx={{ fontSize: 48, color: "grey.400" }}>folder_open</Icon>
              <MDTypography variant="body1" color="text" mt={2}>
                No lists yet
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={2}>
                Create your first list to organize models
              </MDTypography>
              <MDButton
                variant="gradient"
                color="info"
                onClick={() => setCreateModalOpen(true)}
                startIcon={<Icon>add</Icon>}
              >
                Create List
              </MDButton>
            </MDBox>
          ) : (
            <List sx={{ pt: 0 }}>
              {/* Personal Lists */}
              {favouriteLists.length > 0 && (
                <>
                  <MDBox px={2} py={0.5} bgcolor="grey.100">
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      My Lists
                    </MDTypography>
                  </MDBox>
                  {favouriteLists.map((list) => {
                    const isSelected = selectedLists.includes(list.id);
                    return (
                      <ListItem key={list.id} disablePadding>
                        <ListItemButton onClick={() => handleToggleList(list.id)}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={isSelected}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={list.title}
                            secondary={`${list.modelCount || 0} models`}
                          />
                          {list.linkedJobId && (
                            <Icon sx={{ color: "info.main", ml: 1 }} fontSize="small">
                              work
                            </Icon>
                          )}
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </>
              )}

              {/* Organisation Lists */}
              {organisationLists.length > 0 && (
                <>
                  <MDBox px={2} py={0.5} bgcolor="grey.100" mt={favouriteLists.length > 0 ? 1 : 0}>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Organisation Lists
                    </MDTypography>
                  </MDBox>
                  {organisationLists.map((list) => {
                    const isSelected = selectedLists.includes(list.id);
                    return (
                      <ListItem key={list.id} disablePadding>
                        <ListItemButton onClick={() => handleToggleList(list.id)}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={isSelected}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={list.title}
                            secondary={`${list.modelCount || 0} models`}
                          />
                          <Icon sx={{ color: "primary.main", ml: 1 }} fontSize="small">
                            business
                          </Icon>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </>
              )}

              {/* Team Lists */}
              {teamLists.length > 0 && (
                <>
                  <MDBox px={2} py={0.5} bgcolor="grey.100" mt={(favouriteLists.length > 0 || organisationLists.length > 0) ? 1 : 0}>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Team Lists
                    </MDTypography>
                  </MDBox>
                  {teamLists.map((list) => {
                    const isSelected = selectedLists.includes(list.id);
                    return (
                      <ListItem key={list.id} disablePadding>
                        <ListItemButton onClick={() => handleToggleList(list.id)}>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={isSelected}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={list.title}
                            secondary={`${list.modelCount || 0} models`}
                          />
                          <Icon sx={{ color: "secondary.main", ml: 1 }} fontSize="small">
                            groups
                          </Icon>
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </>
              )}

              <Divider sx={{ my: 1 }} />

              <ListItem disablePadding>
                <ListItemButton onClick={() => setCreateModalOpen(true)}>
                  <ListItemIcon>
                    <Icon color="info">add_circle</Icon>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <MDTypography variant="body2" color="info" fontWeight="medium">
                        Create New List
                      </MDTypography>
                    }
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

      {/* Create List Modal */}
      <CreateListModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreateListSuccess}
      />
    </>
  );
}

AddToListModal.defaultProps = {
  model: null,
};

AddToListModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  model: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    profileAvatar: PropTypes.string,
    location: PropTypes.string,
    rate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    publicSlug: PropTypes.string,
  }),
};

export default AddToListModal;
