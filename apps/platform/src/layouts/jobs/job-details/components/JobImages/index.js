import { useState } from "react";
import ImgsViewer from "react-images-viewer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";

function JobImages({ media = [] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (index) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  // Helper to check if file is video
  const isVideo = (url) => {
    return /\.(mp4|mov|webm)$/i.test(url);
  };

  // Only pass image URLs to the image viewer
  const imageUrls = media.filter((url) => !isVideo(url));

  // If no media, show placeholder
  if (!media || media.length === 0) {
    return (
      <MDBox
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={6}
        sx={{
          backgroundColor: "grey.100",
          borderRadius: 2,
        }}
      >
        <Icon sx={{ fontSize: 64, color: "text.disabled", mb: 1 }}>image</Icon>
        <MDTypography variant="body2" color="text">
          No images or videos uploaded for this job
        </MDTypography>
      </MDBox>
    );
  }

  return (
    <MDBox p={{ xs: 2, md: 3 }}>
      {/* Lightbox for images only */}
      <ImgsViewer
        imgs={imageUrls.map((url) => ({ src: url }))}
        isOpen={viewerOpen}
        onClose={closeViewer}
        currImg={viewerIndex}
        onClickPrev={() => setViewerIndex((i) => Math.max(i - 1, 0))}
        onClickNext={() => setViewerIndex((i) => Math.min(i + 1, imageUrls.length - 1))}
        backdropCloseable
      />

      {/* Grid Layout for media */}
      <MDBox
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: media.length === 1 ? "1fr" : "repeat(2, 1fr)",
            md: media.length === 1 ? "1fr" : media.length === 2 ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {media.map((url, index) => {
          const isFirstLarge = index === 0 && media.length > 2;

          return isVideo(url) ? (
            <MDBox
              key={index}
              sx={{
                gridColumn: isFirstLarge ? { sm: "span 2" } : "auto",
                gridRow: isFirstLarge ? { sm: "span 2" } : "auto",
              }}
            >
              <MDBox
                component="video"
                src={url}
                controls
                sx={{
                  width: "100%",
                  height: isFirstLarge ? { xs: 250, sm: "100%" } : { xs: 200, sm: 250 },
                  objectFit: "cover",
                  borderRadius: 2,
                  boxShadow: 1,
                }}
              />
            </MDBox>
          ) : (
            <MDBox
              key={index}
              onClick={() => openViewer(imageUrls.indexOf(url))}
              sx={{
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                borderRadius: 2,
                gridColumn: isFirstLarge ? { sm: "span 2" } : "auto",
                gridRow: isFirstLarge ? { sm: "span 2" } : "auto",
                "&:hover": {
                  "& img": {
                    transform: "scale(1.05)",
                  },
                  "& .overlay": {
                    opacity: 1,
                  },
                },
              }}
            >
              <MDBox
                component="img"
                src={url}
                alt={`Job image ${index + 1}`}
                sx={{
                  width: "100%",
                  height: isFirstLarge ? { xs: 250, sm: "100%", minHeight: 300 } : { xs: 200, sm: 250 },
                  objectFit: "cover",
                  transition: "transform 0.3s ease",
                }}
              />
              <MDBox
                className="overlay"
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.3s ease",
                }}
              >
                <Icon sx={{ color: "white", fontSize: 40 }}>zoom_in</Icon>
              </MDBox>
            </MDBox>
          );
        })}
      </MDBox>
    </MDBox>
  );
}

export default JobImages;
