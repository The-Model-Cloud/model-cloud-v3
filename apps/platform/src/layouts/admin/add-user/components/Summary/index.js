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

// prop-type is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import ProfileAvatar from "components/Profile/ProfileAvatar";

function Summary({ formData, onEditStep }) {
  const { values, setFieldValue } = formData;
  const isModel = values.role === "model";

  // Format role for display
  const formatRole = (role) => {
    if (!role) return "Not set";
    return role
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Section component for consistent styling
  const SummarySection = ({ title, stepIndex, children }) => (
    <MDBox mb={3}>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <MDTypography variant="h6" fontWeight="medium">
          {title}
        </MDTypography>
        {onEditStep && (
          <Tooltip title={`Edit ${title}`}>
            <IconButton size="small" onClick={() => onEditStep(stepIndex)}>
              <Icon fontSize="small">edit</Icon>
            </IconButton>
          </Tooltip>
        )}
      </MDBox>
      <Card sx={{ p: 2, backgroundColor: "grey.100" }}>
        {children}
      </Card>
    </MDBox>
  );

  // Editable field component
  const EditableField = ({ label, value, fieldName, type = "text" }) => (
    <MDBox mb={1.5}>
      <MDTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
        {label}
      </MDTypography>
      <MDInput
        type={type}
        value={value || ""}
        onChange={(e) => setFieldValue(fieldName, e.target.value)}
        fullWidth
        variant="standard"
        size="small"
      />
    </MDBox>
  );

  // Display-only field component
  const DisplayField = ({ label, value }) => (
    <MDBox mb={1.5}>
      <MDTypography variant="caption" color="text" fontWeight="bold" textTransform="uppercase">
        {label}
      </MDTypography>
      <MDTypography variant="body2">
        {value || "—"}
      </MDTypography>
    </MDBox>
  );

  return (
    <MDBox>
      <MDTypography variant="h5" fontWeight="bold">
        Summary
      </MDTypography>
      <MDTypography variant="button" color="text" mb={3}>
        Review and edit the user details before adding
      </MDTypography>

      <MDBox mt={3}>
        {/* User Info Section */}
        <SummarySection title="User Information" stepIndex={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <EditableField
                label="First Name"
                value={values.firstName}
                fieldName="firstName"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <EditableField
                label="Last Name"
                value={values.lastName}
                fieldName="lastName"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DisplayField
                label="User Role"
                value={formatRole(values.role)}
              />
            </Grid>
            {values.role !== "model" && (
              <Grid item xs={12} sm={6}>
                <EditableField
                  label="Company"
                  value={values.company}
                  fieldName="company"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <EditableField
                label="Email"
                value={values.email}
                fieldName="email"
                type="email"
              />
            </Grid>
          </Grid>
        </SummarySection>

        {/* Address Section */}
        <SummarySection title="Address" stepIndex={1}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <EditableField
                label="Address Line 1"
                value={values.address1}
                fieldName="address1"
              />
            </Grid>
            <Grid item xs={12}>
              <EditableField
                label="Address Line 2"
                value={values.address2}
                fieldName="address2"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DisplayField
                label="Country"
                value={values.country}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DisplayField
                label={values.country === "United States" ? "State" : "County"}
                value={values.county}
              />
            </Grid>
            <Grid item xs={12} sm={values.country === "United Kingdom" ? 6 : 12}>
              <EditableField
                label="City"
                value={values.city}
                fieldName="city"
              />
            </Grid>
            {values.country === "United Kingdom" && (
              <Grid item xs={12} sm={6}>
                <EditableField
                  label="Postcode"
                  value={values.postcode}
                  fieldName="postcode"
                />
              </Grid>
            )}
          </Grid>
        </SummarySection>

        {/* Socials Section - Only for models */}
        {isModel && (
          <SummarySection title="Social Media" stepIndex={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <EditableField
                  label="Twitter"
                  value={values.twitter}
                  fieldName="twitter"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <EditableField
                  label="Facebook"
                  value={values.facebook}
                  fieldName="facebook"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <EditableField
                  label="Instagram"
                  value={values.instagram}
                  fieldName="instagram"
                />
              </Grid>
            </Grid>
          </SummarySection>
        )}

        {/* Images Section */}
        <SummarySection title={isModel ? "Headshot" : "Profile Image"} stepIndex={isModel ? 3 : 2}>
          <MDBox display="flex" justifyContent="center" py={2}>
            {isModel ? (
              <MDBox textAlign="center">
                <ProfileAvatar src={values.headshot} size={120} />
                {values.headshot ? (
                  <MDTypography variant="caption" color="success" display="block" mt={1}>
                    Headshot uploaded
                  </MDTypography>
                ) : (
                  <MDTypography variant="caption" color="warning" display="block" mt={1}>
                    No headshot uploaded
                  </MDTypography>
                )}
              </MDBox>
            ) : (
              <MDBox textAlign="center">
                <ProfileAvatar src={values.profileAvatar} size={120} />
                {values.profileAvatar ? (
                  <MDTypography variant="caption" color="success" display="block" mt={1}>
                    Profile image uploaded
                  </MDTypography>
                ) : (
                  <MDTypography variant="caption" color="text" display="block" mt={1}>
                    No profile image (optional)
                  </MDTypography>
                )}
              </MDBox>
            )}
          </MDBox>
        </SummarySection>

        <Divider />

        {/* Final Notice */}
        <MDBox mt={2} p={2} borderRadius="lg" bgColor="info" variant="gradient">
          <MDTypography variant="body2" color="white">
            Click "Add User" to create this account. A welcome email will be sent to{" "}
            <strong>{values.email || "the user"}</strong> with their login details.
          </MDTypography>
        </MDBox>
      </MDBox>
    </MDBox>
  );
}

// typechecking props for Summary
Summary.propTypes = {
  formData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
  onEditStep: PropTypes.func,
};

Summary.defaultProps = {
  onEditStep: null,
};

export default Summary;
