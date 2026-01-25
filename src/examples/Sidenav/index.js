/**
=========================================================
* Material Dashboard 3 PRO React - v2.3.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-pro-react
* Copyright 2024 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useEffect, useState, useMemo } from "react";

// react-router-dom components
import { NavLink, useLocation, useNavigate } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

// Material Dashboard 3 PRO React examples
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";
import SidenavList from "examples/Sidenav/SidenavList";
import SidenavItem from "examples/Sidenav/SidenavItem";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

// Material Dashboard 3 PRO React context
import {
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
} from "context";

// Firebase imports
import { auth, db } from "config/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import ProfileAvatar from "components/Profile/ProfileAvatar";

// Auth context for role-based filtering
import { useAuth } from "context/AuthContext";

// Messaging context for unread count
import { useMessaging } from "context/MessagingContext";

// Role-based route filtering
import { filterRoutesByRole, cleanRoutes, hasAccess } from "routes";

function Sidenav({ color, brand, brandName, routes, ...rest }) {
  const [openCollapse, setOpenCollapse] = useState(false);
  const [openNestedCollapse, setOpenNestedCollapse] = useState(false);
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode } = controller;
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  // Handle logout - clear localStorage and sign out from Firebase
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("isLoggedIn");
      navigate("/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  const collapseName = pathname.split("/").slice(1)[0];
  const items = pathname.split("/").slice(1);
  const itemParentName = items[1];
  const itemName = items[items.length - 1];

  // ✅ Get user from auth context for role-based filtering
  const { user } = useAuth();
  const userRole = user?.role || null;

  // ✅ Get unread message count
  const { totalUnread } = useMessaging();

  // ✅ User data state
  const [userData, setUserData] = useState({
    name: "Loading...",
    avatar: null,
    publicSlug: null,
  });

  // ✅ Filter routes based on user role
  const filteredRoutes = useMemo(() => {
    if (!userRole) return routes; // Show all routes if no role (should not happen when authenticated)
    const filtered = filterRoutesByRole(routes, userRole);
    return cleanRoutes(filtered);
  }, [routes, userRole]);

  // ✅ Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserData({
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "User",
            avatar: data.profileAvatar || null,
            publicSlug: data.publicSlug || null,
          });
        }
      }
    };

    fetchUserData();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserData();
      }
    });

    return () => unsubscribe();
  }, []);

  let textColor = "white";

  if (transparentSidenav || (whiteSidenav && !darkMode)) {
    textColor = "dark";
  } else if (whiteSidenav && darkMode) {
    textColor = "inherit";
  }

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  useEffect(() => {
    setOpenCollapse(collapseName);
    setOpenNestedCollapse(itemParentName);
  }, []);

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
      setTransparentSidenav(dispatch, window.innerWidth < 1200 ? false : transparentSidenav);
      setWhiteSidenav(dispatch, window.innerWidth < 1200 ? false : whiteSidenav);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  // Render all the nested collapse items from the routes.js
  const renderNestedCollapse = (collapse) => {
    const template = collapse.map(({ name, route, key, href }) =>
      href ? (
        <Link
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          sx={{ textDecoration: "none" }}
        >
          <SidenavItem name={name} nested />
        </Link>
      ) : (
        <NavLink to={route} key={key} style={{ textDecoration: "none" }}>
          <SidenavItem name={name} active={route === pathname} nested />
        </NavLink>
      )
    );

    return template;
  };

  // Render the all the collpases from the routes.js
  const renderCollapse = (collapses) =>
    collapses
      // ✅ Filter collapse items by role
      .filter((item) => {
        if (item.invisible) return false;
        return hasAccess(userRole, item.roles);
      })
      .map(({ name, collapse, route, href, key, roles }) => {
        let returnValue;

        // ✅ Make "View Public Profile" route dynamic based on user's publicSlug
        let dynamicRoute = route;
        if (key === "view-public-profile" && userData.publicSlug) {
          dynamicRoute = `/${userData.publicSlug}`;
        }

        if (collapse) {
          // ✅ Filter nested collapse items by role
          const filteredNestedCollapse = collapse.filter((nestedItem) => {
            if (nestedItem.invisible) return false;
            return hasAccess(userRole, nestedItem.roles);
          });

          // Don't render if all nested items are filtered out
          if (filteredNestedCollapse.length === 0) return null;

          returnValue = (
            <SidenavItem
              key={key}
              color={color}
              name={name}
              active={key === itemParentName ? "isParent" : false}
              open={openNestedCollapse === key}
              onClick={({ currentTarget }) =>
                openNestedCollapse === key && currentTarget.classList.contains("MuiListItem-root")
                  ? setOpenNestedCollapse(false)
                  : setOpenNestedCollapse(key)
              }
            >
              {renderNestedCollapse(filteredNestedCollapse)}
            </SidenavItem>
          );
        } else {
          returnValue = href ? (
            <Link
              href={href}
              key={key}
              target="_blank"
              rel="noreferrer"
              sx={{ textDecoration: "none" }}
            >
              <SidenavItem color={color} name={name} active={key === itemName} />
            </Link>
          ) : (
            <NavLink to={dynamicRoute} key={key} style={{ textDecoration: "none" }}>
              <SidenavItem color={color} name={name} active={key === itemName} />
            </NavLink>
          );
        }
        return <SidenavList key={key}>{returnValue}</SidenavList>;
      })
      .filter(Boolean); // Remove null entries

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  // ✅ Using filteredRoutes instead of routes for role-based menu visibility
  const renderRoutes = filteredRoutes.map(
    ({ type, name, icon, title, collapse, noCollapse, key, href, route, roles }) => {
      let returnValue;

      if (type === "collapse") {
        // ✅ Special handling for user profile route
        // Clicking on user's name/avatar navigates to their public profile (for models)
        // or dashboard (for non-models)
        if (key === "brooklyn-alice" || key === "user-profile") {
          // Determine the route: public profile for models, dashboard for others
          const profileRoute =
            userRole === "model" && userData.publicSlug
              ? `/${userData.publicSlug}`
              : "/dashboard";

          returnValue = (
            <NavLink key={key} to={profileRoute}>
              <SidenavCollapse
                name={userData.name}
                icon={<ProfileAvatar src={userData.avatar} alt={userData.name} size={40} />}
                active={key === collapseName}
                noCollapse={true}
              />
            </NavLink>
          );
        } else if (collapse) {
          returnValue = (
            <SidenavCollapse
              key={key}
              name={name}
              icon={icon}
              active={key === collapseName}
              open={openCollapse === key}
              onClick={() => (openCollapse === key ? setOpenCollapse(false) : setOpenCollapse(key))}
            >
              {renderCollapse(collapse)}
            </SidenavCollapse>
          );
        } else {
          returnValue = href ? (
            <Link
              href={href}
              key={key}
              target="_blank"
              rel="noreferrer"
              sx={{ textDecoration: "none" }}
            >
              <SidenavCollapse
                name={name}
                icon={icon}
                active={key === collapseName}
                noCollapse={noCollapse}
              />
            </Link>
          ) : key === "logout" ? (
            <MDBox key={key} onClick={handleLogout} sx={{ cursor: "pointer" }}>
              <SidenavCollapse
                name={name}
                icon={icon}
                active={key === collapseName}
                noCollapse={noCollapse}
              />
            </MDBox>
          ) : key === "messages" ? (
            // ✅ Special handling for Messages with unread badge
            <NavLink key={key} to={route}>
              <SidenavCollapse
                name={
                  totalUnread > 0 ? (
                    <MDBox display="flex" alignItems="center">
                      {name}
                      <MDBadge
                        badgeContent={totalUnread > 99 ? "99+" : totalUnread}
                        color="error"
                        size="xs"
                        circular
                        sx={{ ml: 1 }}
                      />
                    </MDBox>
                  ) : (
                    name
                  )
                }
                icon={icon}
                active={key === collapseName}
                noCollapse={noCollapse}
              />
            </NavLink>
          ) : (
            <NavLink key={key} to={route}>
              <SidenavCollapse
                name={name}
                icon={icon}
                active={key === collapseName}
                noCollapse={noCollapse}
              />
            </NavLink>
          );
        }
      } else if (type === "title") {
        returnValue = (
          <MDTypography
            key={key}
            color={textColor}
            display="block"
            variant="caption"
            fontWeight="bold"
            textTransform="uppercase"
            pl={3}
            mt={2}
            mb={1}
            ml={1}
          >
            {title}
          </MDTypography>
        );
      } else if (type === "divider") {
        returnValue = (
          <Divider
            key={key}
            light={
              (!darkMode && !whiteSidenav && !transparentSidenav) ||
              (darkMode && !transparentSidenav && whiteSidenav)
            }
          />
        );
      }

      return returnValue;
    }
  );

  return (
    <SidenavRoot
      {...rest}
      variant="permanent"
      ownerState={{ transparentSidenav, whiteSidenav, miniSidenav, darkMode }}
    >
      <MDBox pt={3} pb={1} px={4} textAlign="center">
        <MDBox
          display={{ xs: "block", xl: "none" }}
          position="absolute"
          top={0}
          right={0}
          p={1.625}
          onClick={closeSidenav}
          sx={{ cursor: "pointer" }}
        >
          <MDTypography variant="h6" color="secondary">
            <Icon sx={{ fontWeight: "bold" }}>close</Icon>
          </MDTypography>
        </MDBox>
        <MDBox component={NavLink} to="/" display="flex" alignItems="center">
          {brand && <MDBox component="img" src={brand} alt="Brand" width="2rem" />}
          <MDBox
            width={!brandName && "100%"}
            sx={(theme) => sidenavLogoLabel(theme, { miniSidenav })}
          >
            <MDTypography component="h6" variant="button" fontWeight="medium" color={textColor}>
              {brandName}
            </MDTypography>
          </MDBox>
        </MDBox>
      </MDBox>
      <Divider
        light={
          (!darkMode && !whiteSidenav && !transparentSidenav) ||
          (darkMode && !transparentSidenav && whiteSidenav)
        }
      />
      <List>{renderRoutes}</List>
    </SidenavRoot>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  brand: "",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;