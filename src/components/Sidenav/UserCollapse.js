import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";
import MDAvatar from "components/MDAvatar";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import Icon from "@mui/material/Icon";
import Collapse from "@mui/material/Collapse";
import SidenavItem from "examples/Sidenav/SidenavItem";
import SidenavList from "examples/Sidenav/SidenavList";

function UserCollapse() {
  const [fullName, setFullName] = useState("Loading...");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setFullName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
          setAvatarUrl(data.profileAvatar || "");
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Optional: Stable internal key
  const routeKey = "user-collapse";

  return (
    <>
      {/* This replicates a route item with type: "collapse", key: routeKey, icon: <MDAvatar /> */}
      <SidenavList key={routeKey}>
        <MDBox
          onClick={() => setOpen((prev) => !prev)}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={2}
          py={1}
          sx={{ cursor: "pointer" }}
        >
          <MDBox display="flex" alignItems="center">
            <MDAvatar src={avatarUrl} alt={fullName} size="sm" />
            <MDTypography ml={2}>
              {fullName}
            </MDTypography>
          </MDBox>
          <Icon fontSize="small">{open ? "expand_less" : "expand_more"}</Icon>
        </MDBox>
      </SidenavList>

      {/* This replicates a nested collapse array */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <SidenavList key="user-dashboard-link">
          <NavLink to="/dashboard">
            <SidenavItem name="Dashboard" nested />
          </NavLink>
        </SidenavList>
        <SidenavList key="user-edit-profile-link">
          <NavLink to="/edit-profile">
            <SidenavItem name="Edit Profile" nested />
          </NavLink>
        </SidenavList>
        <SidenavList key="user-logout-link">
          <NavLink to="/sign-in">
            <SidenavItem name="Logout" nested />
          </NavLink>
        </SidenavList>
      </Collapse>
    </>
  );
}

export default UserCollapse;
