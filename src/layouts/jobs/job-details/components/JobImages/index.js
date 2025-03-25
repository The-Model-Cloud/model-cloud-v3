import { useState } from "react";
import ImgsViewer from "react-images-viewer";
import MDBox from "components/MDBox";

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

  return (
    <MDBox>
      {media.length > 0 && (
        <>
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

          {/* Masonry Layout */}
          <MDBox
            sx={{
              columnCount: { xs: 1, sm: 2 },
              columnGap: "16px",
              mt: 2,
            }}
          >
            {media.map((url, index) => {
              const commonStyles = {
                width: "100%",
                mb: 2,
                borderRadius: "8px",
                boxShadow: 2,
                breakInside: "avoid",
              };

              return isVideo(url) ? (
                <MDBox
                  key={index}
                  component="video"
                  src={url}
                  controls
                  sx={{
                    ...commonStyles,
                    maxHeight: "400px",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <MDBox
                  key={index}
                  component="img"
                  src={url}
                  alt={`Media ${index}`}
                  onClick={() => openViewer(imageUrls.indexOf(url))}
                  sx={{
                    ...commonStyles,
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </MDBox>
        </>
      )}
    </MDBox>
  );
}

export default JobImages;
