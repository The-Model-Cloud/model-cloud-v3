/**
 * ImagePositioner - Allows users to adjust image focal point by clicking/dragging
 * Shows a preview of the image with crosshairs indicating the current focal point
 */

import { useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";

// MUI components
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

/**
 * Transform Cloudinary URL for display
 */
const transformCloudinaryUrl = (url, size = 200) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_fill,w_${size},h_${size}/${parts[1]}`;
};

function ImagePositioner({ image, position, onChange, label }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePositionUpdate = useCallback(
    (clientX, clientY) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      onChange({ x: Math.round(x), y: Math.round(y) });
    },
    [onChange]
  );

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    handlePositionUpdate(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handlePositionUpdate(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    handlePositionUpdate(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    handlePositionUpdate(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetPosition = () => {
    onChange({ x: 50, y: 50 });
  };

  if (!image) {
    return null;
  }

  return (
    <MDBox mb={2}>
      {label && (
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <MDTypography variant="caption" color="text">
            {label}
          </MDTypography>
          <Tooltip title="Reset to center">
            <IconButton size="small" onClick={resetPosition}>
              <Icon fontSize="small">center_focus_strong</Icon>
            </IconButton>
          </Tooltip>
        </MDBox>
      )}
      <Box
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "1/1",
          maxWidth: 150,
          borderRadius: 1,
          overflow: "hidden",
          cursor: "crosshair",
          border: "2px solid",
          borderColor: isDragging ? "info.main" : "grey.300",
          transition: "border-color 0.2s",
          userSelect: "none",
        }}
      >
        {/* Image */}
        <Box
          component="img"
          src={transformCloudinaryUrl(image, 200)}
          alt="Position preview"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${position.x}% ${position.y}%`,
            pointerEvents: "none",
          }}
        />

        {/* Crosshair overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          {/* Horizontal line */}
          <Box
            sx={{
              position: "absolute",
              top: `${position.y}%`,
              left: 0,
              right: 0,
              height: "1px",
              backgroundColor: "rgba(255,255,255,0.8)",
              boxShadow: "0 0 2px rgba(0,0,0,0.5)",
            }}
          />
          {/* Vertical line */}
          <Box
            sx={{
              position: "absolute",
              left: `${position.x}%`,
              top: 0,
              bottom: 0,
              width: "1px",
              backgroundColor: "rgba(255,255,255,0.8)",
              boxShadow: "0 0 2px rgba(0,0,0,0.5)",
            }}
          />
          {/* Center dot */}
          <Box
            sx={{
              position: "absolute",
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: "translate(-50%, -50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "info.main",
              border: "2px solid white",
              boxShadow: "0 0 4px rgba(0,0,0,0.5)",
            }}
          />
        </Box>
      </Box>
      <MDTypography variant="caption" color="text" sx={{ mt: 0.5, display: "block" }}>
        Click or drag to adjust focal point
      </MDTypography>
    </MDBox>
  );
}

ImagePositioner.defaultProps = {
  position: { x: 50, y: 50 },
  label: null,
};

ImagePositioner.propTypes = {
  image: PropTypes.string.isRequired,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export default ImagePositioner;
