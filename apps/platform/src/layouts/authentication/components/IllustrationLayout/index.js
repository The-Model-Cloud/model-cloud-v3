// prop-types is a library for typechecking of props
import PropTypes from "prop-types";
import { useState, useEffect } from "react";

// @mui material components
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import DefaultNavbar from "examples/Navbars/DefaultNavbar";
import PageLayout from "examples/LayoutContainers/PageLayout";

// Material Dashboard 3 PRO React page layout routes
import pageRoutes from "page.routes";

// Material Dashboard 3 PRO React context
import { useMaterialUIController } from "context";

function IllustrationLayout({ header, title, description, illustration, transitionInterval, children }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  // Support both single image (string) and multiple images (array)
  const images = Array.isArray(illustration) ? illustration : [illustration];
  const hasMultipleImages = images.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);

  // Cycle through images - simply change the active index and let CSS handle the transition
  useEffect(() => {
    if (!hasMultipleImages) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, transitionInterval);

    return () => clearInterval(interval);
  }, [hasMultipleImages, images.length, transitionInterval]);

  return (
    <PageLayout background="white">
      {/* <DefaultNavbar
        routes={pageRoutes}
      /> */}
      <Grid
        container
        sx={{
          backgroundColor: ({ palette: { background, white } }) =>
            darkMode ? background.default : white.main,
        }}
      >
        <Grid item xs={12} lg={6}>
          {hasMultipleImages ? (
            // Multiple images with crossfade transition
            <Box
              display={{ xs: "none", lg: "flex" }}
              sx={{
                position: "relative",
                width: "calc(100% - 2rem)",
                height: "calc(100vh - 2rem)",
                borderRadius: "0.75rem",
                ml: 2,
                mt: 2,
                overflow: "hidden",
              }}
            >
              {/* Stack all images, only active one is visible */}
              {images.map((image, index) => (
                <Box
                  key={index}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundImage: `url(${image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: index === activeIndex ? 1 : 0,
                    transition: "opacity 1.5s ease-in-out",
                  }}
                />
              ))}
            </Box>
          ) : (
            // Single image (original behavior)
            <MDBox
              display={{ xs: "none", lg: "flex" }}
              width="calc(100% - 2rem)"
              height="calc(100vh - 2rem)"
              borderRadius="lg"
              ml={2}
              mt={2}
              sx={{ backgroundImage: `url(${images[0]})` }}
            />
          )}
        </Grid>
        <Grid item xs={11} sm={8} md={6} lg={4} xl={3} sx={{ mx: "auto" }}>
          <MDBox display="flex" flexDirection="column" justifyContent="center" height="100vh">
            <MDBox py={3} px={3} textAlign="center">
              {!header ? (
                <>
                  <MDBox mb={1} textAlign="center">
                    <MDTypography variant="h4" fontWeight="bold">
                      {title}
                    </MDTypography>
                  </MDBox>
                  <MDTypography variant="body2" color="text">
                    {description}
                  </MDTypography>
                </>
              ) : (
                header
              )}
            </MDBox>
            <MDBox p={3}>{children}</MDBox>
          </MDBox>
        </Grid>
      </Grid>
    </PageLayout>
  );
}

// Setting default values for the props of IllustrationLayout
IllustrationLayout.defaultProps = {
  header: "",
  title: "",
  description: "",
  illustration: "",
  transitionInterval: 5000, // 5 seconds between transitions
};

// Typechecking props for the IllustrationLayout
IllustrationLayout.propTypes = {
  header: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  illustration: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  transitionInterval: PropTypes.number,
};

export default IllustrationLayout;
