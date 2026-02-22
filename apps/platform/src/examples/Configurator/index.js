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

// @mui material components
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import Icon from "@mui/material/Icon";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Custom styles for the Configurator
import ConfiguratorRoot from "examples/Configurator/ConfiguratorRoot";

// Material Dashboard 3 PRO React context
import {
  useMaterialUIController,
  setOpenConfigurator,
  setTransparentSidenav,
  setWhiteSidenav,
  setMiniSidenav,
  setFixedNavbar,
  setDarkModePreference,
  savePreferencesToFirestore,
} from "context";

// Auth context for saving preferences
import { useAuth } from "context/AuthContext";

function Configurator() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    openConfigurator,
    miniSidenav,
    fixedNavbar,
    transparentSidenav,
    whiteSidenav,
    darkMode,
    darkModePreference,
  } = controller;
  const { user } = useAuth();

  const handleCloseConfigurator = () => setOpenConfigurator(dispatch, false);

  // Helper to save all current preferences to Firestore
  const saveAllPreferences = (overrides = {}) => {
    if (user?.uid) {
      const preferences = {
        miniSidenav,
        transparentSidenav,
        whiteSidenav,
        fixedNavbar,
        darkModePreference,
        ...overrides,
      };
      savePreferencesToFirestore(user.uid, preferences);
    }
  };

  const handleMiniSidenav = () => {
    setMiniSidenav(dispatch, !miniSidenav);
    saveAllPreferences({ miniSidenav: !miniSidenav });
  };

  const handleFixedNavbar = () => {
    setFixedNavbar(dispatch, !fixedNavbar);
    saveAllPreferences({ fixedNavbar: !fixedNavbar });
  };

  // Handle dark mode preference change (light/dark/system)
  // Also syncs sidenav type with appearance
  const handleDarkModeChange = (preference) => {
    setDarkModePreference(dispatch, preference);

    // Sync sidenav type with appearance
    if (preference === "dark") {
      // Dark appearance -> Dark sidenav
      setWhiteSidenav(dispatch, false);
      setTransparentSidenav(dispatch, false);
      saveAllPreferences({
        darkModePreference: preference,
        whiteSidenav: false,
        transparentSidenav: false
      });
    } else if (preference === "light") {
      // Light appearance -> White sidenav
      setWhiteSidenav(dispatch, true);
      setTransparentSidenav(dispatch, false);
      saveAllPreferences({
        darkModePreference: preference,
        whiteSidenav: true,
        transparentSidenav: false
      });
    } else {
      // System appearance -> depends on current system preference
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        setWhiteSidenav(dispatch, false);
        setTransparentSidenav(dispatch, false);
        saveAllPreferences({
          darkModePreference: preference,
          whiteSidenav: false,
          transparentSidenav: false
        });
      } else {
        setWhiteSidenav(dispatch, true);
        setTransparentSidenav(dispatch, false);
        saveAllPreferences({
          darkModePreference: preference,
          whiteSidenav: true,
          transparentSidenav: false
        });
      }
    }
  };

  // Appearance button styles
  const buttonStyles = ({
    functions: { pxToRem },
    palette: { white, dark, background },
    borders: { borderWidth },
  }) => ({
    height: pxToRem(39),
    background: darkMode ? background.sidenav : white.main,
    color: darkMode ? white.main : dark.main,
    border: `${borderWidth[1]} solid ${darkMode ? white.main : dark.main}`,

    "&:hover, &:focus, &:focus:not(:hover)": {
      background: darkMode ? background.sidenav : white.main,
      color: darkMode ? white.main : dark.main,
      border: `${borderWidth[1]} solid ${darkMode ? white.main : dark.main}`,
    },
  });

  // Appearance active button styles
  const activeButtonStyles = ({
    functions: { pxToRem, linearGradient },
    palette: { white, gradients, background },
  }) => ({
    height: pxToRem(39),
    background: darkMode
      ? white.main
      : linearGradient(gradients.dark.main, gradients.dark.state),
    color: darkMode ? background.sidenav : white.main,

    "&:hover, &:focus, &:focus:not(:hover)": {
      background: darkMode
        ? white.main
        : linearGradient(gradients.dark.main, gradients.dark.state),
      color: darkMode ? background.sidenav : white.main,
    },
  });

  return (
    <ConfiguratorRoot variant="permanent" ownerState={{ openConfigurator }}>
      <MDBox
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
        pt={4}
        pb={0.5}
        px={3}
      >
        <MDBox>
          <MDTypography variant="h5">Settings</MDTypography>
          <MDTypography variant="body2" color="text">
            Customise your dashboard.
          </MDTypography>
        </MDBox>

        <Icon
          sx={({ typography: { size }, palette: { dark, white } }) => ({
            fontSize: `${size.lg} !important`,
            color: darkMode ? white.main : dark.main,
            stroke: "currentColor",
            strokeWidth: "2px",
            cursor: "pointer",
            transform: "translateY(5px)",
          })}
          onClick={handleCloseConfigurator}
        >
          close
        </Icon>
      </MDBox>

      <Divider />

      <MDBox pt={0.5} pb={3} px={3}>
        {/* Navbar Fixed */}
        <MDBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          lineHeight={1}
        >
          <MDTypography variant="h6">Navbar Fixed</MDTypography>
          <Switch checked={fixedNavbar} onChange={handleFixedNavbar} />
        </MDBox>

        <Divider />

        {/* Sidenav Mini */}
        <MDBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          lineHeight={1}
        >
          <MDTypography variant="h6">Sidenav Mini</MDTypography>
          <Switch checked={miniSidenav} onChange={handleMiniSidenav} />
        </MDBox>

        <Divider />

        {/* Appearance */}
        <MDBox mt={3} lineHeight={1}>
          <MDTypography variant="h6">Appearance</MDTypography>
          <MDTypography variant="button" color="text">
            Choose your preferred theme.
          </MDTypography>

          <MDBox
            sx={{
              display: "flex",
              mt: 2,
              mr: 1,
            }}
          >
            <MDButton
              color="dark"
              variant="gradient"
              onClick={() => handleDarkModeChange("light")}
              fullWidth
              sx={
                darkModePreference === "light"
                  ? activeButtonStyles
                  : buttonStyles
              }
            >
              Light
            </MDButton>
            <MDBox sx={{ mx: 1, width: "8rem", minWidth: "8rem" }}>
              <MDButton
                color="dark"
                variant="gradient"
                onClick={() => handleDarkModeChange("dark")}
                fullWidth
                sx={
                  darkModePreference === "dark"
                    ? activeButtonStyles
                    : buttonStyles
                }
              >
                Dark
              </MDButton>
            </MDBox>
            <MDButton
              color="dark"
              variant="gradient"
              onClick={() => handleDarkModeChange("system")}
              fullWidth
              sx={
                darkModePreference === "system"
                  ? activeButtonStyles
                  : buttonStyles
              }
            >
              System
            </MDButton>
          </MDBox>
        </MDBox>
      </MDBox>
    </ConfiguratorRoot>
  );
}

export default Configurator;
