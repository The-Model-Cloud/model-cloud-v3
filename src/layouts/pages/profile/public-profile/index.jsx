import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "config/firebase";
import ImgsViewer from "react-images-viewer";
import logoWatermark from "assets/images/logo-rectangle-white.svg";

// MUI components
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isModelFavourited, toggleQuickFavourite } = useFavourites();

  const [profile, setProfile] = useState(null);
  const [profileUid, setProfileUid] = useState(null);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  // Check if current user can toggle visibility (admin, super admin, or profile owner)
  const isAdmin = user && ["admin", "super admin"].includes(user.role);
  const isProfileOwner = user && profileUid && user.uid === profileUid;
  const canToggleVisibility = isAdmin || isProfileOwner;

  // Handle visibility toggle
  const handleVisibilityToggle = async () => {
    if (!canToggleVisibility || !profileUid) return;
    const newValue = !profile.hideFromSearch;
    setProfile((prev) => ({ ...prev, hideFromSearch: newValue }));
    const userRef = doc(db, "users", profileUid);
    await updateDoc(userRef, { hideFromSearch: newValue });
  };

  const handleFavouriteToggle = async () => {
    if (profileUid && canFavourite) {
      await toggleQuickFavourite(profileUid);
    }
  };

  const handleAddToList = () => {
    setAddToListModalOpen(true);
  };

  // Combine all images for the lightbox carousel
  const allImages = useMemo(() => {
    const images = [];
    if (profile?.portfolioImages?.length > 0) {
      images.push(...profile.portfolioImages);
    }
    if (profile?.digitalImages?.length > 0) {
      images.push(...profile.digitalImages);
    }
    // Fallback for legacy portfolio field
    if (!profile?.portfolioImages && !profile?.digitalImages && profile?.portfolio?.length > 0) {
      images.push(...profile.portfolio);
    }
    return images;
  }, [profile]);

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  if (!profile) return <MDBox p={4}>Loading profile...</MDBox>;

  return (
    <Container maxWidth="lg">
      <Card>
        {/* Admin Controls - Edit Model & Visibility Toggle */}
        {(isAdmin || canToggleVisibility) && (
          <MDBox
            px={3}
            py={1.5}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              backgroundColor: profile.hideFromSearch ? "warning.main" : "transparent",
              borderBottom: profile.hideFromSearch ? "none" : "1px solid",
              borderColor: "grey.200",
            }}
          >
            {/* Edit Model Button - Admin/Super Admin Only */}
            {isAdmin && profileUid && (
              <MDButton
                variant="gradient"
                color="info"
                size="small"
                onClick={() => navigate(`/admin/model/${profileUid}/settings`)}
                startIcon={<Icon>edit</Icon>}
              >
                Edit Model
              </MDButton>
            )}
            {!isAdmin && <MDBox />}

            {/* Visibility Toggle */}
            {canToggleVisibility && (
              <Tooltip title={profile.hideFromSearch ? "Profile is hidden from search and Browse Models" : "Profile is visible in search and Browse Models"}>
                <MDBox display="flex" alignItems="center" gap={1}>
                  <Icon sx={{ color: profile.hideFromSearch ? "white" : "text.secondary" }}>
                    {profile.hideFromSearch ? "visibility_off" : "visibility"}
                  </Icon>
                  <MDTypography variant="button" fontWeight="medium" color={profile.hideFromSearch ? "white" : "text"}>
                    {profile.hideFromSearch ? "Hidden from Search" : "Visible in Search"}
                  </MDTypography>
                  <Switch
                    checked={!profile.hideFromSearch}
                    onChange={handleVisibilityToggle}
                    color="default"
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "success.main",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "success.main",
                      },
                    }}
                  />
                </MDBox>
              </Tooltip>
            )}
          </MDBox>
        )}

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
                {user && user.uid === profileUid ? null : user ? (
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
                  ["Hips", profile.hips, "cm"],
                  ["Dress Size", profile.dressSize],
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

              {/* Instagram Follower Count - Admin Only */}
              {isAdmin && profile.instagram && profile.instagramFollowerCount && (
                <Grid item xs={12} mt={2}>
                  <MDBox
                    display="flex"
                    alignItems="center"
                    gap={1}
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <Icon sx={{ color: "#E1306C" }}>photo_camera</Icon>
                    <MDTypography variant="body2">
                      <strong>Instagram:</strong>{" "}
                      {profile.instagramFollowerCount >= 1000000
                        ? `${(profile.instagramFollowerCount / 1000000).toFixed(1)}M`
                        : profile.instagramFollowerCount >= 1000
                        ? `${(profile.instagramFollowerCount / 1000).toFixed(1)}K`
                        : profile.instagramFollowerCount.toLocaleString()}{" "}
                      followers
                    </MDTypography>
                  </MDBox>
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
                      onClick={() => openLightbox(index)}
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
                {profile.digitalImages.map((url, index) => {
                  // Offset by portfolio images count for correct lightbox index
                  const lightboxIdx = (profile.portfolioImages?.length || 0) + index;
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={`digital-${index}`}>
                      <MDBox
                        component="img"
                        src={url}
                        alt={`Digital ${index + 1}`}
                        width="100%"
                        height="300px"
                        borderRadius="lg"
                        onClick={() => openLightbox(lightboxIdx)}
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
                  );
                })}
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
                      onClick={() => openLightbox(index)}
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
        </MDBox>
      </Card>

      {/* Lightbox for image carousel */}
      {allImages.length > 0 && (
        <>
          <ImgsViewer
            imgs={allImages.map((url) => ({ src: url }))}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
            currImg={lightboxIndex}
            onClickPrev={() => setLightboxIndex((i) => Math.max(i - 1, 0))}
            onClickNext={() => setLightboxIndex((i) => Math.min(i + 1, allImages.length - 1))}
            backdropCloseable
          />
          {/* Watermark overlay */}
          {lightboxOpen && (
            <MDBox
              component="img"
              src={logoWatermark}
              alt="Model Cloud"
              sx={{
                position: "fixed",
                bottom: 24,
                right: 24,
                width: 80,
                height: "auto",
                opacity: 0.6,
                zIndex: 10001,
                pointerEvents: "none",
              }}
            />
          )}
        </>
      )}

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