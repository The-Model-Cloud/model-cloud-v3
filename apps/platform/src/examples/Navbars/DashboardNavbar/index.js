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

import { useState, useEffect } from "react";

// react-router components
import { useLocation, useNavigate } from "react-router-dom";

// Firebase
import { signOut } from "firebase/auth";
import { auth } from "config/firebase";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @material-ui core components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDBadge from "components/MDBadge";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import Breadcrumbs from "examples/Breadcrumbs";
import NotificationItem from "examples/Items/NotificationItem";

// Custom styles for DashboardNavbar
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarDesktopMenu,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";

// Material Dashboard 3 PRO React context
import {
  useMaterialUIController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";

// Notifications context
import { useNotifications } from "context/NotificationsContext";

// Helper to get icon for notification type
const getNotificationIcon = (type) => {
  switch (type) {
    case "job_invitation":
      return "mail";
    case "job_application":
      return "person_add";
    case "invitation_accepted":
      return "how_to_reg";
    case "job_application_confirmation":
      return "check_circle";
    case "job_application_cancelled":
      return "cancel";
    case "job_awarded":
      return "emoji_events";
    case "payment":
    case "payment_authorised":
      return "lock";
    case "job_marked_complete":
      return "assignment_turned_in";
    case "funds_released":
    case "funds_auto_released":
      return "paid";
    case "payment_failed":
      return "error";
    case "subscription_expired":
      return "warning";
    default:
      return "notifications";
  }
};

// Helper to format notification time
const formatNotificationTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useMaterialUIController();
  const { unreadCount: notificationCount, notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const {
    miniSidenav,
    transparentNavbar,
    fixedNavbar,
    openConfigurator,
    darkMode,
  } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const route = useLocation().pathname.split("/").slice(1);

  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    // A function that sets the transparent state of the navbar.
    function handleTransparentNavbar() {
      setTransparentNavbar(
        dispatch,
        (fixedNavbar && window.scrollY === 0) || !fixedNavbar
      );
    }

    /** 
     The event listener that's calling the handleTransparentNavbar function when 
     scrolling the window.
    */
    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () =>
    setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("isLoggedIn");
      navigate("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    handleCloseMenu();
    // Navigate to the link if provided
    if (notification.data?.link) {
      navigate(notification.data.link);
    }
  };

  // Render the notifications menu
  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorReference={null}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
      sx={{ mt: 2 }}
      PaperProps={{
        sx: {
          maxHeight: 400,
          width: 360,
          overflow: "auto",
        },
      }}
    >
      {/* Header */}
      <MDBox px={2} py={1.5} display="flex" justifyContent="space-between" alignItems="center">
        <MDTypography variant="h6" fontWeight="medium">
          Notifications
        </MDTypography>
        {notificationCount > 0 && (
          <MDTypography
            variant="caption"
            color="info"
            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            onClick={() => {
              markAllAsRead();
            }}
          >
            Mark all as read
          </MDTypography>
        )}
      </MDBox>
      <Divider sx={{ m: 0 }} />

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <MDBox px={2} py={3} textAlign="center">
          <Icon sx={{ fontSize: 40, color: "grey.400", mb: 1 }}>notifications_none</Icon>
          <MDTypography variant="body2" color="text">
            No notifications yet
          </MDTypography>
        </MDBox>
      ) : (
        notifications.slice(0, 10).map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            sx={{
              py: 1.5,
              px: 2,
              backgroundColor: notification.read ? "transparent" : "action.hover",
              "&:hover": {
                backgroundColor: "action.selected",
              },
            }}
          >
            <MDBox display="flex" alignItems="flex-start" width="100%">
              <MDBox
                display="flex"
                alignItems="center"
                justifyContent="center"
                width={40}
                height={40}
                borderRadius="lg"
                sx={{
                  backgroundColor: notification.read ? "grey.200" : "info.main",
                  color: notification.read ? "grey.600" : "white",
                  mr: 1.5,
                  flexShrink: 0,
                }}
              >
                <Icon fontSize="small">{getNotificationIcon(notification.type)}</Icon>
              </MDBox>
              <MDBox flex={1} minWidth={0}>
                <MDTypography
                  variant="button"
                  fontWeight={notification.read ? "regular" : "medium"}
                  sx={{
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {notification.title}
                </MDTypography>
                <MDTypography
                  variant="caption"
                  color="text"
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.4,
                  }}
                >
                  {notification.message}
                </MDTypography>
                <MDTypography variant="caption" color="secondary" sx={{ mt: 0.5, display: "block" }}>
                  {formatNotificationTime(notification.createdAt)}
                </MDTypography>
              </MDBox>
              {!notification.read && (
                <MDBox
                  width={8}
                  height={8}
                  borderRadius="50%"
                  bgcolor="info.main"
                  ml={1}
                  flexShrink={0}
                />
              )}
            </MDBox>
          </MenuItem>
        ))
      )}

      {/* View all link */}
      {notifications.length > 0 && (
        <>
          <Divider sx={{ m: 0 }} />
          <MDBox
            py={1.5}
            textAlign="center"
            sx={{ cursor: "pointer", "&:hover": { backgroundColor: "action.hover" } }}
            onClick={() => {
              handleCloseMenu();
              navigate("/notifications");
            }}
          >
            <MDTypography variant="button" color="info">
              View all notifications
            </MDTypography>
          </MDBox>
        </>
      )}
    </Menu>
  );

  // Styles for the navbar icons
  const iconsStyle = ({
    palette: { dark, white, text },
    functions: { rgba },
  }) => ({
    color: () => {
      let colorValue = light || darkMode ? white.main : dark.main;

      if (transparentNavbar && !light) {
        colorValue = darkMode ? rgba(text.main, 0.6) : text.main;
      }

      return colorValue;
    },
  });

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) =>
        navbar(theme, { transparentNavbar, absolute, light, darkMode })
      }
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        <MDBox color="inherit" sx={(theme) => navbarRow(theme, { isMini })}>
          <IconButton
            sx={navbarDesktopMenu}
            onClick={handleMiniSidenav}
            size="small"
            disableRipple
          >
            <Icon fontSize="medium" sx={iconsStyle}>
              {miniSidenav ? "menu_open" : "menu"}
            </Icon>
          </IconButton>
          <Breadcrumbs
            icon="home"
            title={route[route.length - 1]}
            route={route}
            light={light}
          />
        </MDBox>
        {isMini ? null : (
          <MDBox sx={(theme) => navbarRow(theme, { isMini })}>
            <MDBox pr={1}>
              <MDInput label="Search here" />
            </MDBox>
            <MDBox color={light ? "white" : "inherit"}>
              <IconButton
                sx={navbarIconButton}
                size="small"
                disableRipple
                onClick={handleLogout}
                title="Logout"
              >
                <Icon sx={iconsStyle}>logout</Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarMobileMenu}
                onClick={handleMiniSidenav}
              >
                <Icon sx={iconsStyle} fontSize="medium">
                  {miniSidenav ? "menu_open" : "menu"}
                </Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarIconButton}
                onClick={handleConfiguratorOpen}
              >
                <Icon sx={iconsStyle}>settings</Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarIconButton}
                aria-controls="notification-menu"
                aria-haspopup="true"
                variant="contained"
                onClick={handleOpenMenu}
              >
                <MDBadge badgeContent={notificationCount} color="error" size="xs" circular invisible={notificationCount === 0}>
                  <Icon sx={iconsStyle}>notifications</Icon>
                </MDBadge>
              </IconButton>
              {renderMenu()}
            </MDBox>
          </MDBox>
        )}
      </Toolbar>
    </AppBar>
  );
}

// Setting default values for the props of DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

// Typechecking props for the DashboardNavbar
DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
