/**
 * ModelSelector - Autocomplete dropdown for admins to select a model
 * Fetches all models from Firestore and allows selection
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";

// MUI components
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

// Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "config/firebase";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

/**
 * Transform Cloudinary URL for avatar display
 */
const transformCloudinaryUrl = (url, size = 40) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_fill,g_face,w_${size},h_${size}/${parts[1]}`;
};

function ModelSelector({ onSelect, selectedModel, disabled }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "model")
        );
        const snapshot = await getDocs(q);
        const modelList = snapshot.docs.map((docSnap) => ({
          uid: docSnap.id,
          ...docSnap.data(),
        }));
        // Sort client-side to avoid needing a composite index
        modelList.sort((a, b) => {
          const nameA = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
          const nameB = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setModels(modelList);
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleChange = (event, newValue) => {
    onSelect(newValue);
  };

  const getOptionLabel = (option) => {
    if (!option) return "";
    const firstName = option.firstName || "";
    const lastName = option.lastName || "";
    return `${firstName} ${lastName}`.trim() || option.email || "Unknown";
  };

  const filterOptions = (options, { inputValue }) => {
    const searchTerm = inputValue.toLowerCase();
    return options.filter((option) => {
      const fullName = `${option.firstName || ""} ${option.lastName || ""}`.toLowerCase();
      const email = (option.email || "").toLowerCase();
      return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
  };

  return (
    <MDBox mb={3}>
      <MDTypography variant="h6" fontWeight="medium" mb={1}>
        Select Model
      </MDTypography>
      <MDTypography variant="body2" color="text" mb={2}>
        Choose a model to create or edit their Z-Card
      </MDTypography>

      <Autocomplete
        value={selectedModel}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
        options={models}
        getOptionLabel={getOptionLabel}
        filterOptions={filterOptions}
        loading={loading}
        disabled={disabled}
        isOptionEqualToValue={(option, value) => option?.uid === value?.uid}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search models by name or email"
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.uid}>
            <Avatar
              src={transformCloudinaryUrl(option.profileAvatar, 40)}
              alt={getOptionLabel(option)}
              sx={{ width: 40, height: 40, mr: 2 }}
            >
              {(option.firstName || "?")[0]}
            </Avatar>
            <Box>
              <MDTypography variant="button" fontWeight="medium">
                {getOptionLabel(option)}
              </MDTypography>
              {option.email && (
                <MDTypography variant="caption" color="text" display="block">
                  {option.email}
                </MDTypography>
              )}
            </Box>
          </Box>
        )}
        sx={{
          "& .MuiOutlinedInput-root": {
            padding: "8px 14px",
          },
        }}
      />

      {selectedModel && (
        <MDBox mt={2} display="flex" alignItems="center" p={2} borderRadius="lg" bgColor="grey-100">
          <Avatar
            src={transformCloudinaryUrl(selectedModel.profileAvatar, 60)}
            alt={getOptionLabel(selectedModel)}
            sx={{ width: 60, height: 60, mr: 2 }}
          >
            {(selectedModel.firstName || "?")[0]}
          </Avatar>
          <Box>
            <MDTypography variant="h6" fontWeight="medium">
              {getOptionLabel(selectedModel)}
            </MDTypography>
            {selectedModel.email && (
              <MDTypography variant="body2" color="text">
                {selectedModel.email}
              </MDTypography>
            )}
            {selectedModel.location && (
              <MDTypography variant="caption" color="text">
                {selectedModel.location}
              </MDTypography>
            )}
          </Box>
        </MDBox>
      )}
    </MDBox>
  );
}

ModelSelector.defaultProps = {
  selectedModel: null,
  disabled: false,
};

ModelSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  selectedModel: PropTypes.shape({
    uid: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    profileAvatar: PropTypes.string,
    location: PropTypes.string,
  }),
  disabled: PropTypes.bool,
};

export default ModelSelector;
