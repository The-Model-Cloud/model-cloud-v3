import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";

import ProfileAvatar from "components/Profile/ProfileAvatar";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import burceMars from "assets/images/bruce-mars.jpg";

function Header() {
  const [visible, setVisible] = useState(true);
  const [userName, setUserName] = useState("Loading...");
  const [role, setRole] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(""); // ✅ Must be up here
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const handleSetVisible = () => setVisible(!visible);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

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
          setUserName(`${firstName} ${lastName}`.trim());
          setRole(data.role || "");
          setAvatarUrl(data.profileAvatar || ""); // ✅ Here’s the correct place
        }
      }
    };
    fetchUser();
  }, []);


  return (
    <Card id="profile">
      <MDBox p={2}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <ProfileAvatar
              src={avatarUrl}
              alt={userName}
              size={100}
              showStatusDot={true}
            />
          </Grid>

          <Grid item>
            <MDBox height="100%" mt={0.5} lineHeight={1}>
              <MDTypography variant="h5" fontWeight="medium">
                {userName}
              </MDTypography>
              <MDTypography variant="button" color="text" fontWeight="medium">
                {role}
              </MDTypography>
            </MDBox>
          </Grid>

          <Grid item xs={12} md={6} lg={3} sx={{ ml: "auto" }}>
            <MDBox
              display="flex"
              justifyContent={{ md: "flex-end" }}
              alignItems="center"
              lineHeight={1}
            >
              <MDTypography variant="caption" fontWeight="regular">
                Switch to {visible ? "invisible" : "visible"}
              </MDTypography>
              <MDBox ml={1}>
                <Switch checked={visible} onChange={handleSetVisible} />
              </MDBox>
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
    </Card>
  );
}

export default Header;
