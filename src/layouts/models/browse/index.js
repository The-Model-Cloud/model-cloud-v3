/**
 * BrowseModels - Enhanced models browsing page with card/list view toggle
 * Allows clients to browse models and add them to favourites
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Card from "@mui/material/Card";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Favourites components
import ModelCard from "components/Favourites/ModelCard";
import ModelListItem from "components/Favourites/ModelListItem";
import ViewToggle from "components/Favourites/ViewToggle";
import AddToListModal from "components/Favourites/AddToListModal";

// Delete model components
import DeleteModelDialog from "components/DeleteModelDialog";
import useDeleteModel from "hooks/useDeleteModel";

// Filter component
import ModelFilters from "./components/ModelFilters";

// Context
import { useFavourites } from "context/FavouritesContext";
import { useAuth } from "context/AuthContext";

// Initial filter state
const initialFilters = {
  gender: "",
  country: "",
  county: "",
  city: "",
  skills: [],
  languages: [],
  // Measurement filters
  heightMin: "",
  heightMax: "",
  waistMin: "",
  waistMax: "",
  hipsMin: "",
  hipsMax: "",
  braSize: "",
  dressSize: "",
};

function BrowseModels() {
  const { user } = useAuth();
  const { isModelFavourited, toggleQuickFavourite } = useFavourites();
  const { deleteModel, deleting, error: deleteError, clearError } = useDeleteModel();
  const [searchParams] = useSearchParams();

  // Initialize filters from URL params
  const getInitialFilters = () => {
    const urlCountry = searchParams.get("country") || "";
    const urlCounty = searchParams.get("county") || "";
    return {
      ...initialFilters,
      country: urlCountry,
      county: urlCounty,
    };
  };

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("card"); // "card" or "list"
  const [showFilters, setShowFilters] = useState(searchParams.has("country") || searchParams.has("county"));
  const [filters, setFilters] = useState(getInitialFilters);
  const [sortBy, setSortBy] = useState("firstName"); // "firstName", "lastName", "location"

  // Add to list modal state
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  // Delete model state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Admin check - must be defined before useMemo that depends on it
  const isAdmin = user && ["admin", "super admin"].includes(user.role);

  // Fetch all models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelsQuery = query(
          collection(db, "users"),
          where("role", "==", "model")
        );
        const snapshot = await getDocs(modelsQuery);

        const modelsList = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        setModels(modelsList);
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Filter models based on search query and filters
  const filteredModels = useMemo(() => {
    let result = [...models];

    // Filter out hidden models for non-admin users
    if (!isAdmin) {
      result = result.filter((model) => !model.hideFromSearch);
    }

    // Text search filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      result = result.filter((model) => {
        const fullName = `${model.firstName || ""} ${model.lastName || ""}`.toLowerCase();
        const location = (model.location || "").toLowerCase();
        return fullName.includes(queryLower) || location.includes(queryLower);
      });
    }

    // Gender filter
    if (filters.gender) {
      result = result.filter((model) => model.gender === filters.gender);
    }

    // Country filter
    if (filters.country) {
      result = result.filter((model) => model.country === filters.country);
    }

    // County/State filter
    if (filters.county) {
      result = result.filter((model) => {
        if (filters.country === "United Kingdom") {
          return model.county === filters.county;
        } else if (filters.country === "United States") {
          return model.state === filters.county;
        }
        return true;
      });
    }

    // City filter
    if (filters.city) {
      result = result.filter((model) => model.city === filters.city);
    }

    // Skills filter (match any selected skill)
    if (filters.skills && filters.skills.length > 0) {
      result = result.filter((model) => {
        const modelCategories = model.categories || [];
        return filters.skills.some((skill) => modelCategories.includes(skill));
      });
    }

    // Languages filter (match any selected language)
    if (filters.languages && filters.languages.length > 0) {
      result = result.filter((model) => {
        const modelLanguages = model.languages || [];
        return filters.languages.some((lang) => modelLanguages.includes(lang));
      });
    }

    // Height filter (min/max in cm)
    if (filters.heightMin) {
      const minHeight = parseInt(filters.heightMin, 10);
      result = result.filter((model) => {
        const height = parseInt(model.height, 10);
        return !isNaN(height) && height >= minHeight;
      });
    }
    if (filters.heightMax) {
      const maxHeight = parseInt(filters.heightMax, 10);
      result = result.filter((model) => {
        const height = parseInt(model.height, 10);
        return !isNaN(height) && height <= maxHeight;
      });
    }

    // Waist filter (min/max in inches)
    if (filters.waistMin) {
      const minWaist = parseInt(filters.waistMin, 10);
      result = result.filter((model) => {
        const waist = parseInt(model.waist, 10);
        return !isNaN(waist) && waist >= minWaist;
      });
    }
    if (filters.waistMax) {
      const maxWaist = parseInt(filters.waistMax, 10);
      result = result.filter((model) => {
        const waist = parseInt(model.waist, 10);
        return !isNaN(waist) && waist <= maxWaist;
      });
    }

    // Hips filter (min/max in inches) - only for Female/Transwoman
    if (filters.hipsMin) {
      const minHips = parseInt(filters.hipsMin, 10);
      result = result.filter((model) => {
        const hips = parseInt(model.hips, 10);
        return !isNaN(hips) && hips >= minHips;
      });
    }
    if (filters.hipsMax) {
      const maxHips = parseInt(filters.hipsMax, 10);
      result = result.filter((model) => {
        const hips = parseInt(model.hips, 10);
        return !isNaN(hips) && hips <= maxHips;
      });
    }

    // Bra Size filter
    if (filters.braSize) {
      result = result.filter((model) => model.braSize === filters.braSize);
    }

    // Dress Size filter
    if (filters.dressSize) {
      result = result.filter((model) => model.dressSize === filters.dressSize);
    }

    // Sort results
    result.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case "lastName":
          valueA = (a.lastName || "").toLowerCase();
          valueB = (b.lastName || "").toLowerCase();
          break;
        case "location":
          valueA = (a.city || a.location || "").toLowerCase();
          valueB = (b.city || b.location || "").toLowerCase();
          break;
        case "firstName":
        default:
          valueA = (a.firstName || "").toLowerCase();
          valueB = (b.firstName || "").toLowerCase();
          break;
      }

      return valueA.localeCompare(valueB);
    });

    return result;
  }, [models, searchQuery, filters, isAdmin, sortBy]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) =>
      Array.isArray(v) ? v.length > 0 : v !== ""
    ).length;
  }, [filters]);

  // Handle favourite toggle
  const handleFavouriteToggle = useCallback(
    async (modelUid) => {
      await toggleQuickFavourite(modelUid);
    },
    [toggleQuickFavourite]
  );

  // Handle add to list
  const handleAddToList = useCallback((model) => {
    setSelectedModel(model);
    setAddToListModalOpen(true);
  }, []);

  // Check if user is a client (can favourite models)
  const canFavourite = user && ["client", "account manager", "admin", "super admin"].includes(user.role);

  // Handle delete click
  const handleDeleteClick = useCallback((model) => {
    setModelToDelete(model);
    setDeleteDialogOpen(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!modelToDelete) return;

    const result = await deleteModel(modelToDelete.uid, modelToDelete);
    if (result.success) {
      // Remove the deleted model from the local state
      setModels((prev) => prev.filter((m) => m.uid !== modelToDelete.uid));
      setDeleteDialogOpen(false);
      setModelToDelete(null);
      setDeleteSuccess(true);
    }
  }, [modelToDelete, deleteModel]);

  // Handle delete dialog close
  const handleDeleteDialogClose = useCallback(() => {
    if (!deleting) {
      setDeleteDialogOpen(false);
      setModelToDelete(null);
      clearError();
    }
  }, [deleting, clearError]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          {/* Header */}
          <MDBox p={3}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <MDBox>
                <MDTypography variant="h5" fontWeight="medium">
                  Browse Models
                </MDTypography>
                <MDTypography variant="button" color="text">
                  {filteredModels.length} models available
                </MDTypography>
              </MDBox>

              <MDBox display="flex" alignItems="center" gap={2}>
                {/* Search */}
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

                {/* Sort By */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    displayEmpty
                    startAdornment={
                      <InputAdornment position="start">
                        <Icon fontSize="small">sort</Icon>
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="firstName">First Name</MenuItem>
                    <MenuItem value="lastName">Last Name</MenuItem>
                    <MenuItem value="location">Location</MenuItem>
                  </Select>
                </FormControl>

                {/* Filter Toggle Button */}
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={activeFilterCount > 0 ? "info" : "default"}
                  sx={{
                    border: activeFilterCount > 0 ? "2px solid" : "1px solid",
                    borderColor: activeFilterCount > 0 ? "info.main" : "grey.300",
                    borderRadius: 1,
                    position: "relative",
                  }}
                >
                  <Icon>{showFilters ? "filter_list_off" : "filter_list"}</Icon>
                  {activeFilterCount > 0 && (
                    <MDBox
                      component="span"
                      sx={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        backgroundColor: "info.main",
                        color: "white",
                        borderRadius: "50%",
                        width: 18,
                        height: 18,
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {activeFilterCount}
                    </MDBox>
                  )}
                </IconButton>

                {/* View Toggle */}
                <ViewToggle view={viewMode} onChange={setViewMode} />
              </MDBox>
            </MDBox>

            {/* Filters Section */}
            <Collapse in={showFilters}>
              <Divider sx={{ my: 2 }} />
              <ModelFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={handleClearFilters}
              />
            </Collapse>
          </MDBox>

          {/* Content */}
          <MDBox p={3} pt={0}>
            {loading ? (
              <MDBox display="flex" justifyContent="center" py={6}>
                <CircularProgress />
              </MDBox>
            ) : filteredModels.length === 0 ? (
              <MDBox textAlign="center" py={6}>
                <Icon sx={{ fontSize: 48, color: "grey.400" }}>person_search</Icon>
                <MDTypography variant="h6" color="text" mt={2}>
                  No models found
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  {searchQuery || activeFilterCount > 0
                    ? "Try adjusting your search or filters"
                    : "No models available"}
                </MDTypography>
              </MDBox>
            ) : viewMode === "card" ? (
              // Card Grid View
              <Grid container spacing={3}>
                {filteredModels.map((model) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={model.uid}>
                    <ModelCard
                      model={model}
                      isFavourited={canFavourite && isModelFavourited(model.uid)}
                      onFavouriteToggle={canFavourite ? handleFavouriteToggle : null}
                      onAddToList={canFavourite ? handleAddToList : null}
                      showActions={canFavourite}
                      showDeleteButton={isAdmin}
                      onDelete={isAdmin ? handleDeleteClick : null}
                      isHidden={isAdmin && model.hideFromSearch}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              // List View
              <MDBox display="flex" flexDirection="column" gap={1}>
                {filteredModels.map((model) => (
                  <ModelListItem
                    key={model.uid}
                    model={model}
                    isFavourited={canFavourite && isModelFavourited(model.uid)}
                    onFavouriteToggle={canFavourite ? handleFavouriteToggle : null}
                    onAddToList={canFavourite ? handleAddToList : null}
                    showActions={canFavourite}
                    showDeleteButton={isAdmin}
                    onDelete={isAdmin ? handleDeleteClick : null}
                    isHidden={isAdmin && model.hideFromSearch}
                  />
                ))}
              </MDBox>
            )}
          </MDBox>
        </Card>
      </MDBox>
      <Footer />

      {/* Add to List Modal */}
      {canFavourite && (
        <AddToListModal
          open={addToListModalOpen}
          onClose={() => {
            setAddToListModalOpen(false);
            setSelectedModel(null);
          }}
          model={selectedModel}
        />
      )}

      {/* Delete Model Dialog */}
      {isAdmin && (
        <DeleteModelDialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onConfirm={handleDeleteConfirm}
          model={modelToDelete}
          loading={deleting}
          error={deleteError}
        />
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={deleteSuccess}
        autoHideDuration={4000}
        onClose={() => setDeleteSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setDeleteSuccess(false)} severity="success" sx={{ width: "100%" }}>
          Model deleted successfully
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default BrowseModels;
