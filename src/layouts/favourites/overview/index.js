/**
 * FavouritesOverview - Main favourites dashboard page
 * Shows quick favourites and all favourite lists
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
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
import ListCard from "components/Favourites/ListCard";
import CreateListModal from "components/Favourites/CreateListModal";
import AddToListModal from "components/Favourites/AddToListModal";

// Context
import { useFavourites } from "context/FavouritesContext";

function FavouritesOverview() {
  const navigate = useNavigate();
  const {
    favouriteModelIds,
    favouriteLists,
    loading: contextLoading,
    toggleQuickFavourite,
    deleteFavouriteList,
    isModelFavourited,
  } = useFavourites();

  // State
  const [quickFavouriteModels, setQuickFavouriteModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [listToShare, setListToShare] = useState(null);

  // Fetch quick favourite models data
  useEffect(() => {
    const fetchQuickFavourites = async () => {
      if (!favouriteModelIds || favouriteModelIds.length === 0) {
        setQuickFavouriteModels([]);
        setLoadingModels(false);
        return;
      }

      try {
        // Firestore limits 'in' queries to 30 items
        const chunks = [];
        for (let i = 0; i < favouriteModelIds.length; i += 30) {
          chunks.push(favouriteModelIds.slice(i, i + 30));
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

        setQuickFavouriteModels(allModels);
      } catch (error) {
        console.error("Error fetching quick favourites:", error);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchQuickFavourites();
  }, [favouriteModelIds]);

  // Handlers
  const handleFavouriteToggle = useCallback(
    async (modelUid) => {
      await toggleQuickFavourite(modelUid);
    },
    [toggleQuickFavourite]
  );

  const handleAddToList = useCallback((model) => {
    setSelectedModel(model);
    setAddToListModalOpen(true);
  }, []);

  const handleShareList = useCallback((list) => {
    setListToShare(list);
    setShareModalOpen(true);
  }, []);

  const handleDeleteList = useCallback((list) => {
    setListToDelete(list);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteList = async () => {
    if (listToDelete) {
      await deleteFavouriteList(listToDelete.id);
      setDeleteConfirmOpen(false);
      setListToDelete(null);
    }
  };

  const handleCreateSuccess = (listId) => {
    setCreateModalOpen(false);
    navigate(`/favourites/${listId}`);
  };

  const isLoading = contextLoading || loadingModels;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        {/* Quick Favourites Section */}
        <Card sx={{ mb: 3 }}>
          <MDBox p={3}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <MDBox>
                <MDTypography variant="h5" fontWeight="medium">
                  Quick Favourites
                </MDTypography>
                <MDTypography variant="button" color="text">
                  {favouriteModelIds.length} favourited models
                </MDTypography>
              </MDBox>
            </MDBox>

            {isLoading ? (
              <MDBox display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </MDBox>
            ) : quickFavouriteModels.length === 0 ? (
              <MDBox textAlign="center" py={4}>
                <Icon sx={{ fontSize: 48, color: "grey.400" }}>favorite_border</Icon>
                <MDTypography variant="h6" color="text" mt={2}>
                  No favourites yet
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  Browse models and click the heart icon to add them to your favourites
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
            ) : (
              <Grid container spacing={2}>
                {quickFavouriteModels.slice(0, 8).map((model) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={model.uid}>
                    <ModelCard
                      model={model}
                      isFavourited={isModelFavourited(model.uid)}
                      onFavouriteToggle={handleFavouriteToggle}
                      onAddToList={handleAddToList}
                      showActions
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            {quickFavouriteModels.length > 8 && (
              <MDBox display="flex" justifyContent="center" mt={2}>
                <MDTypography variant="body2" color="text">
                  Showing 8 of {quickFavouriteModels.length} favourites
                </MDTypography>
              </MDBox>
            )}
          </MDBox>
        </Card>

        {/* My Lists Section */}
        <Card>
          <MDBox p={3}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <MDBox>
                <MDTypography variant="h5" fontWeight="medium">
                  My Lists
                </MDTypography>
                <MDTypography variant="button" color="text">
                  {favouriteLists.length} lists
                </MDTypography>
              </MDBox>

              <MDButton
                variant="gradient"
                color="info"
                startIcon={<Icon>add</Icon>}
                onClick={() => setCreateModalOpen(true)}
              >
                New List
              </MDButton>
            </MDBox>

            {contextLoading ? (
              <MDBox display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </MDBox>
            ) : favouriteLists.length === 0 ? (
              <MDBox textAlign="center" py={4}>
                <Icon sx={{ fontSize: 48, color: "grey.400" }}>folder_open</Icon>
                <MDTypography variant="h6" color="text" mt={2}>
                  No lists yet
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  Create lists to organize your favourite models
                </MDTypography>
              </MDBox>
            ) : (
              <Grid container spacing={2}>
                {favouriteLists.map((list) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={list.id}>
                    <ListCard
                      list={list}
                      onShare={handleShareList}
                      onDelete={handleDeleteList}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />

      {/* Create List Modal */}
      <CreateListModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreateSuccess}
      />

      {/* Add to List Modal */}
      <AddToListModal
        open={addToListModalOpen}
        onClose={() => {
          setAddToListModalOpen(false);
          setSelectedModel(null);
        }}
        model={selectedModel}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete List</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            Are you sure you want to delete "{listToDelete?.title}"? This action cannot be undone.
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </MDButton>
          <MDButton variant="gradient" color="error" onClick={confirmDeleteList}>
            Delete
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Share Modal - TODO: Implement ShareListModal */}
      {shareModalOpen && listToShare && (
        <Dialog open={shareModalOpen} onClose={() => setShareModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Share List</DialogTitle>
          <DialogContent>
            <MDTypography variant="body2" mb={2}>
              Share "{listToShare.title}" with others
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Full sharing modal coming soon. For now, copy the link:
            </MDTypography>
            <MDBox
              mt={1}
              p={2}
              borderRadius="lg"
              sx={{ backgroundColor: "grey.100" }}
            >
              <MDTypography variant="body2" fontFamily="monospace">
                {window.location.origin}/shared/{listToShare.shareToken}
              </MDTypography>
            </MDBox>
          </DialogContent>
          <DialogActions>
            <MDButton
              variant="gradient"
              color="info"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/shared/${listToShare.shareToken}`
                );
                setShareModalOpen(false);
              }}
            >
              Copy Link
            </MDButton>
          </DialogActions>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

export default FavouritesOverview;
