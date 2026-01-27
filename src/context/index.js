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

/**
  This file is used for controlling the global states of the components,
  you can customize the states for the different components here.
*/

import { createContext, useContext, useMemo, useReducer, useEffect } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// Firebase imports for saving preferences
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// The Material Dashboard 3 PRO React main context
const MaterialUI = createContext();

// Setting custom name for the context which is visible on react dev tools
MaterialUI.displayName = "MaterialUIContext";

// Material Dashboard 3 PRO React reducer
function reducer(state, action) {
  switch (action.type) {
    case "MINI_SIDENAV": {
      return { ...state, miniSidenav: action.value };
    }
    case "TRANSPARENT_SIDENAV": {
      return { ...state, transparentSidenav: action.value };
    }
    case "WHITE_SIDENAV": {
      return { ...state, whiteSidenav: action.value };
    }
    case "SIDENAV_COLOR": {
      return { ...state, sidenavColor: action.value };
    }
    case "TRANSPARENT_NAVBAR": {
      return { ...state, transparentNavbar: action.value };
    }
    case "FIXED_NAVBAR": {
      return { ...state, fixedNavbar: action.value };
    }
    case "OPEN_CONFIGURATOR": {
      return { ...state, openConfigurator: action.value };
    }
    case "DIRECTION": {
      return { ...state, direction: action.value };
    }
    case "LAYOUT": {
      return { ...state, layout: action.value };
    }
    case "DARKMODE": {
      return { ...state, darkMode: action.value };
    }
    case "DARKMODE_PREFERENCE": {
      return { ...state, darkModePreference: action.value };
    }
    case "LOAD_PREFERENCES": {
      // Load multiple preferences at once (from Firestore)
      return { ...state, ...action.value };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

// Helper function to get system dark mode preference
function getSystemDarkMode() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

// Material Dashboard 3 PRO React context provider
function MaterialUIControllerProvider({ children }) {
  const initialState = {
    miniSidenav: false,
    transparentSidenav: false,
    whiteSidenav: true,
    sidenavColor: "info",
    transparentNavbar: true,
    fixedNavbar: true,
    openConfigurator: false,
    direction: "ltr",
    layout: "dashboard",
    darkMode: false,
    darkModePreference: "system", // "light", "dark", or "system"
  };

  const [controller, dispatch] = useReducer(reducer, initialState);

  // Listen for system dark mode changes and update darkMode + sidenav accordingly
  useEffect(() => {
    const updateDarkMode = () => {
      if (controller.darkModePreference === "system") {
        const systemDark = getSystemDarkMode();
        if (controller.darkMode !== systemDark) {
          dispatch({ type: "DARKMODE", value: systemDark });
          // Also sync sidenav type with system preference
          dispatch({ type: "WHITE_SIDENAV", value: !systemDark });
          dispatch({ type: "TRANSPARENT_SIDENAV", value: false });
        }
      }
    };

    // Initial check
    updateDarkMode();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (controller.darkModePreference === "system") {
        dispatch({ type: "DARKMODE", value: mediaQuery.matches });
        // Sync sidenav: white for light mode, dark for dark mode
        dispatch({ type: "WHITE_SIDENAV", value: !mediaQuery.matches });
        dispatch({ type: "TRANSPARENT_SIDENAV", value: false });
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [controller.darkModePreference, controller.darkMode]);

  const value = useMemo(() => [controller, dispatch], [controller, dispatch]);

  return <MaterialUI.Provider value={value}>{children}</MaterialUI.Provider>;
}

// Material Dashboard 3 PRO React custom hook for using context
function useMaterialUIController() {
  const context = useContext(MaterialUI);

  if (!context) {
    throw new Error(
      "useMaterialUIController should be used inside the MaterialUIControllerProvider."
    );
  }

  return context;
}

// Typechecking props for the MaterialUIControllerProvider
MaterialUIControllerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Context module functions
const setMiniSidenav = (dispatch, value) =>
  dispatch({ type: "MINI_SIDENAV", value });
const setTransparentSidenav = (dispatch, value) =>
  dispatch({ type: "TRANSPARENT_SIDENAV", value });
const setWhiteSidenav = (dispatch, value) =>
  dispatch({ type: "WHITE_SIDENAV", value });
const setSidenavColor = (dispatch, value) =>
  dispatch({ type: "SIDENAV_COLOR", value });
const setTransparentNavbar = (dispatch, value) =>
  dispatch({ type: "TRANSPARENT_NAVBAR", value });
const setFixedNavbar = (dispatch, value) =>
  dispatch({ type: "FIXED_NAVBAR", value });
const setOpenConfigurator = (dispatch, value) =>
  dispatch({ type: "OPEN_CONFIGURATOR", value });
const setDirection = (dispatch, value) =>
  dispatch({ type: "DIRECTION", value });
const setLayout = (dispatch, value) => dispatch({ type: "LAYOUT", value });
const setDarkMode = (dispatch, value) => dispatch({ type: "DARKMODE", value });

// Set dark mode preference ("light", "dark", or "system")
const setDarkModePreference = (dispatch, value) => {
  dispatch({ type: "DARKMODE_PREFERENCE", value });
  // Also update darkMode based on the new preference
  if (value === "system") {
    dispatch({ type: "DARKMODE", value: getSystemDarkMode() });
  } else {
    dispatch({ type: "DARKMODE", value: value === "dark" });
  }
};

// Load all preferences at once (from Firestore)
const loadPreferences = (dispatch, preferences) =>
  dispatch({ type: "LOAD_PREFERENCES", value: preferences });

// Save UI preferences to Firestore
const savePreferencesToFirestore = async (userId, preferences) => {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      uiPreferences: preferences,
    });
  } catch (error) {
    console.error("Error saving UI preferences:", error);
  }
};

export {
  MaterialUIControllerProvider,
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
  setSidenavColor,
  setTransparentNavbar,
  setFixedNavbar,
  setOpenConfigurator,
  setDirection,
  setLayout,
  setDarkMode,
  setDarkModePreference,
  loadPreferences,
  savePreferencesToFirestore,
  getSystemDarkMode,
};
