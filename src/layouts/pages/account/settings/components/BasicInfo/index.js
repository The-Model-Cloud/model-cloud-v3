import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// @material-ui core components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Settings page components
import FormField from "layouts/pages/account/components/FormField";

import MDInput from "components/MDInput";

// Data
import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";

import IconButton from "@mui/material/IconButton";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import ProfileAvatar from "components/Profile/ProfileAvatar";


const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;



function BasicInfo() {

  const user = auth.currentUser;
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    location: "",
    aboutMe: "",
    email: "",
    phone: "",
    language: "",
    profileAvatar: "",
  });


  useEffect(() => {
    const fetchUser = async () => {
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            gender: data.gender || "",
            location: data.location || "",
            aboutMe: data.aboutMe || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            language: data.language || "",
            profileAvatar: data.profileAvatar || "",
          });

        }
      }
    };
    fetchUser();
  }, [user]);

  const handleChange = (field) => async (e) => {
    const value = e.target.value;

    setProfile((prev) => ({ ...prev, [field]: value }));

    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { [field]: value });
    }
  };

  const handleAutocompleteChange = (field) => async (event, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));

    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { [field]: value });
    }
  };




  return (
    <Card id="basic-info" sx={{ overflow: "visible" }}>
      <MDBox p={3}>
        <MDTypography variant="h5">Basic Info</MDTypography>
      </MDBox>
      <MDBox p={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <MDBox mb={4}>
              <MDTypography variant="h6" mb={1}>
                Profile Picture
              </MDTypography>

              <MDBox display="flex" alignItems="center" gap={2}>
                <ProfileAvatar src={profile.profileAvatar} size={100} />

                <label htmlFor="avatar-upload">
                  <input
                    accept="image/*"
                    id="avatar-upload"
                    type="file"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
                      formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);

                      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`, {
                        method: "POST",
                        body: formData,
                      });

                      const data = await res.json();

                      if (data.secure_url && auth.currentUser) {
                        const uid = auth.currentUser.uid;
                        const ref = doc(db, "users", uid);
                        await updateDoc(ref, { profileAvatar: data.secure_url });

                        setProfile((prev) => ({
                          ...prev,
                          profileAvatar: data.secure_url,
                        }));
                      }
                    }}
                  />
                  <IconButton color="primary" component="span">
                    <PhotoCamera />
                  </IconButton>
                </label>
              </MDBox>
            </MDBox>


          </Grid>
        </Grid>
      </MDBox>
      <MDBox component="form" pb={3} px={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              label="First Name"
              placeholder="Alec"
              value={profile.firstName}
              onChange={handleChange("firstName")}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Last Name"
              placeholder="Thompson"
              value={profile.lastName}
              onChange={handleChange("lastName")}
            />
          </Grid>
          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  value={profile.gender}
                  options={selectData.gender}
                  renderInput={(params) => (
                    <FormField {...params} label="I am a" InputLabelProps={{ shrink: true }} />
                  )}
                  onChange={handleAutocompleteChange("gender")}
                />

              </Grid>
              <Grid item xs={12} sm={8}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Autocomplete
                      defaultValue="1"
                      value={profile.dayOfBirth}
                      options={selectData.days}
                      renderInput={(params) => (
                        <FormField {...params}
                          label="Birth Date"
                          InputLabelProps={{ shrink: true }} />
                      )}
                      onChange={handleAutocompleteChange("dayOfBirth")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <Autocomplete
                      defaultValue="February"
                      value={profile.monthOfBirth}
                      options={selectData.birthDate}
                      renderInput={(params) => (
                        <FormField {...params} InputLabelProps={{ shrink: true }}
                        />
                      )}
                      onChange={handleAutocompleteChange("monthOfBirth")}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Autocomplete
                      value={profile.yearOfBirth || (new Date().getFullYear() - 21).toString()} // Default to 21 years ago
                      options={selectData.years}
                      renderInput={(params) => (
                        <FormField {...params} label="Birth Year" InputLabelProps={{ shrink: true }} />
                      )}
                      onChange={handleAutocompleteChange("yearOfBirth")}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Email"
              value={profile.email}
              inputProps={{ type: "email" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Your Location"
              placeholder="London, UK"
              value={profile.location}
              onChange={handleChange("location")}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Phone Number"
              placeholder="+44 7777 123456"
              value={profile.phone}
              onChange={handleChange("phone")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              value={profile.languages}
              options={selectData.languages}
              renderInput={(params) => <FormField {...params} label="Language spoken" InputLabelProps={{ shrink: true }} />}
              onChange={handleAutocompleteChange("languages")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              value={profile.categories}
              options={selectData.skills}
              renderInput={(params) => <FormField {...params} label="My categories" InputLabelProps={{ shrink: true }} />}
              onChange={handleAutocompleteChange("categories")}
            />
          </Grid>
          <Grid item xs={12} sm={12}>
            <FormField
              label="About Me"
              placeholder="Tell us a little about yourself"
              value={profile.aboutMe}
              onChange={handleChange("aboutMe")}
              multiline rows={5}
            />
          </Grid>
        </Grid>

      </MDBox>
    </Card>
  );
}

export default BasicInfo;
