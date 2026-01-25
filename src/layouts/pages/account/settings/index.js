import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Grid from "@mui/material/Grid";
import AppBar from "@mui/material/AppBar";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import InfoIcon from "@mui/icons-material/Info";
import ImageIcon from "@mui/icons-material/Image";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import StraightenIcon from "@mui/icons-material/Straighten";
import ShareIcon from "@mui/icons-material/Share";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DevicesIcon from "@mui/icons-material/Devices";
import LockIcon from "@mui/icons-material/Lock";
import DeleteIcon from "@mui/icons-material/Delete";

import MDBox from "components/MDBox";
import BaseLayout from "layouts/pages/account/components/BaseLayout";
import Header from "layouts/pages/account/settings/components/Header";
import BasicInfo from "layouts/pages/account/settings/components/BasicInfo";
import ChangePassword from "layouts/pages/account/settings/components/ChangePassword";
import Notifications from "layouts/pages/account/settings/components/Notifications";
import Sessions from "layouts/pages/account/settings/components/Sessions";
import DeleteAccount from "layouts/pages/account/settings/components/DeleteAccount";
import Portfolio from "./tabs/Portfolio";
import Digitals from "./tabs/Digitals";
import Measurements from "./tabs/Measurements";
import SocialMedia from "./tabs/SocialMedia";

import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";

// Tab name to index mapping for URL query parameter support
const TAB_MAP = {
  "basic-info": 0,
  "portfolio": 1,
  "digitals": 2,
  "measurements": 3,
  "social-media": 4,
  "notifications": 5,
  "change-password": 6,
  "delete-account": 7,
};

function Settings() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && TAB_MAP[tabParam] !== undefined ? TAB_MAP[tabParam] : 0;

  const [tabValue, setTabValue] = useState(initialTab);
  const [userRole, setUserRole] = useState(null);
  const { uid } = useParams(); // ✅ check for impersonated UID

  // ✅ Update tab when URL query param changes
  useEffect(() => {
    if (tabParam && TAB_MAP[tabParam] !== undefined) {
      setTabValue(TAB_MAP[tabParam]);
    }
  }, [tabParam]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const userId = uid || auth.currentUser?.uid;
      if (!userId) return;

      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setUserRole(data.role);
      }
    };

    fetchUserRole();
  }, [uid]);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const getTabs = () => {
    if (userRole === "model" || userRole === "super admin" || userRole === "admin") {
      return [
        { label: "Basic Info", icon: <InfoIcon />, component: <BasicInfo /> },
        { label: "Portfolio", icon: <ImageIcon />, component: <Portfolio /> },
        { label: "Digitals", icon: <AddAPhotoIcon />, component: <Digitals /> },
        { label: "Measurements", icon: <StraightenIcon />, component: <Measurements /> },
        { label: "Social Media", icon: <ShareIcon />, component: <SocialMedia /> },
        { label: "Notifications", icon: <NotificationsIcon />, component: <Notifications /> },
        { label: "Change Password", icon: <LockIcon />, component: <ChangePassword /> },
        { label: "Delete Account", icon: <DeleteIcon />, component: <DeleteAccount /> },
      ];
    } else if (userRole === "client") {
      return [
        { label: "Basic Info", icon: <InfoIcon />, component: <BasicInfo /> },
        { label: "Social Media", icon: <ShareIcon />, component: <SocialMedia /> },
        { label: "Notifications", icon: <NotificationsIcon />, component: <Notifications /> },
        { label: "Sessions", icon: <DevicesIcon />, component: <Sessions /> },
        { label: "Change Password", icon: <LockIcon />, component: <ChangePassword /> },
        { label: "Delete Account", icon: <DeleteIcon />, component: <DeleteAccount /> },
      ];
    } else {
      return [];
    }
  };

  const renderTabContent = () => {
    const tabs = getTabs();
    return tabs[tabValue]?.component || null;
  };

  return (
    <BaseLayout>
      <MDBox mt={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Header />
          </Grid>
          <Grid item xs={12}>
            <AppBar position="static">
              <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable">
                {getTabs().map((tab, index) => (
                  <Tab key={index} label={tab.label} icon={tab.icon} />
                ))}
              </Tabs>
            </AppBar>
          </Grid>
          <Grid item xs={12}>
            {renderTabContent()}
          </Grid>
        </Grid>
      </MDBox>
    </BaseLayout>
  );
}

export default Settings;
