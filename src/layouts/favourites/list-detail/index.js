/**
 * FavouriteListDetail - View and manage a specific favourite list
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Favourites components
import ModelCard from "components/Favourites/ModelCard";
import ModelListItem from "components/Favourites/ModelListItem";
import ViewToggle from "components/Favourites/ViewToggle";

// Context and utilities
import { useFavourites } from "context/FavouritesContext";
import { useAuth } from "context/AuthContext";
import { getFavouriteList, removeModelFromList, updateFavouriteList, deleteFavouriteList } from "utils/favourites";

function FavouriteListDetail() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isModelFavourited, toggleQuickFavourite } = useFavourites();

  // State
  const [list, setList] = useState(null);
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Fetch list data
  useEffect(() => {
    const fetchList = async () => {
      try {
        const listData = await getFavouriteList(listId);
        if (!listData) {
          navigate("/favourites");
          return;
        }

        // Check ownership
        if (listData.ownerId !== user?.uid) {
          navigate("/favourites");
          return;
        }

        setList(listData);
        setEditTitle(listData.title);
        setEditDescription(listData.description || "");

        // Fetch full model data for models in the list
        if (listData.modelIds && listData.modelIds.length > 0) {
          const chunks = [];
          for (let i = 0; i < listData.modelIds.length; i += 30) {
            chunks.push(listData.modelIds.slice(i, i + 30));
          }

          const allModels = [];
          for (const chunk of chunks) {
            const modelsQuery = query(
              collection(db, "users"),
              where(documentId(), "in", chunk)
            );
            const snapshot = await getDocs(modelsQuery);
            snapshot.docs.forEach((doc) => {
              allModels.push({ uid: doc.id, ...doc.data() });
            });
          }

          setModels(allModels);
          setFilteredModels(allModels);
        }
      } catch (error) {
        console.error("Error fetching list:", error);
        navigate("/favourites");
      } finally {
        setLoading(false);
      }
    };

    if (listId && user) {
      fetchList();
    }
  }, [listId, user, navigate]);

  // Filter models based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredModels(models);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = models.filter((model) => {
      const fullName = `${model.firstName || ""} ${model.lastName || ""}`.toLowerCase();
      const location = (model.location || "").toLowerCase();
      return fullName.includes(query) || location.includes(query);
    });

    setFilteredModels(filtered);
  }, [searchQuery, models]);

  // Handlers
  const handleFavouriteToggle = useCallback(
    async (modelUid) => {
      await toggleQuickFavourite(modelUid);
    },
    [toggleQuickFavourite]
  );

  const handleRemoveFromList = useCallback(
    async (modelUid) => {
      try {
        await removeModelFromList(listId, modelUid);
        setModels((prev) => prev.filter((m) => m.uid !== modelUid));
        setList((prev) => ({
          ...prev,
          modelIds: prev.modelIds.filter((id) => id !== modelUid),
          modelCount: Math.max(0, (prev.modelCount || 1) - 1),
        }));
      } catch (error) {
        console.error("Error removing model from list:", error);
      }
    },
    [listId]
  );

  const handleDeleteList = async () => {
    try {
      await deleteFavouriteList(listId);
      navigate("/favourites");
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  const handleEditSave = async () => {
    try {
      await updateFavouriteList(listId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setList((prev) => ({
        ...prev,
        title: editTitle.trim(),
        description: editDescription.trim(),
      }));
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error updating list:", error);
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/shared/${list.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setShareModalOpen(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  if (!list) {
    return null;
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          {/* Header */}
          <MDBox p={3} borderBottom="1px solid" borderColor="grey.200">
            <MDBox display="flex" alignItems="center" mb={1}>
              <MDButton
                component={Link}
                to="/favourites"
                variant="text"
                color="info"
                size="small"
                sx={{ mr: 1 }}
              >
                <Icon>arrow_back</Icon>
              </MDButton>
              <MDTypography variant="h4" fontWeight="medium" sx={{ flexGrow: 1 }}>
                {list.title}
              </MDTypography>

              {/* Actions */}
              <MDBox display="flex" gap={1}>
                <Tooltip title="Edit list">
                  <IconButton onClick={() => setEditModalOpen(true)}>
                    <Icon>edit</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share list">
                  <IconButton onClick={() => setShareModalOpen(true)}>
                    <Icon color="info">share</Icon>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete list">
                  <IconButton onClick={() => setDeleteConfirmOpen(true)}>
                    <Icon color="error">delete</Icon>
                  </IconButton>
                </Tooltip>
              </MDBox>
            </MDBox>

            <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <MDTypography variant="body2" color="text">
                {list.modelCount || 0} models
              </MDTypography>

              <Chip
                size="small"
                icon={<Icon fontSize="small">{
                  list.visibility === "public" ? "public" :
                  list.visibility === "authenticated" ? "link" : "lock"
                }</Icon>}
                label={
                  list.visibility === "public" ? "Public" :
                  list.visibility === "authenticated" ? "Shared" : "Private"
                }
              />

              {list.linkedJobTitle && (
                <Chip
                  size="small"
                  icon={<Icon fontSize="small">work</Icon>}
                  label={`Linked to: ${list.linkedJobTitle}`}
                  color="info"
                />
              )}

              {list.description && (
                <MDTypography variant="body2" color="text" sx={{ width: "100%", mt: 1 }}>
                  {list.description}
                </MDTypography>
              )}
            </MDBox>
          </MDBox>

          {/* Toolbar */}
          <MDBox
            p={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <TextField
              placeholder="Search models..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon>search</Icon>
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />

            <ViewToggle view={viewMode} onChange={setViewMode} />
          </MDBox>

          {/* Content */}
          <MDBox p={3} pt={0}>
            {models.length === 0 ? (
              <MDBox textAlign="center" py={6}>
                <Icon sx={{ fontSize: 48, color: "grey.400" }}>person_add</Icon>
                <MDTypography variant="h6" color="text" mt={2}>
                  No models in this list
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  Browse models and add them to this list
                </MDTypography>
                <MDButton
                  variant="gradient"
                  color="info"
                  sx={{ mt: 2 }}
                  onClick={() => navigate("/models/browse")}
                >
                  Browse Models
                </MDButton>
              </MDBox>
            ) : filteredModels.length === 0 ? (
              <MDBox textAlign="center" py={6}>
                <Icon sx={{ fontSize: 48, color: "grey.400" }}>search_off</Icon>
                <MDTypography variant="h6" color="text" mt={2}>
                  No models match your search
                </MDTypography>
              </MDBox>
            ) : viewMode === "card" ? (
              <Grid container spacing={3}>
                {filteredModels.map((model) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={model.uid}>
                    <ModelCard
                      model={model}
                      isFavourited={isModelFavourited(model.uid)}
                      onFavouriteToggle={handleFavouriteToggle}
                      showActions={false}
                      showRemoveButton
                      onRemove={handleRemoveFromList}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <MDBox display="flex" flexDirection="column" gap={1}>
                {filteredModels.map((model) => (
                  <ModelListItem
                    key={model.uid}
                    model={model}
                    isFavourited={isModelFavourited(model.uid)}
                    onFavouriteToggle={handleFavouriteToggle}
                    showActions={false}
                    showRemoveButton
                    onRemove={handleRemoveFromList}
                  />
                ))}
              </MDBox>
            )}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete List</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            Are you sure you want to delete "{list.title}"? This action cannot be undone.
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="error" onClick={handleDeleteList}>
            Delete
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit List</DialogTitle>
        <DialogContent>
          <MDBox pt={1} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </MDBox>
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={() => setEditModalOpen(false)}>
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="info" onClick={handleEditSave} disabled={!editTitle.trim()}>
            Save
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={shareModalOpen} onClose={() => setShareModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share List</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2" mb={2}>
            Share "{list.title}" with others
          </MDTypography>
          <MDBox
            p={2}
            borderRadius="lg"
            sx={{ backgroundColor: "grey.100" }}
          >
            <MDTypography variant="body2" fontFamily="monospace" sx={{ wordBreak: "break-all" }}>
              {window.location.origin}/shared/{list.shareToken}
            </MDTypography>
          </MDBox>
          <MDTypography variant="caption" color="text" mt={2} display="block">
            {list.visibility === "private"
              ? "This list is private. Change visibility to share with others."
              : list.visibility === "authenticated"
              ? "Recipients must be logged in to view this list."
              : "Anyone with this link can view this list."}
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={() => setShareModalOpen(false)}>
            Close
          </MDButton>
          <MDButton variant="gradient" color="info" onClick={handleCopyShareLink}>
            Copy Link
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

export default FavouriteListDetail;
