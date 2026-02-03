/**
=========================================================
* Material Dashboard 3 PRO React - v2.3.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-pro-react
* Copyright 2024 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState, useEffect } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Switch from "@mui/material/Switch";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Context
import { useAuth } from "context/AuthContext";

// API
import { getSystemSettings, updateSystemSettings } from "utils/api";

function PlatformSettings() {
  const { user } = useAuth();
  const [followsMe, setFollowsMe] = useState(true);
  const [answersPost, setAnswersPost] = useState(false);
  const [mentionsMe, setMentionsMe] = useState(true);
  const [newLaunches, setNewLaunches] = useState(false);
  const [productUpdate, setProductUpdate] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  // Super Admin email toggle state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);

  const isSuperAdmin = user?.role === "super admin";

  // Fetch system settings on mount for super admins
  useEffect(() => {
    const fetchSettings = async () => {
      if (!isSuperAdmin) {
        setEmailLoading(false);
        return;
      }

      try {
        const result = await getSystemSettings();
        if (result.success && result.settings) {
          setEmailEnabled(result.settings.emailEnabled !== false);
        }
      } catch (err) {
        console.error("Failed to fetch system settings:", err);
      } finally {
        setEmailLoading(false);
      }
    };

    fetchSettings();
  }, [isSuperAdmin]);

  const handleEmailToggle = async () => {
    if (emailSaving) return;

    const newValue = !emailEnabled;
    setEmailSaving(true);

    try {
      const result = await updateSystemSettings({ emailEnabled: newValue });
      if (result.success) {
        setEmailEnabled(newValue);
      }
    } catch (err) {
      console.error("Failed to update email settings:", err);
    } finally {
      setEmailSaving(false);
    }
  };

  return (
    <Card sx={{ boxShadow: "none", border: "0" }}>
      <MDBox p={2}>
        <MDTypography
          variant="h6"
          fontWeight="medium"
          textTransform="capitalize"
        >
          platform settings
        </MDTypography>
      </MDBox>
      <MDBox pt={1} pb={2} px={2} lineHeight={1.25}>
        <MDTypography
          variant="caption"
          fontWeight="bold"
          color="text"
          textTransform="uppercase"
        >
          account
        </MDTypography>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch
              checked={followsMe}
              onChange={() => setFollowsMe(!followsMe)}
            />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Email me when someone sends me a message
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch
              checked={answersPost}
              onChange={() => setAnswersPost(!answersPost)}
            />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Email me when someone answers on my post
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch
              checked={mentionsMe}
              onChange={() => setMentionsMe(!mentionsMe)}
            />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Email me when someone mentions me
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox mt={3}>
          <MDTypography
            variant="caption"
            fontWeight="bold"
            color="text"
            textTransform="uppercase"
          >
            application
          </MDTypography>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch
              checked={newLaunches}
              onChange={() => setNewLaunches(!newLaunches)}
            />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              New launches and projects
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch
              checked={productUpdate}
              onChange={() => setProductUpdate(!productUpdate)}
            />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Monthly product updates
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch
              checked={newsletter}
              onChange={() => setNewsletter(!newsletter)}
            />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Subscribe to newsletter
            </MDTypography>
          </MDBox>
        </MDBox>

        {/* Super Admin Section - Only visible to super admins */}
        {isSuperAdmin && (
          <>
            <MDBox mt={3}>
              <MDTypography
                variant="caption"
                fontWeight="bold"
                color="error"
                textTransform="uppercase"
              >
                super admin
              </MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
              <MDBox mt={0.5}>
                {emailLoading || emailSaving ? (
                  <MDBox display="flex" alignItems="center" justifyContent="center" width={58} height={38}>
                    <CircularProgress size={20} />
                  </MDBox>
                ) : (
                  <Switch
                    checked={emailEnabled}
                    onChange={handleEmailToggle}
                    disabled={emailLoading || emailSaving}
                  />
                )}
              </MDBox>
              <MDBox width="80%" ml={0.5}>
                <MDTypography variant="button" fontWeight="regular" color="text">
                  Enable system-wide email notifications
                </MDTypography>
                <MDTypography variant="caption" color="text" display="block">
                  {emailEnabled
                    ? "All emails are currently being sent"
                    : "All emails are currently disabled"}
                </MDTypography>
              </MDBox>
            </MDBox>
          </>
        )}
      </MDBox>
    </Card>
  );
}

export default PlatformSettings;
