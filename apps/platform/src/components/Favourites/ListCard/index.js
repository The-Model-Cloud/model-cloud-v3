/**
 * ListCard - Card preview for a favourite list
 * Shows list title, model count, preview images, and actions
 */

import PropTypes from "prop-types";
import { Link } from "react-router-dom";

// MUI components
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AvatarGroup from "@mui/material/AvatarGroup";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function ListCard({ list, onShare, onDelete, onEdit, showOwnerBadge }) {
  const {
    id,
    title,
    description,
    models,
    modelCount,
    visibility,
    linkedJobTitle,
    ownerType,
    organisationName,
    teamName,
  } = list;

  // Get owner badge info
  const getOwnerBadge = () => {
    if (!showOwnerBadge) return null;
    switch (ownerType) {
      case "organisation":
        return {
          label: organisationName || "Organisation",
          icon: "business",
          color: "primary",
        };
      case "team":
        return {
          label: teamName || "Team",
          icon: "groups",
          color: "secondary",
        };
      default:
        return null; // Don't show badge for personal lists
    }
  };

  const ownerBadge = getOwnerBadge();

  // Get first 4 models for avatar preview
  const previewModels = (models || []).slice(0, 4);
  const remainingCount = Math.max(0, (modelCount || 0) - 4);

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShare) {
      onShare(list);
    }
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(list);
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(list);
    }
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
      case "public":
        return "public";
      case "authenticated":
        return "link";
      default:
        return "lock";
    }
  };

  const getVisibilityLabel = () => {
    switch (visibility) {
      case "public":
        return "Public";
      case "authenticated":
        return "Shared";
      default:
        return "Private";
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea
        component={Link}
        to={`/favourites/${id}`}
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        {/* Preview Images */}
        <MDBox
          p={2}
          pb={0}
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={100}
        >
          {previewModels.length > 0 ? (
            <AvatarGroup max={4}>
              {previewModels.map((model, index) => (
                <Avatar
                  key={model.uid || index}
                  src={model.profileAvatar}
                  alt={`${model.firstName || ""} ${model.lastName || ""}`}
                  sx={{ width: 48, height: 48 }}
                />
              ))}
              {remainingCount > 0 && (
                <Avatar sx={{ width: 48, height: 48, bgcolor: "grey.300" }}>
                  +{remainingCount}
                </Avatar>
              )}
            </AvatarGroup>
          ) : (
            <MDBox
              display="flex"
              alignItems="center"
              justifyContent="center"
              width={80}
              height={80}
              borderRadius="50%"
              sx={{ backgroundColor: "grey.100" }}
            >
              <Icon sx={{ fontSize: 32, color: "grey.400" }}>folder_open</Icon>
            </MDBox>
          )}
        </MDBox>

        {/* List Info */}
        <MDBox p={2} flexGrow={1}>
          <MDTypography
            variant="h6"
            fontWeight="medium"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </MDTypography>

          {description && (
            <MDTypography
              variant="caption"
              color="text"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                mt: 0.5,
              }}
            >
              {description}
            </MDTypography>
          )}

          <MDBox display="flex" alignItems="center" gap={1} mt={1} flexWrap="wrap">
            <MDTypography variant="caption" color="text">
              {modelCount || 0} {modelCount === 1 ? "model" : "models"}
            </MDTypography>

            <Tooltip title={getVisibilityLabel()}>
              <Icon sx={{ fontSize: 16, color: "grey.500" }}>
                {getVisibilityIcon()}
              </Icon>
            </Tooltip>

            {ownerBadge && (
              <Chip
                label={ownerBadge.label}
                size="small"
                color={ownerBadge.color}
                icon={<Icon fontSize="small">{ownerBadge.icon}</Icon>}
                sx={{ maxWidth: 120, height: 20, "& .MuiChip-label": { px: 0.5, fontSize: "0.65rem" } }}
              />
            )}

            {linkedJobTitle && (
              <Chip
                label={linkedJobTitle}
                size="small"
                icon={<Icon fontSize="small">work</Icon>}
                sx={{ maxWidth: 120 }}
              />
            )}
          </MDBox>
        </MDBox>
      </CardActionArea>

      {/* Actions */}
      <MDBox
        display="flex"
        justifyContent="flex-end"
        gap={0.5}
        px={1}
        pb={1}
        borderTop="1px solid"
        borderColor="grey.200"
        pt={1}
      >
        {onEdit && (
          <Tooltip title="Edit list">
            <IconButton size="small" onClick={handleEditClick}>
              <Icon fontSize="small">edit</Icon>
            </IconButton>
          </Tooltip>
        )}
        {onShare && (
          <Tooltip title="Share list">
            <IconButton size="small" onClick={handleShareClick}>
              <Icon fontSize="small" color="info">share</Icon>
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Delete list">
            <IconButton size="small" onClick={handleDeleteClick}>
              <Icon fontSize="small" color="error">delete</Icon>
            </IconButton>
          </Tooltip>
        )}
      </MDBox>
    </Card>
  );
}

ListCard.defaultProps = {
  onShare: null,
  onDelete: null,
  onEdit: null,
  showOwnerBadge: false,
};

ListCard.propTypes = {
  list: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    models: PropTypes.arrayOf(
      PropTypes.shape({
        uid: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        profileAvatar: PropTypes.string,
      })
    ),
    modelCount: PropTypes.number,
    visibility: PropTypes.oneOf(["private", "authenticated", "public"]),
    linkedJobTitle: PropTypes.string,
    ownerType: PropTypes.oneOf(["user", "organisation", "team"]),
    organisationName: PropTypes.string,
    teamName: PropTypes.string,
  }).isRequired,
  onShare: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  showOwnerBadge: PropTypes.bool,
};

export default ListCard;
