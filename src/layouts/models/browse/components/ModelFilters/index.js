/**
 * ModelFilters - Filter component for Browse Models page
 * Provides basic and advanced filtering options
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";

// MUI components
import Autocomplete from "@mui/material/Autocomplete";
import Collapse from "@mui/material/Collapse";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Location data
import { getCountries, getCities } from "countries-cities";
import ukCounties from "uk-counties-cities-towns";
import stateCities from "state-cities";

// Select data for gender, skills, languages
import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

// Measurement options
import measurementOptions from "components/Profile/Measurements";

function ModelFilters({ filters, onFiltersChange, onClearFilters }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [countries, setCountries] = useState([]);
  const [counties, setCounties] = useState([]);
  const [cities, setCities] = useState([]);

  // Initialize countries list
  useEffect(() => {
    const allCountries = getCountries();
    const priorityCountries = ["United Kingdom", "Italy", "Spain", "France", "Germany", "United States"];
    const sortedOthers = allCountries
      .filter((c) => !priorityCountries.includes(c))
      .sort((a, b) => a.localeCompare(b));
    setCountries([...priorityCountries, ...sortedOthers]);
  }, []);

  // Update counties/states when country changes
  useEffect(() => {
    if (filters.country === "United Kingdom") {
      setCounties(Object.keys(ukCounties).sort((a, b) => a.localeCompare(b)));
      setCities([]);
    } else if (filters.country === "United States") {
      setCounties(stateCities.getStates().sort((a, b) => a.localeCompare(b)));
      setCities([]);
    } else if (filters.country) {
      setCounties([]);
      const citiesList = getCities(filters.country) || [];
      setCities(citiesList.sort((a, b) => a.localeCompare(b)));
    } else {
      setCounties([]);
      setCities([]);
    }
  }, [filters.country]);

  // Update cities when county/state changes
  useEffect(() => {
    if (filters.country === "United Kingdom" && filters.county) {
      setCities(ukCounties[filters.county] || []);
    } else if (filters.country === "United States" && filters.county) {
      const citiesList = stateCities.getCities(filters.county) || [];
      setCities(citiesList.sort((a, b) => a.localeCompare(b)));
    }
  }, [filters.county, filters.country]);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };

    // Clear dependent fields when parent changes
    if (field === "country") {
      newFilters.county = "";
      newFilters.city = "";
    } else if (field === "county") {
      newFilters.city = "";
    }

    // Clear female-specific filters when gender changes to male/non-female
    if (field === "gender") {
      const isFemaleGender = !value || value === "Woman" || value === "Transwoman";
      if (!isFemaleGender) {
        newFilters.braSize = "";
        newFilters.dressSize = "";
        newFilters.hipsMin = "";
        newFilters.hipsMax = "";
      }
    }

    onFiltersChange(newFilters);
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== ""
  ).length;

  // Check if any advanced filters are active
  const hasAdvancedFilters =
    (filters.skills && filters.skills.length > 0) ||
    (filters.languages && filters.languages.length > 0) ||
    filters.heightMin ||
    filters.heightMax ||
    filters.waistMin ||
    filters.waistMax ||
    filters.hipsMin ||
    filters.hipsMax ||
    filters.braSize ||
    filters.dressSize;

  // Check if female-specific filters should be shown
  const showFemaleFilters =
    !filters.gender ||
    filters.gender === "Woman" ||
    filters.gender === "Transwoman";

  return (
    <MDBox>
      {/* Basic Filters */}
      <MDBox mb={2}>
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="info">filter_list</Icon>
            <MDTypography variant="h6" fontWeight="medium">
              Filters
            </MDTypography>
            {activeFilterCount > 0 && (
              <Chip
                label={activeFilterCount}
                size="small"
                color="info"
                sx={{ ml: 1, height: 20, fontSize: "0.75rem" }}
              />
            )}
          </MDBox>
          {activeFilterCount > 0 && (
            <MDButton
              variant="text"
              color="error"
              size="small"
              onClick={onClearFilters}
              startIcon={<Icon>clear</Icon>}
            >
              Clear All
            </MDButton>
          )}
        </MDBox>

        <Grid container spacing={2}>
          {/* Gender Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              value={filters.gender || null}
              options={selectData.gender}
              onChange={(_, value) => handleFilterChange("gender", value || "")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Gender"
                  placeholder="Any gender"
                  size="small"
                />
              )}
            />
          </Grid>

          {/* Country Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              value={filters.country || null}
              options={countries}
              onChange={(_, value) => handleFilterChange("country", value || "")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country"
                  placeholder="Any country"
                  size="small"
                />
              )}
            />
          </Grid>

          {/* County/State Filter (shown when UK or US is selected) */}
          {(filters.country === "United Kingdom" || filters.country === "United States") && (
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                value={filters.county || null}
                options={counties}
                onChange={(_, value) => handleFilterChange("county", value || "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={filters.country === "United Kingdom" ? "County" : "State"}
                    placeholder={`Any ${filters.country === "United Kingdom" ? "county" : "state"}`}
                    size="small"
                  />
                )}
              />
            </Grid>
          )}

          {/* City/Town Filter */}
          {(filters.country && cities.length > 0) && (
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                value={filters.city || null}
                options={cities}
                onChange={(_, value) => handleFilterChange("city", value || "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="City/Town"
                    placeholder="Any city"
                    size="small"
                  />
                )}
              />
            </Grid>
          )}
        </Grid>
      </MDBox>

      {/* Advanced Filters Toggle */}
      <MDBox
        display="flex"
        alignItems="center"
        sx={{ cursor: "pointer" }}
        onClick={() => setShowAdvanced(!showAdvanced)}
        mb={showAdvanced ? 2 : 0}
      >
        <MDTypography variant="button" color="info" fontWeight="medium">
          Advanced Filters
        </MDTypography>
        {hasAdvancedFilters && (
          <Chip
            label="Active"
            size="small"
            color="warning"
            sx={{ ml: 1, height: 18, fontSize: "0.65rem" }}
          />
        )}
        <IconButton size="small" color="info">
          <Icon>{showAdvanced ? "expand_less" : "expand_more"}</Icon>
        </IconButton>
      </MDBox>

      {/* Advanced Filters */}
      <Collapse in={showAdvanced}>
        <MDBox
          sx={{
            backgroundColor: "grey.100",
            borderRadius: 2,
            p: 2,
          }}
        >
          <Grid container spacing={2}>
            {/* Skills Filter */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                value={filters.skills || []}
                options={selectData.skills}
                onChange={(_, value) => handleFilterChange("skills", value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Skills/Categories"
                    placeholder="Select skills..."
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                      color="info"
                    />
                  ))
                }
              />
            </Grid>

            {/* Languages Filter */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                value={filters.languages || []}
                options={selectData.languages}
                onChange={(_, value) => handleFilterChange("languages", value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Languages Spoken"
                    placeholder="Select languages..."
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                      color="info"
                    />
                  ))
                }
              />
            </Grid>
          </Grid>

          {/* Measurement Filters */}
          <MDBox mt={2}>
            <MDTypography variant="button" fontWeight="medium" color="text" mb={1}>
              Measurements
            </MDTypography>
          </MDBox>
          <Grid container spacing={2} mt={0}>
            {/* Height Range */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                label="Height Min (cm)"
                value={filters.heightMin || ""}
                onChange={(e) => handleFilterChange("heightMin", e.target.value)}
                size="small"
                type="number"
                fullWidth
                placeholder="e.g. 160"
              />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                label="Height Max (cm)"
                value={filters.heightMax || ""}
                onChange={(e) => handleFilterChange("heightMax", e.target.value)}
                size="small"
                type="number"
                fullWidth
                placeholder="e.g. 180"
              />
            </Grid>

            {/* Waist Range */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                label="Waist Min (in)"
                value={filters.waistMin || ""}
                onChange={(e) => handleFilterChange("waistMin", e.target.value)}
                size="small"
                type="number"
                fullWidth
                placeholder="e.g. 24"
              />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                label="Waist Max (in)"
                value={filters.waistMax || ""}
                onChange={(e) => handleFilterChange("waistMax", e.target.value)}
                size="small"
                type="number"
                fullWidth
                placeholder="e.g. 32"
              />
            </Grid>

            {/* Hips Range - Female/Transwoman only */}
            {showFemaleFilters && (
              <>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    label="Hips Min (in)"
                    value={filters.hipsMin || ""}
                    onChange={(e) => handleFilterChange("hipsMin", e.target.value)}
                    size="small"
                    type="number"
                    fullWidth
                    placeholder="e.g. 34"
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    label="Hips Max (in)"
                    value={filters.hipsMax || ""}
                    onChange={(e) => handleFilterChange("hipsMax", e.target.value)}
                    size="small"
                    type="number"
                    fullWidth
                    placeholder="e.g. 42"
                  />
                </Grid>
              </>
            )}

            {/* Bra Size - Female/Transwoman only */}
            {showFemaleFilters && (
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  value={filters.braSize || null}
                  options={measurementOptions.braSizes}
                  onChange={(_, value) => handleFilterChange("braSize", value || "")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Bra Size"
                      placeholder="Any bra size"
                      size="small"
                    />
                  )}
                />
              </Grid>
            )}

            {/* Dress Size - Female/Transwoman only */}
            {showFemaleFilters && (
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  value={filters.dressSize || null}
                  options={measurementOptions.dressSizes}
                  onChange={(_, value) => handleFilterChange("dressSize", value || "")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Dress Size (UK)"
                      placeholder="Any dress size"
                      size="small"
                    />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </MDBox>
      </Collapse>
    </MDBox>
  );
}

ModelFilters.propTypes = {
  filters: PropTypes.shape({
    gender: PropTypes.string,
    country: PropTypes.string,
    county: PropTypes.string,
    city: PropTypes.string,
    skills: PropTypes.arrayOf(PropTypes.string),
    languages: PropTypes.arrayOf(PropTypes.string),
    heightMin: PropTypes.string,
    heightMax: PropTypes.string,
    waistMin: PropTypes.string,
    waistMax: PropTypes.string,
    hipsMin: PropTypes.string,
    hipsMax: PropTypes.string,
    braSize: PropTypes.string,
    dressSize: PropTypes.string,
  }).isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
};

export default ModelFilters;
