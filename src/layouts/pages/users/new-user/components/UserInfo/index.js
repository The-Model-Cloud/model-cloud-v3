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

// prop-type is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// NewUser page components
import FormField from "layouts/pages/users/new-user/components/FormField";

// Auth context
import { useAuth } from "context/AuthContext";

// Organisation utilities
import { getAllOrganisations, getOrganisationByName } from "utils/organisations";

// Support request utilities
import { sendOrganisationChangeRequest } from "utils/supportRequests";

// Modal component
import RequestChangeModal from "components/RequestChangeModal";

function UserInfo({ formData }) {
  const { formField, values, errors, touched, setFieldValue } = formData;
  const {
    firstName,
    lastName,
    company,
    yearEstablished,
    companyNumber,
    registeredAddress,
    vatNumber,
    email,
    password,
    repeatPassword,
  } = formField;
  const {
    firstName: firstNameV,
    lastName: lastNameV,
    company: companyV,
    yearEstablished: yearEstablishedV,
    companyNumber: companyNumberV,
    registeredAddress: registeredAddressV,
    vatNumber: vatNumberV,
    email: emailV,
    password: passwordV,
    repeatPassword: repeatPasswordV,
  } = values;

  // Auth context for role-based logic
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  // Organisation state
  const [organisations, setOrganisations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Fetch organisations on mount
  useEffect(() => {
    const fetchOrganisations = async () => {
      setLoadingOrgs(true);
      try {
        const allOrgs = await getAllOrganisations();
        setOrganisations(allOrgs.map((org) => org.companyName));
      } catch (error) {
        console.error("Error fetching organisations:", error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchOrganisations();
  }, []);

  // Handle company selection and auto-fill organisation details
  const handleCompanyChange = async (event, newValue) => {
    if (setFieldValue) {
      setFieldValue("company", newValue || "");

      // If selecting from dropdown (not typing), fetch full org details
      if (newValue && organisations.includes(newValue)) {
        try {
          const org = await getOrganisationByName(newValue);
          if (org) {
            setSelectedOrg(org);
            setFieldValue("yearEstablished", org.yearEstablished || "");
            setFieldValue("companyNumber", org.companyNumber || "");
            setFieldValue("registeredAddress", org.registeredAddress || "");
            setFieldValue("vatNumber", org.vatNumber || "");
          }
        } catch (error) {
          console.error("Error fetching organisation details:", error);
        }
      } else {
        // User is typing a new company name
        setSelectedOrg(null);
      }
    }
  };

  // Handle input change for freeSolo typing
  const handleCompanyInputChange = (event, newInputValue) => {
    if (setFieldValue) {
      setFieldValue("company", newInputValue);
    }
  };

  // Handle change request submission
  const handleChangeRequest = async (changeData) => {
    setRequestLoading(true);
    setRequestError(null);
    setRequestSuccess(false);

    try {
      await sendOrganisationChangeRequest(user, selectedOrg, changeData);
      setRequestSuccess(true);
    } catch (error) {
      console.error("Error sending change request:", error);
      setRequestError(error.message || "Failed to send request. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  // Close modal and reset state
  const handleCloseModal = () => {
    setRequestModalOpen(false);
    // Reset after a delay to allow animation
    setTimeout(() => {
      setRequestError(null);
      setRequestSuccess(false);
    }, 300);
  };

  return (
    <MDBox>
      <MDBox lineHeight={0}>
        <MDTypography variant="h5">About me</MDTypography>
        <MDTypography variant="button" color="text">
          Tell us some information
        </MDTypography>
      </MDBox>
      <MDBox mt={1.625}>
        {/* Name fields */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              type={firstName.type}
              label={firstName.label}
              name={firstName.name}
              value={firstNameV}
              placeholder={firstName.placeholder}
              error={errors.firstName && touched.firstName}
              success={firstNameV.length > 0 && !errors.firstName}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              type={lastName.type}
              label={lastName.label}
              name={lastName.name}
              value={lastNameV}
              placeholder={lastName.placeholder}
              error={errors.lastName && touched.lastName}
              success={lastNameV.length > 0 && !errors.lastName}
            />
          </Grid>
        </Grid>

        {/* Company Name field - conditional based on role */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            {isAdmin ? (
              // Admin/Super Admin: Autocomplete with freeSolo
              <Autocomplete
                freeSolo
                options={organisations}
                loading={loadingOrgs}
                value={companyV || ""}
                onChange={handleCompanyChange}
                onInputChange={handleCompanyInputChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={company.label}
                    name={company.name}
                    placeholder="Select existing or enter new company"
                    variant="standard"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingOrgs ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            ) : (
              // Client/Account Manager: Read-only field with request button
              <MDBox>
                <FormField
                  type={company.type}
                  label={company.label}
                  name={company.name}
                  value={companyV}
                  placeholder={company.placeholder}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
                {companyV && (
                  <MDButton
                    variant="text"
                    color="info"
                    size="small"
                    onClick={() => setRequestModalOpen(true)}
                    sx={{ mt: 0.5 }}
                    startIcon={<Icon>edit</Icon>}
                  >
                    Request Change Details
                  </MDButton>
                )}
              </MDBox>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              type={email.type}
              label={email.label}
              name={email.name}
              value={emailV}
              placeholder={email.placeholder}
              error={errors.email && touched.email}
              success={emailV.length > 0 && !errors.email}
            />
          </Grid>
        </Grid>

        {/* Organisation Detail Fields */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              type={yearEstablished.type}
              label={yearEstablished.label}
              name={yearEstablished.name}
              value={yearEstablishedV}
              placeholder="e.g. 2010"
              disabled={!isAdmin}
              error={errors.yearEstablished && touched.yearEstablished}
              success={yearEstablishedV?.length > 0 && !errors.yearEstablished}
              InputProps={{
                readOnly: !isAdmin,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              type={companyNumber.type}
              label={companyNumber.label}
              name={companyNumber.name}
              value={companyNumberV}
              placeholder="e.g. 12345678"
              disabled={!isAdmin}
              InputProps={{
                readOnly: !isAdmin,
              }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              type={registeredAddress.type}
              label={registeredAddress.label}
              name={registeredAddress.name}
              value={registeredAddressV}
              placeholder="Registered business address"
              disabled={!isAdmin}
              InputProps={{
                readOnly: !isAdmin,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              type={vatNumber.type}
              label={vatNumber.label}
              name={vatNumber.name}
              value={vatNumberV}
              placeholder="e.g. GB123456789"
              disabled={!isAdmin}
              InputProps={{
                readOnly: !isAdmin,
              }}
            />
          </Grid>
        </Grid>

        {/* Password fields */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormField
              type={password.type}
              label={password.label}
              name={password.name}
              value={passwordV}
              placeholder={password.placeholder}
              error={errors.password && touched.password}
              success={passwordV.length > 0 && !errors.password}
              inputProps={{ autoComplete: "" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              type={repeatPassword.type}
              label={repeatPassword.label}
              name={repeatPassword.name}
              value={repeatPasswordV}
              placeholder={repeatPassword.placeholder}
              error={errors.repeatPassword && touched.repeatPassword}
              success={repeatPasswordV.length > 0 && !errors.repeatPassword}
              inputProps={{ autoComplete: "" }}
            />
          </Grid>
        </Grid>
      </MDBox>

      {/* Request Change Modal */}
      <RequestChangeModal
        open={requestModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleChangeRequest}
        currentOrganisation={selectedOrg || { companyName: companyV }}
        loading={requestLoading}
        error={requestError}
        success={requestSuccess}
      />
    </MDBox>
  );
}

// typechecking props for UserInfo
UserInfo.propTypes = {
  formData: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
};

export default UserInfo;
