/**
 * Terms and Conditions Page
 *
 * This page displays the Terms and Conditions for The Model Cloud platform.
 * To update the terms content, edit the termsContent.js file in this folder.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

// @mui material components
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Icon from "@mui/material/Icon";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Material Dashboard 3 PRO React examples
import PageLayout from "examples/LayoutContainers/PageLayout";

// Terms content
import { clientTermsContent, talentTermsContent, lastUpdated } from "./termsContent";

function TermsAndConditions() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const renderSection = (section) => (
    <MDBox key={section.title} mb={4}>
      <MDTypography variant="h5" fontWeight="bold" mb={2}>
        {section.title}
      </MDTypography>
      {section.content.map((item, index) => (
        <MDBox key={index} mb={2} pl={2}>
          {item.subtitle && (
            <MDTypography variant="h6" fontWeight="medium" mb={1}>
              {item.subtitle}
            </MDTypography>
          )}
          <MDTypography variant="body2" color="text" sx={{ textAlign: "justify" }}>
            {item.text}
          </MDTypography>
        </MDBox>
      ))}
    </MDBox>
  );

  return (
    <PageLayout>
      <MDBox
        minHeight="100vh"
        sx={{
          background: "linear-gradient(135deg, #1a2035 0%, #090d1a 100%)",
          py: 4,
        }}
      >
        <Container>
          <MDBox mb={3}>
            <MDButton
              variant="outlined"
              color="white"
              onClick={() => navigate(-1)}
              startIcon={<Icon>arrow_back</Icon>}
            >
              Back
            </MDButton>
          </MDBox>

          <Card sx={{ p: 4 }}>
            <MDBox mb={4} textAlign="center">
              <MDTypography variant="h3" fontWeight="bold" mb={1}>
                Terms and Conditions
              </MDTypography>
              <MDTypography variant="body2" color="text">
                Last updated: {lastUpdated}
              </MDTypography>
            </MDBox>

            <MDBox mb={4}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                centered
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: "bold",
                  },
                }}
              >
                <Tab label="Client Terms (CTC)" />
                <Tab label="Talent/Creative Terms (MTC)" />
              </Tabs>
            </MDBox>

            <MDBox>
              {tabValue === 0 && (
                <MDBox>
                  <MDTypography variant="h4" fontWeight="bold" mb={3} textAlign="center">
                    Client&apos;s Terms and Conditions (&quot;CTC&quot;)
                  </MDTypography>
                  {clientTermsContent.map(renderSection)}
                </MDBox>
              )}

              {tabValue === 1 && (
                <MDBox>
                  <MDTypography variant="h4" fontWeight="bold" mb={3} textAlign="center">
                    Talent/Creative&apos;s Terms and Conditions (&quot;MTC&quot;)
                  </MDTypography>
                  <MDTypography variant="body2" color="text" mb={4} textAlign="center">
                    The Talent/Creative must accept the following general terms and conditions for using TMC Technology Limited Platform when registering.
                  </MDTypography>
                  {talentTermsContent.map(renderSection)}
                </MDBox>
              )}
            </MDBox>

            <MDBox mt={4} textAlign="center">
              <MDTypography variant="body2" color="text">
                If you have any questions about these Terms and Conditions, please contact us at{" "}
                <MDTypography
                  component="a"
                  href="mailto:info@themodel.cloud"
                  variant="body2"
                  color="info"
                  fontWeight="medium"
                >
                  info@themodel.cloud
                </MDTypography>
              </MDTypography>
            </MDBox>
          </Card>

          <MDBox mt={3} textAlign="center">
            <MDTypography variant="body2" color="white" opacity={0.7}>
              &copy; {new Date().getFullYear()} TMC Technology Limited. All rights reserved.
            </MDTypography>
          </MDBox>
        </Container>
      </MDBox>
    </PageLayout>
  );
}

export default TermsAndConditions;
