/**
 * ZCardPreview - Renders the Z-Card layout matching the comp card design
 *
 * Landscape Layout:
 * +---------------------------+-------------+-------------+
 * |                           |   Image 1   |   Image 2   |
 * |     Main Image            +-------------+-------------+
 * |     (FIRSTNAME overlay)   |   Image 3   |   Image 4   |
 * +---------------------------+-------------+-------------+
 * | HEIGHT / BUST / WAIST / HIPS / SHOE      //the model  |
 * | DRESS UK6                                   .cloud    |
 * +--------------------------------------+----------------+
 * |                           contact info                |
 * +-------------------------------------------------------+
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";

// MUI components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Logo
import logo2020Square from "assets/images/logos/2020-square.png";

/**
 * Transform Cloudinary URL for display
 */
const transformCloudinaryUrl = (url, width = 600, height = 800) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_fill,g_face,w_${width},h_${height}/${parts[1]}`;
};

/**
 * Convert height in cm to feet and inches
 */
const formatHeight = (heightCm) => {
  if (!heightCm) return null;
  const cm = parseFloat(heightCm);
  if (isNaN(cm)) return heightCm;

  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
};

/**
 * Placeholder image component
 */
const PlaceholderImage = ({ text }) => (
  <Box
    sx={{
      width: "100%",
      height: "100%",
      backgroundColor: "grey.200",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "grey.500",
    }}
  >
    <Typography variant="body2">{text || "Select Image"}</Typography>
  </Box>
);

PlaceholderImage.propTypes = {
  text: PropTypes.string,
};

PlaceholderImage.defaultProps = {
  text: "Select Image",
};

// Font size presets for the name
const NAME_SIZES = {
  small: { normal: "2.5rem", compact: "1.25rem" },
  medium: { normal: "3.5rem", compact: "1.75rem" },
  large: { normal: "4.5rem", compact: "2.25rem" },
  "extra-large": { normal: "5.5rem", compact: "2.75rem" },
  xxl: { normal: "6.5rem", compact: "3.25rem" },
};

const ZCardPreview = forwardRef(({
  model,
  mainImage,
  gridImages,
  measurements,
  creatorEmail,
  creatorPhone,
  compact,
  nameColor = "white",
  nameSize = "medium",
  mainImagePosition = { x: 50, y: 50 },
  gridImagePositions = [],
}, ref) => {
  // Get font size based on nameSize prop
  const fontSize = NAME_SIZES[nameSize] || NAME_SIZES.medium;

  // Get position for grid image (default to center)
  const getGridPosition = (index) => {
    const pos = gridImagePositions[index];
    return pos ? `${pos.x}% ${pos.y}%` : "50% 50%";
  };

  // Build measurements display
  const measurementItems = [];

  if (measurements?.height) {
    measurementItems.push(`HEIGHT ${formatHeight(measurements.height)}`);
  }
  if (measurements?.braSize || measurements?.bust) {
    measurementItems.push(`BUST ${measurements.braSize || measurements.bust}`);
  }
  if (measurements?.waist) {
    measurementItems.push(`WAIST ${measurements.waist}`);
  }
  if (measurements?.hips) {
    measurementItems.push(`HIPS ${measurements.hips}`);
  }
  if (measurements?.shoeSize) {
    measurementItems.push(`SHOE ${measurements.shoeSize}`);
  }

  const dressSize = measurements?.dressSize ? `DRESS UK${measurements.dressSize}` : null;

  const modelName = model?.firstName?.toUpperCase() || "MODEL NAME";

  // Contact info
  const contactParts = [];
  if (creatorEmail) contactParts.push(creatorEmail);
  if (creatorPhone) contactParts.push(creatorPhone);
  const contactInfo = contactParts.join(" / ");

  return (
    <Box
      ref={ref}
      sx={{
        width: "100%",
        maxWidth: compact ? 600 : 1000,
        backgroundColor: "white",
        boxShadow: 3,
        overflow: "hidden",
        mx: "auto",
      }}
    >
      {/* Main content area - landscape aspect ratio */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          aspectRatio: "4/3", // Landscape aspect ratio
        }}
      >
        {/* Main Image (Left - 50% width) */}
        <Box
          sx={{
            width: "50%",
            position: "relative",
            height: "100%",
          }}
        >
          {mainImage ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                backgroundImage: `url(${transformCloudinaryUrl(mainImage, 800, 1000)})`,
                backgroundSize: "cover",
                backgroundPosition: `${mainImagePosition.x}% ${mainImagePosition.y}%`,
                backgroundRepeat: "no-repeat",
              }}
              role="img"
              aria-label={modelName}
            />
          ) : (
            <PlaceholderImage text="Main Image" />
          )}

          {/* Name overlay */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              py: compact ? 1.5 : 3,
              px: compact ? 2 : 4,
              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            }}
          >
            <Typography
              sx={{
                color: nameColor === "black" ? "#000000" : "#FFFFFF",
                fontWeight: 700,
                fontSize: compact ? fontSize.compact : fontSize.normal,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                lineHeight: 1,
                textShadow: nameColor === "black"
                  ? "0 0 8px rgba(255,255,255,0.9), 1px 1px 2px rgba(255,255,255,0.8)"
                  : "0 0 8px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.6)",
                WebkitTextStroke: nameColor === "black" ? "0.5px #000000" : "none",
              }}
            >
              {modelName}
            </Typography>
          </Box>
        </Box>

        {/* Grid Images (Right - 50% width, 2x2 grid) */}
        <Box
          sx={{
            width: "50%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            height: "100%",
          }}
        >
          {[0, 1, 2, 3].map((index) => (
            <Box
              key={index}
              sx={{
                borderLeft: "2px solid white",
                borderBottom: index < 2 ? "2px solid white" : "none",
                overflow: "hidden",
              }}
            >
              {gridImages?.[index] ? (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${transformCloudinaryUrl(gridImages[index], 500, 400)})`,
                    backgroundSize: "cover",
                    backgroundPosition: getGridPosition(index),
                    backgroundRepeat: "no-repeat",
                  }}
                  role="img"
                  aria-label={`Photo ${index + 1}`}
                />
              ) : (
                <PlaceholderImage text={`Image ${index + 1}`} />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Measurements bar with logo */}
      <Box
        sx={{
          backgroundColor: "white",
          px: compact ? 2 : 4,
          py: compact ? 1.5 : 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {/* Measurements on the left */}
        <Box>
          <Typography
            sx={{
              fontSize: compact ? "0.75rem" : "1rem",
              fontWeight: 600,
              color: "grey.800",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {measurementItems.join(" / ")}
          </Typography>
          {dressSize && (
            <Typography
              sx={{
                fontSize: compact ? "0.75rem" : "1rem",
                fontWeight: 600,
                color: "grey.800",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                mt: 0.5,
              }}
            >
              {dressSize}
            </Typography>
          )}
        </Box>

        {/* Logo on the right */}
        <Box
          component="img"
          src={logo2020Square}
          alt="The Model Cloud"
          sx={{
            height: compact ? 40 : 56,
          }}
        />
      </Box>

      {/* Contact info bar */}
      {contactInfo && (
        <Box
          sx={{
            backgroundColor: "white",
            px: compact ? 2 : 4,
            pb: compact ? 1.5 : 2,
            textAlign: "right",
          }}
        >
          <Typography
            sx={{
              fontSize: compact ? "0.7rem" : "0.85rem",
              color: "grey.600",
            }}
          >
            {contactInfo}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

ZCardPreview.displayName = "ZCardPreview";

ZCardPreview.defaultProps = {
  model: null,
  mainImage: null,
  gridImages: [],
  measurements: {},
  creatorEmail: null,
  creatorPhone: null,
  compact: false,
  nameColor: "white",
  nameSize: "medium",
  mainImagePosition: { x: 50, y: 50 },
  gridImagePositions: [],
};

ZCardPreview.propTypes = {
  model: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
  }),
  mainImage: PropTypes.string,
  gridImages: PropTypes.arrayOf(PropTypes.string),
  measurements: PropTypes.shape({
    height: PropTypes.string,
    bust: PropTypes.string,
    braSize: PropTypes.string,
    waist: PropTypes.string,
    hips: PropTypes.string,
    shoeSize: PropTypes.string,
    dressSize: PropTypes.string,
  }),
  creatorEmail: PropTypes.string,
  creatorPhone: PropTypes.string,
  compact: PropTypes.bool,
  nameColor: PropTypes.oneOf(["white", "black"]),
  nameSize: PropTypes.oneOf(["small", "medium", "large", "extra-large", "xxl"]),
  mainImagePosition: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  gridImagePositions: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    })
  ),
};

export default ZCardPreview;
