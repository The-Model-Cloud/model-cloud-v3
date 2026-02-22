/**
 * FavouriteButton - Standalone heart button for favouriting models
 * Can be used anywhere a quick favourite toggle is needed
 */

import PropTypes from "prop-types";
import { useState } from "react";

// @mui material components
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";

// Context
import { useFavourites } from "context/FavouritesContext";

function FavouriteButton({
  modelUid,
  size,
  showTooltip,
  variant,
  onToggle,
}) {
  const { isModelFavourited, toggleQuickFavourite } = useFavourites();
  const [loading, setLoading] = useState(false);

  const isFavourited = isModelFavourited(modelUid);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    try {
      const newState = await toggleQuickFavourite(modelUid);
      if (onToggle) {
        onToggle(newState);
      }
    } catch (error) {
      console.error("Failed to toggle favourite:", error);
    } finally {
      setLoading(false);
    }
  };

  const tooltipTitle = isFavourited ? "Remove from favourites" : "Add to favourites";

  const buttonSx = {
    ...(variant === "outlined" && {
      border: "1px solid",
      borderColor: isFavourited ? "error.main" : "grey.400",
      "&:hover": {
        borderColor: isFavourited ? "error.dark" : "grey.600",
      },
    }),
    ...(variant === "contained" && {
      backgroundColor: isFavourited ? "error.light" : "grey.100",
      "&:hover": {
        backgroundColor: isFavourited ? "error.main" : "grey.200",
      },
    }),
  };

  const iconSx = {
    color: isFavourited ? "#f44336" : "#9e9e9e",
    fontSize: size === "small" ? "18px" : size === "large" ? "28px" : "22px",
  };

  const button = (
    <IconButton
      size={size}
      onClick={handleClick}
      disabled={loading}
      sx={buttonSx}
    >
      {loading ? (
        <CircularProgress size={size === "small" ? 16 : 20} />
      ) : (
        <Icon sx={iconSx}>
          {isFavourited ? "favorite" : "favorite_border"}
        </Icon>
      )}
    </IconButton>
  );

  if (showTooltip) {
    return (
      <Tooltip title={tooltipTitle}>
        {button}
      </Tooltip>
    );
  }

  return button;
}

FavouriteButton.defaultProps = {
  size: "medium",
  showTooltip: true,
  variant: "default",
  onToggle: null,
};

FavouriteButton.propTypes = {
  modelUid: PropTypes.string.isRequired,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  showTooltip: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "outlined", "contained"]),
  onToggle: PropTypes.func,
};

export default FavouriteButton;
