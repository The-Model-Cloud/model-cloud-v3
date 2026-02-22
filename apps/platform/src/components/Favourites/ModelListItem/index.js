/**
 * ModelListItem - List/row view for displaying a model
 * Used as an alternative to ModelCard in list view mode
 */

import PropTypes from "prop-types";
import { Link } from "react-router-dom";

// @mui material components
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Default avatar placeholder
const DEFAULT_AVATAR = "https://via.placeholder.com/100x100?text=?";

// Transform Cloudinary URL to use face-cropping
const transformCloudinary = (url, size = 56) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  return `${parts[0]}/upload/c_thumb,g_face,w_${size},h_${size}/${parts[1]}`;
};

function ModelListItem({
  model,
  isFavourited,
  onFavouriteToggle,
  onAddToList,
  showActions,
  showRemoveButton,
  onRemove,
  showDeleteButton,
  onDelete,
  isHidden,
  isUnverified,
}) {
  const {
    uid,
    firstName,
    lastName,
    profileAvatar,
    location,
    rate,
    publicSlug,
  } = model;

  const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Unknown Model";
  const displayLocation = location || "Location not set";
  const displayRate = rate ? `$${rate}/hr` : "-";
  const profileLink = publicSlug ? `/${publicSlug}` : `/profile/${uid}`;

  const handleFavouriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavouriteToggle) {
      onFavouriteToggle(uid);
    }
  };

  const handleAddToListClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToList) {
      onAddToList(model);
    }
  };

  const handleRemoveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(uid);
    }
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(model);
    }
  };

  return (
    <MDBox
      component={Link}
      to={profileLink}
      sx={{
        display: "flex",
        alignItems: "center",
        p: 2,
        borderRadius: "lg",
        backgroundColor: "white",
        textDecoration: "none",
        transition: "background-color 0.2s, box-shadow 0.2s",
        "&:hover": {
          backgroundColor: "grey.50",
          boxShadow: 1,
        },
      }}
    >
      {/* Avatar */}
      <Avatar
        src={transformCloudinary(profileAvatar) || DEFAULT_AVATAR}
        alt={fullName}
        sx={{
          width: 56,
          height: 56,
          mr: 2,
        }}
      />

      {/* Model info */}
      <MDBox flex={1} minWidth={0}>
        <MDBox display="flex" alignItems="center" gap={1}>
          <MDTypography
            variant="body1"
            fontWeight="medium"
            color="dark"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fullName}
          </MDTypography>
          {isHidden && (
            <Chip
              label="HIDDEN"
              size="small"
              icon={<Icon sx={{ fontSize: "14px !important" }}>visibility_off</Icon>}
              sx={{
                backgroundColor: "warning.main",
                color: "white",
                fontWeight: "bold",
                fontSize: "0.65rem",
                height: 22,
                "& .MuiChip-icon": { color: "white" },
              }}
            />
          )}
          {isUnverified && !isHidden && (
            <Chip
              label="UNVERIFIED"
              size="small"
              icon={<Icon sx={{ fontSize: "14px !important" }}>gpp_maybe</Icon>}
              sx={{
                backgroundColor: "error.main",
                color: "white",
                fontWeight: "bold",
                fontSize: "0.65rem",
                height: 22,
                "& .MuiChip-icon": { color: "white" },
              }}
            />
          )}
        </MDBox>

        <MDBox display="flex" alignItems="center" mt={0.5}>
          <Icon fontSize="small" sx={{ color: "text.secondary", mr: 0.5 }}>
            place
          </Icon>
          <MDTypography
            variant="caption"
            color="text"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayLocation}
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Rate */}
      <MDBox mx={2} minWidth={80} textAlign="right">
        <MDTypography variant="body2" fontWeight="medium" color="info">
          {displayRate}
        </MDTypography>
      </MDBox>

      {/* Actions */}
      {showActions && (
        <MDBox display="flex" gap={0.5}>
          <Tooltip title={isFavourited ? "Remove from favourites" : "Add to favourites"}>
            <IconButton size="small" onClick={handleFavouriteClick}>
              <Icon
                sx={{
                  color: isFavourited ? "#f44336" : "#9e9e9e",
                }}
              >
                {isFavourited ? "favorite" : "favorite_border"}
              </Icon>
            </IconButton>
          </Tooltip>

          <Tooltip title="Add to list">
            <IconButton size="small" onClick={handleAddToListClick}>
              <Icon sx={{ color: "#1976d2" }}>playlist_add</Icon>
            </IconButton>
          </Tooltip>

          {showDeleteButton && (
            <Tooltip title="Delete model">
              <IconButton size="small" onClick={handleDeleteClick}>
                <Icon sx={{ color: "#d32f2f" }}>delete</Icon>
              </IconButton>
            </Tooltip>
          )}
        </MDBox>
      )}

      {/* Remove button */}
      {showRemoveButton && (
        <Tooltip title="Remove from list">
          <IconButton size="small" onClick={handleRemoveClick}>
            <Icon sx={{ color: "#f44336" }}>close</Icon>
          </IconButton>
        </Tooltip>
      )}
    </MDBox>
  );
}

ModelListItem.defaultProps = {
  isFavourited: false,
  onFavouriteToggle: null,
  onAddToList: null,
  showActions: true,
  showRemoveButton: false,
  onRemove: null,
  showDeleteButton: false,
  onDelete: null,
  isHidden: false,
  isUnverified: false,
};

ModelListItem.propTypes = {
  model: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    profileAvatar: PropTypes.string,
    location: PropTypes.string,
    rate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    publicSlug: PropTypes.string,
  }).isRequired,
  isFavourited: PropTypes.bool,
  onFavouriteToggle: PropTypes.func,
  onAddToList: PropTypes.func,
  showActions: PropTypes.bool,
  showRemoveButton: PropTypes.bool,
  onRemove: PropTypes.func,
  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  isHidden: PropTypes.bool,
  isUnverified: PropTypes.bool,
};

export default ModelListItem;
