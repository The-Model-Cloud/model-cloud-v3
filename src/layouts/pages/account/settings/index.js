import { useState } from "react";

// @mui components
import Grid from "@mui/material/Grid";
import AppBar from "@mui/material/AppBar";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

// Components
import MDBox from "components/MDBox";
import BaseLayout from "layouts/pages/account/components/BaseLayout";
import Header from "layouts/pages/account/settings/components/Header";
import BasicInfo from "layouts/pages/account/settings/components/BasicInfo";
import ChangePassword from "layouts/pages/account/settings/components/ChangePassword";
import Notifications from "layouts/pages/account/settings/components/Notifications";
import Sessions from "layouts/pages/account/settings/components/Sessions";
import DeleteAccount from "layouts/pages/account/settings/components/DeleteAccount";
// import Sidenav from "layouts/pages/account/settings/components/Sidenav";
// import Authentication from "layouts/pages/account/settings/components/Authentication";
// import Accounts from "layouts/pages/account/settings/components/Accounts";

// 🔜 New tab views (to be created)
import Portfolio from "./tabs/Portfolio";
import Measurements from "./tabs/Measurements";
import SocialMedia from "./tabs/SocialMedia";

const TABS = ["Basic Info", "Portfolio", "Measurements", "Social Media", "Notifications", "Sessions", "Change Password", "Delete Account"];

function Settings() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return <BasicInfo />;
      case 1:
        return <Portfolio />;
      case 2:
        return <Measurements />;
      case 3:
        return <SocialMedia />;
      case 4:
        return <Notifications />;
      case 5:
        return <Sessions />;
      case 6:
        return <ChangePassword />;
      case 7:
        return <DeleteAccount />;
      default:
        return null;
    }
  };


  return (
    <BaseLayout>
      <MDBox mt={4}>
        <Grid container spacing={3}>
          {/* <Grid item xs={12} lg={3}>
            <Sidenav />
          </Grid> */}
          <Grid item xs={12}>
            <Header />
          </Grid>

          {/* TABS NAVIGATION */}
          <Grid item xs={12}>
            <AppBar position="static">
              <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable">
                {TABS.map((label, index) => (
                  <Tab key={index} label={label} />
                ))}
              </Tabs>
            </AppBar>
          </Grid>


          {/* TAB CONTENT */}
          <Grid item xs={12}>
            {renderTabContent()}
          </Grid>

          {/* Always shown settings */}
          {/* <Grid item xs={12}>
            <BasicInfo />
          </Grid> */}
          {/* <Grid item xs={12}>
            <ChangePassword />
          </Grid>
          <Grid item xs={12}>
          <Authentication />
          </Grid>
          <Grid item xs={12}>
          <Accounts />
          </Grid>
          <Grid item xs={12}>
            <Notifications />
          </Grid>
          <Grid item xs={12}>
            <Sessions />
          </Grid>
          <Grid item xs={12}>
            <DeleteAccount />
          </Grid> */}
        </Grid>
      </MDBox>
    </BaseLayout>
  );
}

export default Settings;
