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

import { useState } from "react";

// prop-type is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ProfileAvatar from "components/Profile/ProfileAvatar";

function Images({ formData }) {
  const { values, setFieldValue } = formData;
  const [uploading, setUploading] = useState(false);

  // Determine if this is a model user
  const isModel = values.role === "model";

  const handleImageUpload = async (e, imageType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      // Build folder path based on role
      const userType = isModel ? "models" : "clients";
      const sanitizedName = `${values.firstName || "user"}_${values.lastName || "new"}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");
      const folderPath = `users/${userType}/${sanitizedName}/${imageType}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
      formData.append("folder", folderPath);
      formData.append("public_id", `${imageType}_${Date.now()}`);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.secure_url) {
        if (imageType === "headshot") {
          setFieldValue("headshot", data.secure_url);
        } else {
          setFieldValue("profileAvatar", data.secure_url);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <MDBox>
      <MDTypography variant="h5" fontWeight="bold">
        {isModel ? "Headshot" : "Profile Image"}
      </MDTypography>
      <MDTypography variant="button" color="text">
        {isModel
          ? "Upload a professional headshot for the model's profile"
          : "Upload a profile image (avatar) for this user"}
      </MDTypography>
      <MDBox mt={3}>
        <Grid container spacing={3} justifyContent="center">
          {isModel ? (
            // Model Headshot Upload
            <Grid item xs={12} textAlign="center">
              <MDTypography variant="h6" mb={2}>
                Headshot
              </MDTypography>
              <MDBox display="flex" flexDirection="column" alignItems="center" gap={2}>
                <ProfileAvatar src={values.headshot} size={150} />
                <label htmlFor="headshot-upload">
                  <input
                    accept="image/*"
                    id="headshot-upload"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageUpload(e, "headshot")}
                    disabled={uploading}
                  />
                  <IconButton
                    color="primary"
                    component="span"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <PhotoCamera />
                    )}
                  </IconButton>
                </label>
                {values.headshot && (
                  <MDTypography variant="caption" color="success">
                    Headshot uploaded successfully
                  </MDTypography>
                )}
              </MDBox>
            </Grid>
          ) : (
            // Non-model Profile Image Upload
            <Grid item xs={12} textAlign="center">
              <MDTypography variant="h6" mb={2}>
                Profile Image
              </MDTypography>
              <MDBox display="flex" flexDirection="column" alignItems="center" gap={2}>
                <ProfileAvatar src={values.profileAvatar} size={150} />
                <label htmlFor="profile-upload">
                  <input
                    accept="image/*"
                    id="profile-upload"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageUpload(e, "profile")}
                    disabled={uploading}
                  />
                  <IconButton
                    color="primary"
                    component="span"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <PhotoCamera />
                    )}
                  </IconButton>
                </label>
                {values.profileAvatar && (
                  <MDTypography variant="caption" color="success">
                    Profile image uploaded successfully
                  </MDTypography>
                )}
              </MDBox>
            </Grid>
          )}
        </Grid>
      </MDBox>
    </MDBox>
  );
}

// typechecking props for Images
Images.propTypes = {
  formData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
};

export default Images;
