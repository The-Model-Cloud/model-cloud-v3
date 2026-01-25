/**
 * ModelCard - Card view for displaying a model with their headshot, name, location, and rate
 * Used in favourites lists and browse models pages
 */

import PropTypes from "prop-types";
import { Link } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Default avatar placeholder
const DEFAULT_AVATAR = "https://via.placeholder.com/300x400?text=No+Photo";

function ModelCard({
  model,
  isFavourited,
  onFavouriteToggle,
  onAddToList,
  showActions,
  showRemoveButton,
  onRemove,
  showDeleteButton,
  onDelete,
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
  const displayRate = rate ? `$${rate}/hr` : null;
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
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 6,
        },
      }}
    >
      {/* Action buttons overlay */}
      {showActions && (
        <MDBox
          position="absolute"
          top={8}
          right={8}
          zIndex={2}
          display="flex"
          gap={0.5}
        >
          <Tooltip title={isFavourited ? "Remove from favourites" : "Add to favourites"}>
            <IconButton
              size="small"
              onClick={handleFavouriteClick}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
              }}
            >
              <Icon
                sx={{
                  color: isFavourited ? "#f44336" : "#9e9e9e",
                  fontSize: "20px",
                }}
              >
                {isFavourited ? "favorite" : "favorite_border"}
              </Icon>
            </IconButton>
          </Tooltip>

          <Tooltip title="Add to list">
            <IconButton
              size="small"
              onClick={handleAddToListClick}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
              }}
            >
              <Icon sx={{ color: "#1976d2", fontSize: "20px" }}>playlist_add</Icon>
            </IconButton>
          </Tooltip>

          {showDeleteButton && (
            <Tooltip title="Delete model">
              <IconButton
                size="small"
                onClick={handleDeleteClick}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 1)",
                  },
                }}
              >
                <Icon sx={{ color: "#d32f2f", fontSize: "20px" }}>delete</Icon>
              </IconButton>
            </Tooltip>
          )}
        </MDBox>
      )}

      {/* Remove button for list view */}
      {showRemoveButton && (
        <MDBox
          position="absolute"
          top={8}
          right={8}
          zIndex={2}
        >
          <Tooltip title="Remove from list">
            <IconButton
              size="small"
              onClick={handleRemoveClick}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
              }}
            >
              <Icon sx={{ color: "#f44336", fontSize: "20px" }}>close</Icon>
            </IconButton>
          </Tooltip>
        </MDBox>
      )}

      {/* Clickable card area */}
      <CardActionArea
        component={Link}
        to={profileLink}
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        {/* Profile image */}
        <MDBox
          component="img"
          src={profileAvatar || DEFAULT_AVATAR}
          alt={fullName}
          sx={{
            width: "100%",
            height: 280,
            objectFit: "cover",
            objectPosition: "top center",
          }}
        />

        {/* Model info */}
        <MDBox p={2} sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          <MDTypography
            variant="h6"
            fontWeight="medium"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fullName}
          </MDTypography>

          <MDBox
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mt={1}
          >
            <MDBox display="flex" alignItems="center" color="text">
              <Icon fontSize="small" sx={{ mr: 0.5 }}>place</Icon>
              <MDTypography
                variant="caption"
                color="text"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "120px",
                }}
              >
                {displayLocation}
              </MDTypography>
            </MDBox>

            {displayRate && (
              <MDTypography variant="body2" fontWeight="medium" color="info">
                {displayRate}
              </MDTypography>
            )}
          </MDBox>
        </MDBox>
      </CardActionArea>
    </Card>
  );
}

ModelCard.defaultProps = {
  isFavourited: false,
  onFavouriteToggle: null,
  onAddToList: null,
  showActions: true,
  showRemoveButton: false,
  onRemove: null,
  showDeleteButton: false,
  onDelete: null,
};

ModelCard.propTypes = {
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
};

export default ModelCard;
