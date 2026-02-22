import PropTypes from "prop-types";

// @mui material components
import Grid from "@mui/material/Grid";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function BaseLayout({ stickyNavbar, children }) {
  return (
    <DashboardLayout>
      <DashboardNavbar absolute={!stickyNavbar} isMini />
      <MDBox mt={stickyNavbar ? 3 : 10}>
        {children}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

BaseLayout.defaultProps = {
  stickyNavbar: false,
};

BaseLayout.propTypes = {
  stickyNavbar: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default BaseLayout;
