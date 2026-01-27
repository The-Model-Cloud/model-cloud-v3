import { useState, useEffect } from "react";
import ProfileAvatar from "components/Profile/ProfileAvatar";
import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function Header({ children }) {
  const [fullName, setFullName] = useState("Loading...");
  const [publicSlug, setPublicSlug] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const firstName = data.firstName || "";
          const lastName = data.lastName || "";
          setFullName(`${firstName} ${lastName}`.trim());
          setAvatarUrl(data.profileAvatar || "");
          setUserRole(data.role || null); // Set the user role
          // Use the publicSlug from the database
          setPublicSlug(data.publicSlug || "");
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <MDBox position="relative" mb={5}>
      <Card
        sx={{
          position: "relative",
          py: 2,
          px: 2,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <ProfileAvatar src={avatarUrl} alt={fullName} size={100} />
          </Grid>
          <Grid item>
            <MDBox height="100%" mt={0.5} lineHeight={1}>
              <MDTypography variant="h5" fontWeight="medium">
                {fullName}
              </MDTypography>
              {publicSlug && userRole === "model" && ( // Check if user is a model
                <MDTypography
                  component={Link}
                  to={`/${publicSlug}`}
                  variant="h6"
                  fontWeight="normal"
                  color="info"
                  textGradient
                  sx={{ textDecoration: "none" }}
                >
                  View Public Profile
                </MDTypography>
              )}
            </MDBox>
          </Grid>
        </Grid>
        {children}
      </Card>
    </MDBox>
  );
}

// Setting default props for the Header
Header.defaultProps = {
  children: "",
};

// Typechecking props for the Header
Header.propTypes = {
  children: PropTypes.node,
};

export default Header;
