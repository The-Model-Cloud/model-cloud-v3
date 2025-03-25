import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import AppBar from "@mui/material/AppBar";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import InfoIcon from "@mui/icons-material/Info";
import ImageIcon from "@mui/icons-material/Image";
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
import Measurements from "./tabs/Measurements";
import SocialMedia from "./tabs/SocialMedia";
import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";

function Settings() {
  const [tabValue, setTabValue] = useState(0);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserRole(data.role);
        }
      }
    };
    fetchUserRole();
  }, []);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const getTabs = () => {
    if (userRole === "model" || userRole === "super admin" || userRole === "admin") {
      return [
        { label: "Basic Info", icon: <InfoIcon />, component: <BasicInfo /> },
        { label: "Portfolio", icon: <ImageIcon />, component: <Portfolio /> },
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
    if (tabs[tabValue]) {
      return tabs[tabValue].component;
    }
    return null;
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