import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "config/firebase";

// MUI components
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDButton from "components/MDButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ProfileAvatar from "components/Profile/ProfileAvatar";
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'; // Import the heart icon

function PublicProfile() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchUser();
  }, [slug]);

  const fetchUser = async () => {
    const q = query(collection(db, "users"), where("publicSlug", "==", slug));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      setProfile(snapshot.docs[0].data());
    }
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
                {currentUser && profile.role === "model" ? null : currentUser ? (
                  <>
                    <MDTypography variant="h6" color="info">
                      Book this Model
                    </MDTypography>
                    <MDButton variant="gradient" color="info" size="medium">
                      Book Model
                    </MDButton>
                    {currentUser && currentUser.uid !== profile.uid && currentUser.role === "client" && (
                    <MDButton
                      variant="outlined"
                      color="primary"
                      size="medium"
                      sx={{ mt: 2 }}
                      startIcon={<FavoriteBorderIcon />}
                    >
                      Add to Favourites
                    </MDButton>
                    )}
                  </>
                ) : (
                  <MDButton
                    variant="outlined"
                    color="info"
                    size="medium"
                    href="/authentication/sign-in/illustration"
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
          {profile.portfolio?.length > 0 && (
            <>
              <Grid container spacing={2}>
                {profile.portfolio.map((url, index) => (
                  <Grid item xs={12} mt={1} sm={6} md={4} lg={3} key={index}>
                    <MDBox component="img" src={url} alt={`Portfolio ${index + 1}`} width="100%" sx={{ objectFit: "cover" }} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </MDBox>
      </Card>
    </Container>
  );
}

export default PublicProfile;