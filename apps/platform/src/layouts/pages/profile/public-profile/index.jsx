import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "config/firebase";
import ImgsViewer from "react-images-viewer";
import logoWatermark from "assets/images/logo-rectangle-white.svg";

// MUI components
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Fade from "@mui/material/Fade";
import MDButton from "components/MDButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Favourites
import { useFavourites } from "context/FavouritesContext";
import { useAuth } from "context/AuthContext";
import { useMaterialUIController } from "context";
import AddToListModal from "components/Favourites/AddToListModal";
import BookModelModal from "components/BookModelModal";

// API functions
import { sendVerificationEmail, sendUnverificationEmail } from "utils/api";

// Transform Cloudinary URL to use face detection for thumbnails
const getCloudinaryThumbnail = (url, width = 400, height = 450) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_fill,g_face,w_${width},h_${height},q_auto,f_auto/${parts[1]}`;
};

// Stat item component for clean display
function StatItem({ label, value, unit }) {
  if (!value) return null;
  return (
    <MDBox textAlign="center" px={2} py={1.5}>
      <MDTypography
        variant="h4"
        fontWeight="medium"
        sx={{ letterSpacing: "0.5px" }}
      >
        {value}{unit && <MDTypography component="span" variant="body2" fontWeight="light" ml={0.5}>{unit}</MDTypography>}
      </MDTypography>
      <MDTypography
        variant="caption"
        color="text"
        textTransform="uppercase"
        sx={{ letterSpacing: "2px", fontSize: "0.65rem" }}
      >
        {label}
      </MDTypography>
    </MDBox>
  );
}

function PublicProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isModelFavourited, toggleQuickFavourite } = useFavourites();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  // Use dark mode only when logged in, otherwise default to light
  const effectiveDarkMode = user ? darkMode : false;

  const [profile, setProfile] = useState(null);
  const [profileUid, setProfileUid] = useState(null);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);
  const [bookModelModalOpen, setBookModelModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

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
      setTimeout(() => setLoaded(true), 100);
    }
  };

  // Check if current user can favourite (is a client or above)
  const canFavourite = user && ["client", "account manager", "admin", "super admin"].includes(user.role);
  const isFavourited = profileUid && canFavourite ? isModelFavourited(profileUid) : false;

  // Check if current user can book models (clients, account managers, admins - not models)
  const canBookModels = user && ["client", "account manager", "admin", "super admin"].includes(user.role);

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

  // Handle verification toggle (admin only)
  const handleVerificationToggle = async () => {
    if (!isAdmin || !profileUid || profile.role !== "model") return;
    const newValue = !profile.verified;
    setProfile((prev) => ({ ...prev, verified: newValue }));
    const userRef = doc(db, "users", profileUid);
    await updateDoc(userRef, { verified: newValue });

    // Send appropriate email
    const modelName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Model";
    if (profile.email) {
      if (newValue) {
        sendVerificationEmail(profile.email, modelName).catch((err) =>
          console.warn("Failed to send verification email:", err)
        );
      } else {
        sendUnverificationEmail(profile.email, modelName).catch((err) =>
          console.warn("Failed to send unverification email:", err)
        );
      }
    }
  };

  const handleFavouriteToggle = async () => {
    if (profileUid && canFavourite) {
      await toggleQuickFavourite(profileUid);
    }
  };

  const handleAddToList = () => {
    setAddToListModalOpen(true);
  };

  const handleBookModel = () => {
    if (canBookModels) {
      setBookModelModalOpen(true);
    }
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

  // Get the hero image (profile avatar is the main image) with face-focused cropping
  const heroImage = getCloudinaryThumbnail(profile?.profileAvatar, 1200, 1200);

  if (!profile) {
    return (
      <MDBox
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{ backgroundColor: effectiveDarkMode ? "#1a2035" : "#fafafa" }}
      >
        <MDTypography variant="h5" fontWeight="light" sx={{ letterSpacing: "3px" }}>
          LOADING...
        </MDTypography>
      </MDBox>
    );
  }

  return (
    <MDBox sx={{ backgroundColor: effectiveDarkMode ? "#1a2035" : "#fff", minHeight: "100vh" }}>
      {/* Admin Controls Bar */}
      {(isAdmin || canToggleVisibility) && (
        <MDBox
          px={3}
          py={1.5}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            backgroundColor: profile.hideFromSearch ? "warning.main" : "#f5f5f5",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          {isAdmin && profileUid && (
            <MDButton
              variant="gradient"
              color="dark"
              size="small"
              onClick={() => navigate(`/admin/model/${profileUid}/settings`)}
              startIcon={<Icon>edit</Icon>}
            >
              Edit Model
            </MDButton>
          )}
          {!isAdmin && <MDBox />}

          <MDBox display="flex" alignItems="center" gap={3}>
            {/* Verification Toggle - Admin Only for Models */}
            {isAdmin && profile.role === "model" && (
              <Tooltip title={profile.verified ? "Account is verified" : "Account is unverified - click to verify"}>
                <MDBox display="flex" alignItems="center" gap={1}>
                  <Icon sx={{ color: profile.verified ? "success.main" : "warning.main" }}>
                    {profile.verified ? "verified_user" : "gpp_maybe"}
                  </Icon>
                  <MDTypography variant="button" fontWeight="medium" color={profile.verified ? "success" : "warning"}>
                    {profile.verified ? "Verified" : "Unverified"}
                  </MDTypography>
                  <Switch
                    checked={profile.verified === true}
                    onChange={handleVerificationToggle}
                    color="success"
                  />
                </MDBox>
              </Tooltip>
            )}

            {/* Visibility Toggle */}
            {canToggleVisibility && (
              <Tooltip title={profile.hideFromSearch ? "Profile is hidden from search" : "Profile is visible in search"}>
                <MDBox display="flex" alignItems="center" gap={1}>
                  <Icon sx={{ color: profile.hideFromSearch ? "white" : "text.secondary" }}>
                    {profile.hideFromSearch ? "visibility_off" : "visibility"}
                  </Icon>
                  <MDTypography variant="button" fontWeight="medium" color={profile.hideFromSearch ? "white" : "text"}>
                    {profile.hideFromSearch ? "Hidden" : "Visible"}
                  </MDTypography>
                  <Switch
                    checked={!profile.hideFromSearch}
                    onChange={handleVisibilityToggle}
                    color="default"
                  />
                </MDBox>
              </Tooltip>
            )}
          </MDBox>
        </MDBox>
      )}

      {/* Hero Section */}
      <Fade in={loaded} timeout={800}>
        <MDBox>
          <Grid container>
            {/* Hero Image - Left Side */}
            <Grid item xs={12} lg={7}>
              <MDBox
                sx={{
                  height: { xs: "60vh", md: "85vh" },
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  component="img"
                  src={heroImage}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center",
                  }}
                />
              </MDBox>
            </Grid>

            {/* Model Info - Right Side */}
            <Grid item xs={12} lg={5}>
              <MDBox
                display="flex"
                flexDirection="column"
                justifyContent="center"
                height="100%"
                px={{ xs: 4, md: 6, lg: 8 }}
                py={{ xs: 6, lg: 0 }}
                sx={{ minHeight: { lg: "85vh" } }}
              >
                {/* Model Name */}
                <MDBox mb={4}>
                  <MDTypography
                    variant="h1"
                    fontWeight="light"
                    sx={{
                      fontSize: { xs: "2.5rem", md: "3.5rem", lg: "4rem" },
                      letterSpacing: "4px",
                      lineHeight: 1.1,
                      textTransform: "uppercase",
                    }}
                  >
                    {profile.firstName} {profile.lastName?.charAt(0)}.
                  </MDTypography>
                </MDBox>

                {/* Location */}
                {profile.location && (
                  <MDBox mb={4} display="flex" alignItems="center" gap={1}>
                    <Icon sx={{ fontSize: "1rem", color: "text.secondary" }}>location_on</Icon>
                    <MDTypography
                      variant="body2"
                      color="text"
                      sx={{ letterSpacing: "2px", textTransform: "uppercase" }}
                    >
                      {profile.location}
                    </MDTypography>
                  </MDBox>
                )}

                {/* Key Stats - Horizontal Layout */}
                <MDBox mb={4}>
                  <Grid container spacing={0}>
                    {profile.height && (
                      <Grid item xs={4}>
                        <StatItem label="Height" value={profile.height} unit="cm" />
                      </Grid>
                    )}
                    {profile.chest && (
                      <Grid item xs={4}>
                        <StatItem label="Chest" value={profile.chest} unit="cm" />
                      </Grid>
                    )}
                    {profile.waist && (
                      <Grid item xs={4}>
                        <StatItem label="Waist" value={profile.waist} unit="cm" />
                      </Grid>
                    )}
                  </Grid>
                  <Grid container spacing={0} mt={1}>
                    {profile.hips && profile.gender !== "Man" && (
                      <Grid item xs={4}>
                        <StatItem label="Hips" value={profile.hips} unit="cm" />
                      </Grid>
                    )}
                    {profile.shoeSize && (
                      <Grid item xs={4}>
                        <StatItem label="Shoe" value={profile.shoeSize} />
                      </Grid>
                    )}
                    {profile.eyeColour && (
                      <Grid item xs={4}>
                        <StatItem label="Eyes" value={profile.eyeColour} />
                      </Grid>
                    )}
                  </Grid>
                </MDBox>

                <Divider sx={{ mb: 4 }} />

                {/* Action Buttons */}
                <MDBox>
                  {user && user.uid === profileUid ? null : user ? (
                    <>
                      {canBookModels && (
                        <MDButton
                          variant="contained"
                          color="dark"
                          size="large"
                          fullWidth
                          onClick={handleBookModel}
                          sx={{
                            py: 1.5,
                            letterSpacing: "2px",
                            fontWeight: 500,
                            mb: 2,
                          }}
                        >
                          Book Model
                        </MDButton>
                      )}
                      {canFavourite && user.uid !== profileUid && (
                        <MDBox display="flex" gap={1}>
                          <MDButton
                            variant={isFavourited ? "contained" : "outlined"}
                            color={isFavourited ? "error" : "dark"}
                            fullWidth
                            onClick={handleFavouriteToggle}
                            startIcon={<Icon>{isFavourited ? "favorite" : "favorite_border"}</Icon>}
                            sx={{ letterSpacing: "1px" }}
                          >
                            {isFavourited ? "Added to Favourites" : "Favourite"}
                          </MDButton>
                          <MDButton
                            variant="outlined"
                            color="dark"
                            fullWidth
                            onClick={handleAddToList}
                            startIcon={<Icon>playlist_add</Icon>}
                            sx={{ letterSpacing: "1px" }}
                          >
                            Add to List
                          </MDButton>
                        </MDBox>
                      )}
                    </>
                  ) : (
                    <MDButton
                      variant="outlined"
                      color="dark"
                      size="large"
                      fullWidth
                      href="/sign-in"
                      sx={{ py: 1.5, letterSpacing: "2px" }}
                    >
                      Sign In to Book
                    </MDButton>
                  )}
                </MDBox>

                {/* Z-Card Download - Admin, Super Admin, Client */}
                {profile.zCard && user && ["admin", "super admin", "client"].includes(user.role) && (
                  <MDBox mt={3}>
                    <MDButton
                      variant="outlined"
                      color="dark"
                      fullWidth
                      href={profile.zCard}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      startIcon={<Icon>download</Icon>}
                      sx={{ letterSpacing: "1px" }}
                    >
                      Download Z-Card
                    </MDButton>
                  </MDBox>
                )}

                {/* Instagram - Admin Only */}
                {isAdmin && profile.instagram && profile.instagramFollowerCount && (
                  <MDBox mt={4} display="flex" alignItems="center" gap={1.5}>
                    <Icon sx={{ color: "#E1306C" }}>photo_camera</Icon>
                    <MDTypography variant="body2" color="text">
                      {profile.instagramFollowerCount >= 1000000
                        ? `${(profile.instagramFollowerCount / 1000000).toFixed(1)}M`
                        : profile.instagramFollowerCount >= 1000
                        ? `${(profile.instagramFollowerCount / 1000).toFixed(1)}K`
                        : profile.instagramFollowerCount.toLocaleString()}{" "}
                      followers
                    </MDTypography>
                  </MDBox>
                )}
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>
      </Fade>

      {/* Full Measurements Section */}
      <MDBox py={6} sx={{ backgroundColor: effectiveDarkMode ? "#111827" : "#fafafa" }}>
        <Container maxWidth="lg">
          <MDTypography
            variant="overline"
            sx={{
              letterSpacing: "4px",
              display: "block",
              textAlign: "center",
              mb: 4,
              color: "text.secondary",
            }}
          >
            Measurements
          </MDTypography>
          <Grid container justifyContent="center" spacing={2}>
            {[
              ["Height", profile.height, "cm"],
              ["Weight", profile.weight, "kg"],
              ["Chest", profile.chest, "cm"],
              ["Waist", profile.waist, "cm"],
              ["Inside Leg", profile.insideLeg, "cm"],
              ["Collar", profile.collar, "cm"],
              ["Shoe Size", profile.shoeSize],
              ["Eye Colour", profile.eyeColour],
              ["Hair Colour", profile.hairColour],
            ]
              .concat(
                profile.gender !== "Man"
                  ? [
                      ["Hips", profile.hips, "cm"],
                      ["Dress Size", profile.dressSize],
                      ["Bra Size", profile.braSize],
                    ]
                  : []
              )
              .filter(([, value]) => value)
              .map(([label, value, unit]) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={label}>
                  <MDBox
                    textAlign="center"
                    py={2}
                    px={1}
                    sx={{
                      backgroundColor: effectiveDarkMode ? "#1a2035" : "#fff",
                      borderRadius: 2,
                    }}
                  >
                    <MDTypography variant="h5" fontWeight="medium">
                      {value}{unit && <MDTypography component="span" variant="caption" ml={0.5}>{unit}</MDTypography>}
                    </MDTypography>
                    <MDTypography
                      variant="caption"
                      color="text"
                      sx={{ letterSpacing: "1.5px", textTransform: "uppercase", fontSize: "0.6rem" }}
                    >
                      {label}
                    </MDTypography>
                  </MDBox>
                </Grid>
              ))}
          </Grid>
        </Container>
      </MDBox>

      {/* Portfolio Gallery */}
      {profile.portfolioImages?.length > 0 && (
        <MDBox py={8}>
          <Container maxWidth="xl">
            <MDTypography
              variant="overline"
              sx={{
                letterSpacing: "4px",
                display: "block",
                textAlign: "center",
                mb: 6,
                color: "text.secondary",
              }}
            >
              Portfolio
            </MDTypography>
            <Grid container spacing={2}>
              {profile.portfolioImages.map((url, index) => {
                // Create varied grid sizes for editorial look
                const sizes = [
                  { xs: 12, sm: 6, md: 4 },
                  { xs: 12, sm: 6, md: 4 },
                  { xs: 12, sm: 6, md: 4 },
                  { xs: 12, sm: 6, md: 6 },
                  { xs: 12, sm: 6, md: 6 },
                  { xs: 12, sm: 6, md: 4 },
                ];
                const sizeIndex = index % sizes.length;
                const gridSize = sizes[sizeIndex];
                const heights = ["450px", "400px", "420px", "500px", "480px", "380px"];
                const height = heights[sizeIndex];

                return (
                  <Grid item {...gridSize} key={`portfolio-${index}`}>
                    <Fade in={loaded} timeout={600 + index * 100}>
                      <MDBox
                        onClick={() => openLightbox(index)}
                        sx={{
                          position: "relative",
                          overflow: "hidden",
                          cursor: "pointer",
                          height: { xs: "350px", md: height },
                          "&:hover img": {
                            transform: "scale(1.03)",
                          },
                          "&:hover .overlay": {
                            opacity: 1,
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={getCloudinaryThumbnail(url, 600, parseInt(height))}
                          alt={`Portfolio ${index + 1}`}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.6s ease",
                          }}
                        />
                        <MDBox
                          className="overlay"
                          sx={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: "rgba(0,0,0,0.2)",
                            opacity: 0,
                            transition: "opacity 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon sx={{ color: "#fff", fontSize: "2rem" }}>zoom_in</Icon>
                        </MDBox>
                      </MDBox>
                    </Fade>
                  </Grid>
                );
              })}
            </Grid>
          </Container>
        </MDBox>
      )}

      {/* Digitals Gallery */}
      {profile.digitalImages?.length > 0 && (
        <MDBox py={8} sx={{ backgroundColor: effectiveDarkMode ? "#111827" : "#fafafa" }}>
          <Container maxWidth="xl">
            <MDTypography
              variant="overline"
              sx={{
                letterSpacing: "4px",
                display: "block",
                textAlign: "center",
                mb: 6,
                color: "text.secondary",
              }}
            >
              Digitals
            </MDTypography>
            <Grid container spacing={2} justifyContent="center">
              {profile.digitalImages.map((url, index) => {
                const lightboxIdx = (profile.portfolioImages?.length || 0) + index;
                return (
                  <Grid item xs={6} sm={4} md={3} key={`digital-${index}`}>
                    <Fade in={loaded} timeout={600 + index * 100}>
                      <MDBox
                        onClick={() => openLightbox(lightboxIdx)}
                        sx={{
                          position: "relative",
                          overflow: "hidden",
                          cursor: "pointer",
                          height: { xs: "280px", md: "380px" },
                          "&:hover img": {
                            transform: "scale(1.03)",
                          },
                          "&:hover .overlay": {
                            opacity: 1,
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={getCloudinaryThumbnail(url, 400, 380)}
                          alt={`Digital ${index + 1}`}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.6s ease",
                          }}
                        />
                        <MDBox
                          className="overlay"
                          sx={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: "rgba(0,0,0,0.2)",
                            opacity: 0,
                            transition: "opacity 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon sx={{ color: "#fff", fontSize: "2rem" }}>zoom_in</Icon>
                        </MDBox>
                      </MDBox>
                    </Fade>
                  </Grid>
                );
              })}
            </Grid>
          </Container>
        </MDBox>
      )}

      {/* Fallback for legacy 'portfolio' field */}
      {!profile.portfolioImages && !profile.digitalImages && profile.portfolio?.length > 0 && (
        <MDBox py={8}>
          <Container maxWidth="xl">
            <MDTypography
              variant="overline"
              sx={{
                letterSpacing: "4px",
                display: "block",
                textAlign: "center",
                mb: 6,
                color: "text.secondary",
              }}
            >
              Portfolio
            </MDTypography>
            <Grid container spacing={2}>
              {profile.portfolio.map((url, index) => (
                <Grid item xs={12} sm={6} md={4} key={`legacy-${index}`}>
                  <Fade in={loaded} timeout={600 + index * 100}>
                    <MDBox
                      onClick={() => openLightbox(index)}
                      sx={{
                        position: "relative",
                        overflow: "hidden",
                        cursor: "pointer",
                        height: { xs: "350px", md: "420px" },
                        "&:hover img": {
                          transform: "scale(1.03)",
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={getCloudinaryThumbnail(url, 500, 420)}
                        alt={`Portfolio ${index + 1}`}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.6s ease",
                        }}
                      />
                    </MDBox>
                  </Fade>
                </Grid>
              ))}
            </Grid>
          </Container>
        </MDBox>
      )}

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

      {/* Book Model Modal */}
      {canBookModels && profile && (
        <BookModelModal
          open={bookModelModalOpen}
          onClose={() => setBookModelModalOpen(false)}
          model={profile}
          currentUser={user}
        />
      )}
    </MDBox>
  );
}

export default PublicProfile;
