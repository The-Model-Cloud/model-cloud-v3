/**
 * ChangeLocationDialog - Dialog for changing a user's location (Admin only)
 * Uses the same location dropdowns as BasicInfo component
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Import countries and cities packages (same as BasicInfo)
import { getCountries, getCities } from "countries-cities";
import ukCounties from "uk-counties-cities-towns";
import stateCities from "state-cities";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 520,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

// Build countries list with priority countries at top
const buildCountriesList = () => {
  const allCountries = getCountries();
  const priorityCountries = ["United Kingdom", "Italy", "Spain", "France", "Germany", "United States"];
  const sortedOthers = allCountries
    .filter((c) => !priorityCountries.includes(c))
    .sort((a, b) => a.localeCompare(b));
  return [...priorityCountries, "────────", ...sortedOthers];
};

const COUNTRIES_LIST = buildCountriesList();

function ChangeLocationDialog({
  open,
  onClose,
  onConfirm,
  user,
  loading,
  error,
}) {
  const [country, setCountry] = useState("");
  const [county, setCounty] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState([]);
  const [validationError, setValidationError] = useState("");

  // Reset state when user changes or dialog opens
  useEffect(() => {
    if (open && user) {
      setCountry(user.country || "");
      setCounty(user.county || "");
      setState(user.state || "");
      setCity(user.city || "");
      setValidationError("");

      // Initialize cities based on current selection
      if (user.country === "United Kingdom" && user.county) {
        setCities(ukCounties[user.county] || []);
      } else if (user.country === "United States" && user.state) {
        setCities((stateCities.getCities(user.state) || []).sort((a, b) => a.localeCompare(b)));
      } else if (user.country) {
        setCities((getCities(user.country) || []).sort((a, b) => a.localeCompare(b)));
      } else {
        setCities([]);
      }
    }
  }, [open, user]);

  // Handle country change
  const handleCountryChange = (event, value) => {
    if (!value || value === "────────") {
      setCountry("");
      setCounty("");
      setState("");
      setCity("");
      setCities([]);
      return;
    }

    setCountry(value);
    setCounty("");
    setState("");
    setCity("");

    if (value === "United Kingdom") {
      setCities([]); // Wait for county selection
    } else if (value === "United States") {
      setCities([]); // Wait for state selection
    } else {
      setCities((getCities(value) || []).sort((a, b) => a.localeCompare(b)));
    }
  };

  // Handle UK county change
  const handleCountyChange = (event, value) => {
    setCounty(value || "");
    setCity("");
    setCities(ukCounties[value] || []);
  };

  // Handle US state change
  const handleStateChange = (event, value) => {
    setState(value || "");
    setCity("");
    setCities((stateCities.getCities(value) || []).sort((a, b) => a.localeCompare(b)));
  };

  // Handle city change
  const handleCityChange = (event, value) => {
    setCity(value || "");
  };

  // Build location string for display
  const buildLocationString = () => {
    const parts = [];
    if (city) parts.push(city);
    if (country === "United Kingdom" && county) parts.push(county);
    if (country === "United States" && state) parts.push(state);
    if (country) parts.push(country);
    return parts.join(", ");
  };

  // Validate and submit
  const handleSubmit = () => {
    // Build the location display string
    const locationString = buildLocationString();

    // Check if anything has changed
    const hasChanged =
      country !== (user?.country || "") ||
      county !== (user?.county || "") ||
      state !== (user?.state || "") ||
      city !== (user?.city || "");

    if (!hasChanged) {
      setValidationError("No changes detected");
      return;
    }

    setValidationError("");
    onConfirm({
      location: locationString,
      city,
      county,
      state,
      country,
    });
  };

  if (!user) return null;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || "Unknown User";
  const email = user.email || "No email";

  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <Box sx={modalStyle}>
        {/* Header */}
        <MDBox display="flex" alignItems="center" mb={3}>
          <Icon sx={{ color: "#1976d2", fontSize: 28, mr: 1 }}>location_on</Icon>
          <MDTypography variant="h5">
            Change Location
          </MDTypography>
        </MDBox>

        {/* User info */}
        <MDBox mb={3}>
          <MDTypography variant="body2" color="text">
            Changing location for:
          </MDTypography>
          <MDTypography variant="h6" fontWeight="medium">
            {fullName}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {email}
          </MDTypography>
        </MDBox>

        {/* Country dropdown */}
        <MDBox mb={2}>
          <Autocomplete
            value={country}
            options={COUNTRIES_LIST}
            onChange={handleCountryChange}
            getOptionDisabled={(option) => option === "────────"}
            disabled={loading}
            renderOption={(props, option) =>
              option === "────────" ? (
                <li {...props} style={{ fontStyle: "italic", opacity: 0.5 }}>
                  ────────
                </li>
              ) : (
                <li {...props}>{option}</li>
              )
            }
            renderInput={(params) => (
              <TextField {...params} label="Country" size="small" />
            )}
          />
        </MDBox>

        {/* UK County dropdown */}
        {country === "United Kingdom" && (
          <MDBox mb={2}>
            <Autocomplete
              value={county}
              options={Object.keys(ukCounties).sort((a, b) => a.localeCompare(b))}
              onChange={handleCountyChange}
              disabled={loading}
              renderInput={(params) => (
                <TextField {...params} label="County" size="small" />
              )}
            />
          </MDBox>
        )}

        {/* US State dropdown */}
        {country === "United States" && (
          <MDBox mb={2}>
            <Autocomplete
              value={state}
              options={stateCities.getStates().sort((a, b) => a.localeCompare(b))}
              onChange={handleStateChange}
              disabled={loading}
              renderInput={(params) => (
                <TextField {...params} label="State" size="small" />
              )}
            />
          </MDBox>
        )}

        {/* City/Town dropdown */}
        {cities.length > 0 && (
          <MDBox mb={3}>
            <Autocomplete
              value={city}
              options={cities}
              onChange={handleCityChange}
              disabled={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={country === "United Kingdom" ? "City/Town" : "City"}
                  size="small"
                />
              )}
            />
          </MDBox>
        )}

        {/* Preview of location string */}
        {buildLocationString() && (
          <MDBox mb={3} p={2} sx={{ backgroundColor: "grey.100", borderRadius: 1 }}>
            <MDTypography variant="caption" color="text">
              Location will be saved as:
            </MDTypography>
            <MDTypography variant="body2" fontWeight="medium">
              {buildLocationString()}
            </MDTypography>
          </MDBox>
        )}

        {/* Validation error */}
        {validationError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}

        {/* API error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Action buttons */}
        <MDBox display="flex" justifyContent="flex-end" gap={2}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Icon>save</Icon>
              )
            }
          >
            {loading ? "Updating..." : "Update Location"}
          </MDButton>
        </MDBox>
      </Box>
    </Modal>
  );
}

ChangeLocationDialog.defaultProps = {
  user: null,
  loading: false,
  error: null,
};

ChangeLocationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  user: PropTypes.shape({
    uid: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    location: PropTypes.string,
    city: PropTypes.string,
    county: PropTypes.string,
    state: PropTypes.string,
    country: PropTypes.string,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default ChangeLocationDialog;
