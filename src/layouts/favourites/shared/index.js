/**
 * SharedListView - Public/authenticated view of a shared favourite list
 * Accessible via /shared/:shareToken
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "config/firebase";

// MUI components
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Components
import ModelCard from "components/Favourites/ModelCard";
import ViewToggle from "components/Favourites/ViewToggle";
import ModelListItem from "components/Favourites/ModelListItem";

// Context and utilities
import { useAuth } from "context/AuthContext";
import { getFavouriteListByShareToken } from "utils/favourites";

function SharedListView() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // State
  const [list, setList] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("card");

  // Fetch list by share token
  useEffect(() => {
    const fetchSharedList = async () => {
      try {
        const listData = await getFavouriteListByShareToken(shareToken);

        if (!listData) {
          setError("List not found");
          setLoading(false);
          return;
        }

        // Check visibility permissions
        if (listData.visibility === "private") {
          // Only owner can view private lists
          if (!user || user.uid !== listData.ownerId) {
            setError("This list is private");
            setLoading(false);
            return;
          }
        } else if (listData.visibility === "authenticated") {
          // Must be logged in
          if (!user) {
            setError("login_required");
            setLoading(false);
            return;
          }
        }
        // Public lists are accessible to everyone

        setList(listData);

        // Fetch model data
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
        }
      } catch (err) {
        console.error("Error fetching shared list:", err);
        setError("Failed to load list");
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth to finish loading before checking permissions
    if (!authLoading) {
      fetchSharedList();
    }
  }, [shareToken, user, authLoading]);

  // Loading state
  if (loading || authLoading) {
    return (
      <Container maxWidth="lg">
        <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </MDBox>
      </Container>
    );
  }

  // Error states
  if (error === "login_required") {
    return (
      <Container maxWidth="sm">
        <MDBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="80vh"
        >
          <Card sx={{ p: 4, textAlign: "center" }}>
            <Icon sx={{ fontSize: 64, color: "info.main", mb: 2 }}>lock</Icon>
            <MDTypography variant="h4" fontWeight="medium" mb={1}>
              Sign in Required
            </MDTypography>
            <MDTypography variant="body2" color="text" mb={3}>
              You need to sign in to view this shared list
            </MDTypography>
            <MDButton
              variant="gradient"
              color="info"
              component={Link}
              to={`/sign-in?redirect=/shared/${shareToken}`}
            >
              Sign In
            </MDButton>
          </Card>
        </MDBox>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <MDBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="80vh"
        >
          <Card sx={{ p: 4, textAlign: "center" }}>
            <Icon sx={{ fontSize: 64, color: "error.main", mb: 2 }}>error_outline</Icon>
            <MDTypography variant="h4" fontWeight="medium" mb={1}>
              {error === "This list is private" ? "Private List" : "List Not Found"}
            </MDTypography>
            <MDTypography variant="body2" color="text" mb={3}>
              {error === "This list is private"
                ? "This list is private and cannot be viewed."
                : "The list you're looking for doesn't exist or has been removed."}
            </MDTypography>
            <MDButton variant="gradient" color="info" component={Link} to="/">
              Go Home
            </MDButton>
          </Card>
        </MDBox>
      </Container>
    );
  }

  if (!list) {
    return null;
  }

  return (
    <Container maxWidth="lg">
      <MDBox py={4}>
        {/* Header */}
        <Card sx={{ mb: 3 }}>
          <MDBox p={3}>
            <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <MDBox>
                <MDTypography variant="h4" fontWeight="medium">
                  {list.title}
                </MDTypography>
                {list.description && (
                  <MDTypography variant="body2" color="text" mt={1}>
                    {list.description}
                  </MDTypography>
                )}
                <MDTypography variant="caption" color="text" display="block" mt={1}>
                  Shared by {list.ownerName} | {list.modelCount || 0} models
                </MDTypography>
              </MDBox>

              {user && (
                <MDButton
                  variant="gradient"
                  color="info"
                  component={Link}
                  to="/sign-up"
                >
                  Join The Model Cloud
                </MDButton>
              )}
            </MDBox>

            {!user && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <MDTypography variant="body2">
                  Sign up to create your own favourite lists and access more features!
                </MDTypography>
              </Alert>
            )}
          </MDBox>
        </Card>

        {/* Toolbar */}
        <MDBox display="flex" justifyContent="flex-end" mb={2}>
          <ViewToggle view={viewMode} onChange={setViewMode} />
        </MDBox>

        {/* Models Grid */}
        {models.length === 0 ? (
          <Card>
            <MDBox textAlign="center" py={6}>
              <Icon sx={{ fontSize: 48, color: "grey.400" }}>folder_open</Icon>
              <MDTypography variant="h6" color="text" mt={2}>
                This list is empty
              </MDTypography>
            </MDBox>
          </Card>
        ) : viewMode === "card" ? (
          <Grid container spacing={3}>
            {models.map((model) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={model.uid}>
                <ModelCard
                  model={model}
                  showActions={false}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card>
            <MDBox p={2} display="flex" flexDirection="column" gap={1}>
              {models.map((model) => (
                <ModelListItem
                  key={model.uid}
                  model={model}
                  showActions={false}
                />
              ))}
            </MDBox>
          </Card>
        )}

        {/* Footer CTA */}
        {!user && (
          <MDBox textAlign="center" mt={4}>
            <Card sx={{ p: 3 }}>
              <MDTypography variant="h5" fontWeight="medium" mb={1}>
                Join The Model Cloud
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={2}>
                Create your own account to browse models, create favourite lists, and more!
              </MDTypography>
              <MDBox display="flex" gap={2} justifyContent="center">
                <MDButton variant="outlined" color="info" component={Link} to="/sign-in">
                  Sign In
                </MDButton>
                <MDButton variant="gradient" color="info" component={Link} to="/sign-up">
                  Sign Up
                </MDButton>
              </MDBox>
            </Card>
          </MDBox>
        )}
      </MDBox>
    </Container>
  );
}

export default SharedListView;
