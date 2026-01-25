import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "config/firebase";

// MUI components
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MDButton from "components/MDButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ProfileAvatar from "components/Profile/ProfileAvatar";

// Favourites
import { useFavourites } from "context/FavouritesContext";
import { useAuth } from "context/AuthContext";
import AddToListModal from "components/Favourites/AddToListModal";

function PublicProfile() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { isModelFavourited, toggleQuickFavourite } = useFavourites();

  const [profile, setProfile] = useState(null);
  const [profileUid, setProfileUid] = useState(null);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [slug]);

  const fetchUser = async () => {
    const q = query(collection(db, "users"), where("publicSlug", "==", slug));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
      setProfile({ uid: docData.id, ...docData.data() });
      setProfileUid(docData.id);
    }
  };

  // Check if current user can favourite (is a client or above)
  const canFavourite = user && ["client", "account manager", "admin", "super admin"].includes(user.role);
  const isFavourited = profileUid && canFavourite ? isModelFavourited(profileUid) : false;

  const handleFavouriteToggle = async () => {
    if (profileUid && canFavourite) {
      await toggleQuickFavourite(profileUid);
    }
  };

  const handleAddToList = () => {
    setAddToListModalOpen(true);
  };

  if (!profile) return <MDBox p={4}>Loading profile...</MDBox>;

  return (
    <Container maxWidth="lg">
      <Card>
        <MDBox p={4}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={4}>
              <ProfileAvatar src={profile.profileAvatar} size={350} borderRadius="0" />
            </Grid>

            <Grid item xs={4}>
              <MDTypography variant="h1" fontWeight="light">
                {profile.firstName} {profile.lastName?.charAt(0)}.
              </MDTypography>

              <Grid item xs={12} mt={2}>
                {user && profile.role === "model" ? null : user ? (
                  <>
                    <MDTypography variant="h6" color="info">
                      Book this Model
                    </MDTypography>
                    <MDButton variant="gradient" color="info" size="medium">
                      Book Model
                    </MDButton>
                    {canFavourite && user.uid !== profileUid && (
                      <MDBox display="flex" gap={1} mt={2}>
                        <MDButton
                          variant={isFavourited ? "gradient" : "outlined"}
                          color={isFavourited ? "error" : "dark"}
                          size="medium"
                          onClick={handleFavouriteToggle}
                          startIcon={<Icon>{isFavourited ? "favorite" : "favorite_border"}</Icon>}
                        >
                          {isFavourited ? "Favourited" : "Favourite"}
                        </MDButton>
                        <MDButton
                          variant="outlined"
                          color="info"
                          size="medium"
                          onClick={handleAddToList}
                          startIcon={<Icon>playlist_add</Icon>}
                        >
                          Add to List
                        </MDButton>
                      </MDBox>
                    )}
                  </>
                ) : (
                  <MDButton
                    variant="outlined"
                    color="info"
                    size="medium"
                    href="/sign-in"
                  >
                    Log in to Book Model
                  </MDButton>
                )}
              </Grid>
            </Grid>

            <Grid item xs={4}>
              {[
                ["Height", profile.height, "cm"],
                ["Weight", profile.weight, "kg"],
                ["Waist", profile.waist, "cm"],
                ["Chest", profile.chest, "cm"],
                ["Inside Leg", profile.insideLeg, "cm"],
                ["Collar", profile.collar, "cm"],
                ["Shoe Size", profile.shoeSize],
                ["Eye Colour", profile.eyeColour],
                ["Hair Colour", profile.hairColour],
              ].map(([label, value, unit]) =>
                value ? (
                  <Grid item xs={12} mt={1} key={label}>
                    <MDTypography textTransform="uppercase" variant="body2">
                      <strong>{label}:</strong> {value} {unit || ""}
                    </MDTypography>
                  </Grid>
                ) : null
              )}

              {profile.gender !== "Man" &&
                [
                  ["Bust", profile.bust, "cm"],
                  ["Hips", profile.hips, "cm"],
                  ["Dress Size", profile.dressSize],
                  ["Cup Size", profile.cupSize],
                  ["Bra Size", profile.braSize],
                ].map(([label, value, unit]) =>
                  value ? (
                    <Grid item xs={12} mt={1} key={label}>
                      <MDTypography textTransform="uppercase" variant="body2">
                        <strong>{label}:</strong> {value} {unit || ""}
                      </MDTypography>
                    </Grid>
                  ) : null
                )}

              {profile.location && (
                <Grid item xs={12} mt={1}>
                  <MDTypography textTransform="uppercase" variant="body2">
                    <strong>Location:</strong> {profile.location}
                  </MDTypography>
                </Grid>
              )}
            </Grid>
          </Grid>
        </MDBox>
        <MDBox p={4}>
          {/* Portfolio Images */}
          {profile.portfolioImages?.length > 0 && (
            <>
              <MDTypography variant="h4" mb={2}>
                Portfolio
              </MDTypography>
              <Grid container spacing={2}>
                {profile.portfolioImages.map((url, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={`portfolio-${index}`}>
                    <MDBox
                      component="img"
                      src={url}
                      alt={`Portfolio ${index + 1}`}
                      width="100%"
                      height="300px"
                      borderRadius="lg"
                      sx={{
                        objectFit: "cover",
                        cursor: "pointer",
                        transition: "transform 0.2s",
                        "&:hover": {
                          transform: "scale(1.02)"
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {/* Digitals Images */}
          {profile.digitalImages?.length > 0 && (
            <>
              <MDTypography variant="h4" mt={4} mb={2}>
                Digitals
              </MDTypography>
              <Grid container spacing={2}>
                {profile.digitalImages.map((url, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={`digital-${index}`}>
                    <MDBox
                      component="img"
                      src={url}
                      alt={`Digital ${index + 1}`}
                      width="100%"
                      height="300px"
                      borderRadius="lg"
                      sx={{
                        objectFit: "cover",
                        cursor: "pointer",
                        transition: "transform 0.2s",
                        "&:hover": {
                          transform: "scale(1.02)"
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {/* Fallback for legacy 'portfolio' field */}
          {!profile.portfolioImages && !profile.digitalImages && profile.portfolio?.length > 0 && (
            <>
              <MDTypography variant="h4" mb={2}>
                Portfolio
              </MDTypography>
              <Grid container spacing={2}>
                {profile.portfolio.map((url, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={`legacy-${index}`}>
                    <MDBox
                      component="img"
                      src={url}
                      alt={`Portfolio ${index + 1}`}
                      width="100%"
                      height="300px"
                      borderRadius="lg"
                      sx={{ objectFit: "cover" }}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </MDBox>
      </Card>

      {/* Add to List Modal */}
      {canFavourite && profile && (
        <AddToListModal
          open={addToListModalOpen}
          onClose={() => setAddToListModalOpen(false)}
          model={profile}
        />
      )}
    </Container>
  );
}

export default PublicProfile;