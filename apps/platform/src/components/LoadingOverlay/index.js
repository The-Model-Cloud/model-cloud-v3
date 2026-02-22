/**
 * LoadingOverlay - A full-screen or container overlay with spinner and message
 */

import PropTypes from "prop-types";
import CircularProgress from "@mui/material/CircularProgress";
import Backdrop from "@mui/material/Backdrop";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function LoadingOverlay({ open, message, fullScreen }) {
  if (fullScreen) {
    return (
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          gap: 2,
        }}
        open={open}
      >
        <CircularProgress color="inherit" size={48} />
        {message && (
          <MDTypography variant="h6" color="white" fontWeight="medium">
            {message}
          </MDTypography>
        )}
      </Backdrop>
    );
  }

  if (!open) return null;

  return (
    <MDBox
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={6}
      gap={2}
    >
      <CircularProgress color="info" size={48} />
      {message && (
        <MDTypography variant="body1" color="text" fontWeight="medium">
          {message}
        </MDTypography>
      )}
    </MDBox>
  );
}

LoadingOverlay.defaultProps = {
  open: false,
  message: "",
  fullScreen: false,
};

LoadingOverlay.propTypes = {
  open: PropTypes.bool,
  message: PropTypes.string,
  fullScreen: PropTypes.bool,
};

export default LoadingOverlay;
