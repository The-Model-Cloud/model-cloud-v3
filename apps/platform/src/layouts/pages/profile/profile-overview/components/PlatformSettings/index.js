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

/**
 * PLATFORM SETTINGS COMPONENT
 *
 * This component manages user notification preferences and marketing subscriptions.
 *
 * ACCOUNT SECTION - Notification Settings (saved to Firestore user document):
 * - emailOnMessage: Email when someone sends a message (all users)
 * - emailOnJobMatch: Email when profile matches a job listing (models only)
 * - emailOnModelMatch: Email when models match job listing (clients only)
 * - emailOnJobApplication: Email when a model applies to job listing (clients only)
 *
 * REMOVED/DEFERRED FEATURES (can be re-added later):
 * - emailOnPostAnswer: Email when someone answers on my post
 * - emailOnMention: Email when someone mentions me
 *
 * APPLICATION SECTION - Mailchimp Marketing Subscriptions:
 * - newLaunches: "New launches and projects" tag
 * - productUpdates: "Monthly product updates" tag
 * - newsletter: "Subscribe to newsletter" tag
 *
 * These preferences are stored in the user's Firestore document under:
 * - notificationSettings: { emailOnMessage, emailOnJobMatch, etc. }
 * - marketingPreferences: { newLaunches, productUpdates, newsletter }
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

// Firebase
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "config/firebase";

// API
import { getSystemSettings, updateSystemSettings, callCloudFunction } from "utils/api";

function PlatformSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  // Notification settings (saved to Firestore)
  const [emailOnMessage, setEmailOnMessage] = useState(true);
  const [emailOnJobMatch, setEmailOnJobMatch] = useState(true); // For models
  const [emailOnModelMatch, setEmailOnModelMatch] = useState(true); // For clients
  const [emailOnJobApplication, setEmailOnJobApplication] = useState(true); // For clients

  // Marketing preferences (synced with Mailchimp)
  const [newLaunches, setNewLaunches] = useState(false);
  const [productUpdates, setProductUpdates] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  // Super Admin email toggle state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);

  const isSuperAdmin = user?.role === "super admin";
  const isModel = user?.role === "model";
  const isClient = user?.role === "client" || user?.role === "account manager";

  // Fetch user settings on mount
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          // Load notification settings
          const notificationSettings = data.notificationSettings || {};
          setEmailOnMessage(notificationSettings.emailOnMessage !== false);
          setEmailOnJobMatch(notificationSettings.emailOnJobMatch !== false);
          setEmailOnModelMatch(notificationSettings.emailOnModelMatch !== false);
          setEmailOnJobApplication(notificationSettings.emailOnJobApplication !== false);

          // Load marketing preferences
          const marketingPreferences = data.marketingPreferences || {};
          setNewLaunches(marketingPreferences.newLaunches === true);
          setProductUpdates(marketingPreferences.productUpdates === true);
          setNewsletter(marketingPreferences.newsletter === true);
        }
      } catch (err) {
        console.error("Failed to fetch user settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSettings();
  }, [user?.uid]);

  // Fetch system settings for super admins
  useEffect(() => {
    const fetchSystemSettings = async () => {
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

    fetchSystemSettings();
  }, [isSuperAdmin]);

  // Generic handler for notification settings
  const handleNotificationToggle = async (settingKey, currentValue, setter) => {
    if (!user?.uid || saving[settingKey]) return;

    const newValue = !currentValue;
    setSaving((prev) => ({ ...prev, [settingKey]: true }));

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        [`notificationSettings.${settingKey}`]: newValue,
      });
      setter(newValue);
    } catch (err) {
      console.error(`Failed to update ${settingKey}:`, err);
    } finally {
      setSaving((prev) => ({ ...prev, [settingKey]: false }));
    }
  };

  // Handler for marketing preferences (with Mailchimp sync)
  const handleMarketingToggle = async (preferenceKey, currentValue, setter) => {
    if (!user?.uid || saving[preferenceKey]) return;

    const newValue = !currentValue;
    setSaving((prev) => ({ ...prev, [preferenceKey]: true }));

    try {
      // Update Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        [`marketingPreferences.${preferenceKey}`]: newValue,
      });

      // Sync with Mailchimp via Cloud Function
      try {
        await callCloudFunction("updateMailchimpSubscription", {
          email: user.email,
          tag: preferenceKey,
          subscribed: newValue,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
        });
      } catch (mailchimpErr) {
        console.warn("Mailchimp sync failed (continuing anyway):", mailchimpErr);
      }

      setter(newValue);
    } catch (err) {
      console.error(`Failed to update ${preferenceKey}:`, err);
    } finally {
      setSaving((prev) => ({ ...prev, [preferenceKey]: false }));
    }
  };

  const handleSystemEmailToggle = async () => {
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

  // Render a toggle row with loading state
  const renderToggle = (label, checked, onChange, settingKey, description = null) => (
    <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
      <MDBox mt={0.5}>
        {saving[settingKey] ? (
          <MDBox display="flex" alignItems="center" justifyContent="center" width={58} height={38}>
            <CircularProgress size={16} />
          </MDBox>
        ) : (
          <Switch
            checked={checked}
            onChange={onChange}
            disabled={loading || saving[settingKey]}
          />
        )}
      </MDBox>
      <MDBox width="80%" ml={0.5}>
        <MDTypography variant="button" fontWeight="regular" color="text">
          {label}
        </MDTypography>
        {description && (
          <MDTypography variant="caption" color="text" display="block">
            {description}
          </MDTypography>
        )}
      </MDBox>
    </MDBox>
  );

  if (loading) {
    return (
      <Card sx={{ boxShadow: "none", border: "0" }}>
        <MDBox p={2} display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress size={30} />
        </MDBox>
      </Card>
    );
  }

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
          notifications
        </MDTypography>

        {/* Email on message - All users */}
        {renderToggle(
          "Email me when someone sends me a message",
          emailOnMessage,
          () => handleNotificationToggle("emailOnMessage", emailOnMessage, setEmailOnMessage),
          "emailOnMessage"
        )}

        {/* Model-specific: Email on job match */}
        {isModel && renderToggle(
          "Email me when I match a job listing",
          emailOnJobMatch,
          () => handleNotificationToggle("emailOnJobMatch", emailOnJobMatch, setEmailOnJobMatch),
          "emailOnJobMatch",
          "Get notified when new jobs match your profile"
        )}

        {/* Client-specific toggles */}
        {isClient && (
          <>
            {renderToggle(
              "Email me with models matching my job listing",
              emailOnModelMatch,
              () => handleNotificationToggle("emailOnModelMatch", emailOnModelMatch, setEmailOnModelMatch),
              "emailOnModelMatch",
              "Receive a list of matching models when you post a job"
            )}
            {renderToggle(
              "Email me when a model applies to my job listing",
              emailOnJobApplication,
              () => handleNotificationToggle("emailOnJobApplication", emailOnJobApplication, setEmailOnJobApplication),
              "emailOnJobApplication"
            )}
          </>
        )}

        <MDBox mt={3}>
          <MDTypography
            variant="caption"
            fontWeight="bold"
            color="text"
            textTransform="uppercase"
          >
            marketing
          </MDTypography>
        </MDBox>

        {renderToggle(
          "New launches and projects",
          newLaunches,
          () => handleMarketingToggle("newLaunches", newLaunches, setNewLaunches),
          "newLaunches",
          "Be the first to know about new features"
        )}

        {renderToggle(
          "Monthly product updates",
          productUpdates,
          () => handleMarketingToggle("productUpdates", productUpdates, setProductUpdates),
          "productUpdates",
          "Receive our monthly newsletter with updates"
        )}

        {renderToggle(
          "Subscribe to newsletter",
          newsletter,
          () => handleMarketingToggle("newsletter", newsletter, setNewsletter),
          "newsletter",
          "General news and industry insights"
        )}

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
                    onChange={handleSystemEmailToggle}
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
