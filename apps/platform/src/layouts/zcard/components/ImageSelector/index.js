/**
 * ImageSelector - Grid component for selecting images from a model's portfolio
 * Used in Z-Card builder for selecting main and grid images
 */

import { useState } from "react";
import PropTypes from "prop-types";

// MUI components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";

// MUI icons
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

/**
 * Transform Cloudinary URL for optimized thumbnail display
 */
const transformCloudinaryUrl = (url, width = 300, height = 300) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_fill,g_face,w_${width},h_${height}/${parts[1]}`;
};

function ImageSelector({
  images,
  selectedImages,
  onSelect,
  maxSelect,
  disabled,
  title,
  subtitle,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const handleImageClick = (imageUrl) => {
    if (disabled) return;

    const isSelected = selectedImages.includes(imageUrl);

    if (isSelected) {
      // Deselect the image
      onSelect(selectedImages.filter((img) => img !== imageUrl));
    } else {
      // Select the image (if under max)
      if (selectedImages.length < maxSelect) {
        onSelect([...selectedImages, imageUrl]);
      } else if (maxSelect === 1) {
        // For single selection, replace
        onSelect([imageUrl]);
      }
    }
  };

  const isSelected = (imageUrl) => selectedImages.includes(imageUrl);
  const selectionIndex = (imageUrl) => selectedImages.indexOf(imageUrl) + 1;

  if (!images || images.length === 0) {
    return (
      <MDBox py={3} textAlign="center">
        <MDTypography variant="body2" color="text">
          No images available. Please upload portfolio or digital images first.
        </MDTypography>
      </MDBox>
    );
  }

  return (
    <MDBox>
      {title && (
        <MDBox mb={2}>
          <MDTypography variant="h6" fontWeight="medium">
            {title}
          </MDTypography>
          {subtitle && (
            <MDTypography variant="body2" color="text">
              {subtitle}
            </MDTypography>
          )}
        </MDBox>
      )}

      <Grid container spacing={2}>
        {images.map((imageUrl, index) => {
          const selected = isSelected(imageUrl);
          const selIndex = selectionIndex(imageUrl);

          return (
            <Grid item xs={6} sm={4} md={3} lg={2} key={imageUrl || index}>
              <Card
                sx={{
                  position: "relative",
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  transition: "all 0.2s ease-in-out",
                  border: selected ? "3px solid" : "3px solid transparent",
                  borderColor: selected ? "info.main" : "transparent",
                  "&:hover": {
                    transform: disabled ? "none" : "scale(1.02)",
                    boxShadow: disabled ? 1 : 4,
                  },
                }}
                onClick={() => handleImageClick(imageUrl)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <CardMedia
                  component="img"
                  image={transformCloudinaryUrl(imageUrl, 300, 300)}
                  alt={`Image ${index + 1}`}
                  sx={{
                    aspectRatio: "1",
                    objectFit: "cover",
                  }}
                />

                {/* Selection indicator */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 2,
                  }}
                >
                  {selected ? (
                    <Box
                      sx={{
                        backgroundColor: "info.main",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                      }}
                    >
                      {maxSelect > 1 ? selIndex : <CheckCircleIcon fontSize="small" />}
                    </Box>
                  ) : (
                    hoveredIndex === index &&
                    !disabled && (
                      <RadioButtonUncheckedIcon
                        sx={{
                          color: "white",
                          backgroundColor: "rgba(0,0,0,0.3)",
                          borderRadius: "50%",
                        }}
                      />
                    )
                  )}
                </Box>

                {/* Hover overlay */}
                {hoveredIndex === index && !selected && !disabled && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.1)",
                      transition: "all 0.2s ease-in-out",
                    }}
                  />
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Selection count */}
      <MDBox mt={2}>
        <MDTypography variant="caption" color="text">
          {selectedImages.length} of {maxSelect} selected
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}

ImageSelector.defaultProps = {
  selectedImages: [],
  maxSelect: 1,
  disabled: false,
  title: null,
  subtitle: null,
};

ImageSelector.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedImages: PropTypes.arrayOf(PropTypes.string),
  onSelect: PropTypes.func.isRequired,
  maxSelect: PropTypes.number,
  disabled: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

export default ImageSelector;
