import Stack from "@mui/material/Stack";
import MDBox from "components/MDBox";
import ImgsViewer from "react-images-viewer";
import { useState } from "react";

function JobImages({ media = [] }) {
  const [currentImage, setCurrentImage] = useState(media[0] || "");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (i) => {
    setViewerIndex(i);
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  return (
    <MDBox>
      {media.length > 0 && (
        <>
          <ImgsViewer
            imgs={media.map((url) => ({ src: url }))}
            isOpen={viewerOpen}
            onClose={closeViewer}
            currImg={viewerIndex}
            onClickPrev={() => setViewerIndex((i) => Math.max(i - 1, 0))}
            onClickNext={() => setViewerIndex((i) => Math.min(i + 1, media.length - 1))}
            backdropCloseable
          />

          <MDBox
            component="img"
            src={currentImage}
            alt="Job"
            borderRadius="lg"
            width="100%"
            shadow="lg"
            onClick={() => openViewer(0)}
          />
          <MDBox mt={2} pt={1}>
            <Stack direction="row" spacing={3}>
              {media.map((img, i) => (
                <MDBox
                  key={i}
                  component="img"
                  src={img}
                  alt={`Media ${i}`}
                  borderRadius="lg"
                  shadow="md"
                  width="100%"
                  height="5rem"
                  minHeight="5rem"
                  sx={{ cursor: "pointer", objectFit: "cover" }}
                  onClick={() => {
                    setCurrentImage(img);
                    openViewer(i);
                  }}
                />
              ))}
            </Stack>
          </MDBox>
        </>
      )}
    </MDBox>
  );
}

export default JobImages;
