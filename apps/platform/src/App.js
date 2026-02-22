import { useState, useEffect, useMemo } from "react";

// react-router components
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Material Dashboard 3 PRO React examples
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";

// Material Dashboard 3 PRO React themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// Material Dashboard 3 PRO React Dark Mode themes
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

// RTL plugins
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Material Dashboard 3 PRO React routes
import routes from "routes";

import { hasAccess } from "routes";
import { useAuth } from "context/AuthContext"; // Adjust if stored elsewhere
import { isUnverifiedModel } from "utils/verification";

// Model public profile page
import PublicProfile from "layouts/pages/profile/public-profile";
import ProfileOverview from "layouts/pages/profile/profile-overview";
import Settings from "layouts/pages/account/settings";

//Job Details page
import JobDetails from "layouts/jobs/job-details";
import EditJob from "layouts/jobs/edit-job";

// Messaging
import MessagesInbox from "layouts/messages";


// Material Dashboard 3 PRO React contexts
import {
  useMaterialUIController,
  setMiniSidenav,
  setOpenConfigurator,
  loadPreferences,
  getSystemDarkMode,
} from "context";

// Images
import brandWhite from "assets/images/logo-ct.png";
import brandDark from "assets/images/logo-ct-dark.png";

// Component to handle default redirect based on login status
function DefaultRedirect() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  return <Navigate to={isLoggedIn ? "/dashboard" : "/sign-in"} replace />;
}

export default function App() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    direction,
    layout,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
  } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    // Check if it's an authentication route (should use page layout, no sidenav)
    const isAuthRoute = pathname.startsWith('/authentication') || pathname === '/sign-in' || pathname === '/sign-up';

    // Exclude app routes from public profile detection
    const appRoutes = ['/dashboard', '/edit-profile', '/jobs', '/models', '/admin', '/dashboards', '/pages', '/applications', '/ecommerce', '/authentication', '/sign-in', '/sign-up', '/messages', '/favourites', '/shared', '/zcard', '/payouts', '/payments', '/notifications', '/invoices', '/account', '/briefs', '/organisations', '/castings', '/organisation'];
    const isAppRoute = appRoutes.some(route => pathname.startsWith(route));

    // Check if it's a public profile (single segment slug, not an app route)
    const isPublicProfile = /^\/[a-z0-9_-]+$/i.test(pathname) && !isAppRoute;

    if (isAuthRoute || isPublicProfile) {
      // Disable dashboard layout features for auth pages and public profiles
      setMiniSidenav(dispatch, true); // collapse sidenav
      setOpenConfigurator(dispatch, false);
      controller.layout !== "page" && dispatch({ type: "LAYOUT", value: "page" });
    } else {
      controller.layout !== "dashboard" && dispatch({ type: "LAYOUT", value: "dashboard" });
    }
  }, [pathname, dispatch]);


  // Cache for the rtl
  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });

    setRtlCache(cacheRtl);
  }, []);

  // Open sidenav when mouse enter on mini sidenav
  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };

  // Close sidenav when mouse leave mini sidenav
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const { user } = useAuth();

  // Load UI preferences from Firestore when user logs in
  useEffect(() => {
    if (user?.uiPreferences) {
      const prefs = user.uiPreferences;
      // Load all saved preferences
      const prefsToLoad = {};
      if (prefs.miniSidenav !== undefined) prefsToLoad.miniSidenav = prefs.miniSidenav;
      if (prefs.transparentSidenav !== undefined) prefsToLoad.transparentSidenav = prefs.transparentSidenav;
      if (prefs.whiteSidenav !== undefined) prefsToLoad.whiteSidenav = prefs.whiteSidenav;
      if (prefs.sidenavColor !== undefined) prefsToLoad.sidenavColor = prefs.sidenavColor;
      if (prefs.fixedNavbar !== undefined) prefsToLoad.fixedNavbar = prefs.fixedNavbar;
      if (prefs.darkModePreference !== undefined) {
        prefsToLoad.darkModePreference = prefs.darkModePreference;
        // Set darkMode based on preference
        if (prefs.darkModePreference === "system") {
          prefsToLoad.darkMode = getSystemDarkMode();
        } else {
          prefsToLoad.darkMode = prefs.darkModePreference === "dark";
        }
      }

      if (Object.keys(prefsToLoad).length > 0) {
        loadPreferences(dispatch, prefsToLoad);
      }
    }
  }, [user?.uid, user?.uiPreferences, dispatch]);

  // Routes that unverified models ARE allowed to access
  const allowedRoutesForUnverified = [
    "/dashboard",
    "/edit-profile",
    "/pages/account/settings",
    "/pages/profile/profile-overview",
    "/authentication",
    "/sign-in",
    "/sign-up",
  ];

  const isRouteAllowedForUnverified = (routePath) => {
    return allowedRoutesForUnverified.some(
      (allowed) => routePath === allowed || routePath.startsWith(allowed + "/")
    );
  };

  const getRoutes = (allRoutes) =>
    allRoutes.flatMap((route) => {
      if (route.collapse) return getRoutes(route.collapse);

      if (route.route && (!route.roles || hasAccess(user?.role, route.roles))) {
        // Check if user is unverified model and route is restricted
        if (isUnverifiedModel(user) && !isRouteAllowedForUnverified(route.route)) {
          // Return a redirect to dashboard for restricted routes
          return (
            <Route
              exact
              path={route.route}
              element={<Navigate to="/dashboard" replace />}
              key={route.key}
            />
          );
        }

        return (
          <Route
            exact
            path={route.route}
            element={route.component}
            key={route.key}
          />
        );
      }

      return [];
    });

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
        <CssBaseline />
        {layout === "dashboard" && (
          <>
            <Sidenav
              color={sidenavColor}
              brand={
                (transparentSidenav && !darkMode) || whiteSidenav
                  ? brandDark
                  : brandWhite
              }
              brandName="The Model Cloud"
              routes={routes}
              onMouseEnter={handleOnMouseEnter}
              onMouseLeave={handleOnMouseLeave}
            />
            <Configurator />
          </>
        )}

        {layout === "vr" && <Configurator />}
        <Routes>
          {getRoutes(routes)}
          {/* Dashboard route (was /pages/profile/profile-overview) */}
          <Route path="/dashboard" element={<ProfileOverview />} />
          {/* Edit Profile route (was /pages/account/settings) */}
          <Route path="/edit-profile" element={<Settings />} />



          <Route path="/jobs/:reference" element={<JobDetails />} />
          <Route path="/jobs/edit/:reference" element={<EditJob />} />
          {/* Messaging routes */}
          <Route path="/messages/:threadId" element={<MessagesInbox />} />
          {/* Public-facing profile route based on slug */}
          <Route path="/:slug" element={<PublicProfile />} />

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      {layout === "dashboard" && (
        <>
          <Sidenav
            color={sidenavColor}
            brand={
              (transparentSidenav && !darkMode) || whiteSidenav
                ? brandDark
                : brandWhite
            }
            brandName="The Model Cloud"
            routes={routes}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          <Configurator />
        </>
      )}
      {layout === "vr" && <Configurator />}
      <Routes>
        {getRoutes(routes)}

        <Route path="/jobs/:reference" element={<JobDetails />} />
        <Route path="/jobs/edit/:reference" element={<EditJob />} />
        {/* Messaging routes */}
        <Route path="/messages/:threadId" element={<MessagesInbox />} />

        <Route path="/:slug" element={<PublicProfile />} />

        {/* Default fallback */}
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>

    </ThemeProvider>
  );
}
