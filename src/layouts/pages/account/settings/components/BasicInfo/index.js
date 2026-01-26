import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import FormField from "layouts/pages/account/components/FormField";
import MDInput from "components/MDInput";
import selectData from "layouts/pages/account/settings/components/BasicInfo/data/selectData";
import IconButton from "@mui/material/IconButton";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import ProfileAvatar from "components/Profile/ProfileAvatar";
import { currencies, rateTypes } from "config/paymentOptions";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

// Import countries and cities
import { getCountries, getCities } from "countries-cities";
import ukCounties from "uk-counties-cities-towns";
import stateCities from "state-cities";


const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;

function BasicInfo() {
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const { uid: impersonatedUid } = useParams(); // For admin editing
  const currentUser = auth.currentUser;
  const targetUid = impersonatedUid || currentUser?.uid;
  const isAdminEdit = !!impersonatedUid && currentUser?.uid !== impersonatedUid;

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    country: "",
    county: "",
    state: "",
    city: "",
    aboutMe: "",
    internalNotes: "",
    email: "",
    phone: "",
    languages: [],
    categories: [],
    profileAvatar: "",
    publicSlug: "",
    companyName: "",
    yearEstablished: "",
    companyNumber: "",
    registeredAddress: "",
    vatNumber: "",
    rate: "",
    rateType: "",
    currency: "",
  });

  const [userRole, setUserRole] = useState(null);
  const [adminData, setAdminData] = useState(null); // Store admin info for logging

  useEffect(() => {
    const fetchUser = async () => {
      if (targetUid) {
        // Fetch target user (model being edited)
        const ref = doc(db, "users", targetUid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            gender: data.gender || "",
            country: data.country || "",
            county: data.county || "",
            state: data.state || "",
            city: data.city || "",
            aboutMe: data.aboutMe || "",
            email: data.email || "",
            phone: data.phone || "",
            languages: data.languages || [],
            categories: data.categories || [],
            profileAvatar: data.profileAvatar || "",
            publicSlug: data.publicSlug || "",
            companyName: data.companyName || "",
            yearEstablished: data.yearEstablished || "",
            companyNumber: data.companyNumber || "",
            registeredAddress: data.registeredAddress || "",
            vatNumber: data.vatNumber || "",
            rate: data.rate || "",
            rateType: data.rateType || "",
            currency: data.currency || "",
          });
          setUserRole(data.role);

          // Handle UK Country and County Data
          if (data.country === "United Kingdom" && data.county) {
            setCities(ukCounties[data.county] || []);
          } else if (data.country === "United States" && data.state) {
            setCities((stateCities.getCities(data.state) || []).sort((a, b) => a.localeCompare(b)));
          } else if (data.country) {
            setCities((getCities(data.country) || []).sort((a, b) => a.localeCompare(b)));
          }
        }

        // If admin is editing another user, fetch admin info for logging
        if (isAdminEdit && currentUser) {
          const adminRef = doc(db, "users", currentUser.uid);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            setAdminData({ uid: currentUser.uid, ...adminSnap.data() });
          }
        }
      }
    };

    fetchUser();
  }, [targetUid, isAdminEdit, currentUser]);

  useEffect(() => {
    const allCountries = getCountries();
    const priorityCountries = ["United Kingdom", "Italy", "Spain", "France", "Germany", "United States"];
    const sortedOthers = allCountries
      .filter((c) => !priorityCountries.includes(c))
      .sort((a, b) => a.localeCompare(b));
    setCountries([...priorityCountries, "────────", ...sortedOthers]);
  }, []);


  // Helper function to log admin edits
  const logAdminEdit = async (field, oldValue, newValue) => {
    if (isAdminEdit && adminData) {
      await logAdminAction({
        adminUid: adminData.uid,
        adminEmail: adminData.email || currentUser?.email,
        adminName: `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin",
        action: ADMIN_ACTIONS.EDIT_MODEL,
        description: `Edited model profile field: ${field}`,
        details: {
          modelUid: targetUid,
          modelEmail: profile.email,
          modelName: `${profile.firstName} ${profile.lastName}`.trim(),
          field,
          oldValue,
          newValue,
        },
      });
    }
  };

  const handleChange = (field) => async (e) => {
    const value = e.target.value;
    const oldValue = profile[field];
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { [field]: value });
      // Log admin edit
      if (isAdminEdit && oldValue !== value) {
        await logAdminEdit(field, oldValue, value);
      }
    }
  };

  const handleAutocompleteChange = (field) => async (event, value) => {
    const oldValue = profile[field];
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { [field]: value });
      // Log admin edit
      if (isAdminEdit && JSON.stringify(oldValue) !== JSON.stringify(value)) {
        await logAdminEdit(field, oldValue, value);
      }
    }
  };

  const handleCountryChange = async (event, value) => {
    const oldCountry = profile.country;
    if (!value) {
      setProfile((prev) => ({ ...prev, country: "", city: "" }));
      setCities([]);
      if (targetUid) {
        const ref = doc(db, "users", targetUid);
        await updateDoc(ref, { country: "", city: "" });
        if (isAdminEdit && oldCountry) {
          await logAdminEdit("country", oldCountry, "");
        }
      }
      return;
    }

    let citiesList = [];
    if (value === "United Kingdom") {
      citiesList = []; // Wait for county selection
    } else if (value === "United States") {
      citiesList = []; // Wait for state selection
    } else {
      citiesList = (getCities(value) || []).sort((a, b) => a.localeCompare(b));
    }

    setProfile((prev) => ({ ...prev, country: value, city: "", county: "", state: "" }));
    setCities(citiesList);

    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { country: value, city: "", county: "", state: "" });
      if (isAdminEdit && oldCountry !== value) {
        await logAdminEdit("country", oldCountry, value);
      }
    }
  };

  const handleStateChange = async (event, value) => {
    const oldState = profile.state;
    const citiesList = (stateCities.getCities(value) || []).sort((a, b) => a.localeCompare(b));
    setProfile((prev) => ({ ...prev, state: value, city: "" }));
    setCities(citiesList);

    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { state: value, city: "" });
      if (isAdminEdit && oldState !== value) {
        await logAdminEdit("state", oldState, value);
      }
    }
  };

  const handleCountyChange = async (event, value) => {
    const oldCounty = profile.county;
    setProfile((prev) => ({ ...prev, county: value }));
    setCities(ukCounties[value] || []); // Populate towns based on county

    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { county: value });
      if (isAdminEdit && oldCounty !== value) {
        await logAdminEdit("county", oldCounty, value);
      }
    }
  };

  const handleCityChange = async (event, value) => {
    const oldCity = profile.city;
    setProfile((prev) => ({ ...prev, city: value }));
    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { city: value });
      if (isAdminEdit && oldCity !== value) {
        await logAdminEdit("city", oldCity, value);
      }
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

                      // Build folder path: /users/{models|clients}/{username}/profile
                      const userType = ["model", "talent"].includes(userRole?.toLowerCase()) ? "models" : "clients";
                      const username = profile.publicSlug || profile.firstName?.toLowerCase() || targetUid || "unknown";
                      const folderPath = `users/${userType}/${username}/profile`;

                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
                      formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
                      formData.append("folder", folderPath);
                      formData.append("public_id", `profile_${Date.now()}`);

                      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`, {
                        method: "POST",
                        body: formData,
                      });

                      const data = await res.json();

                      if (data.secure_url && targetUid) {
                        const oldAvatar = profile.profileAvatar;
                        const ref = doc(db, "users", targetUid);
                        await updateDoc(ref, { profileAvatar: data.secure_url });

                        setProfile((prev) => ({
                          ...prev,
                          profileAvatar: data.secure_url,
                        }));

                        // Log admin edit
                        if (isAdminEdit) {
                          await logAdminEdit("profileAvatar", oldAvatar, data.secure_url);
                        }
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
          <Grid item xs={12} sm={4}>
            <FormField
              label="First Name"
              placeholder="Russell"
              value={profile.firstName}
              onChange={handleChange("firstName")}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField
              label="Last Name"
              placeholder="English"
              value={profile.lastName}
              onChange={handleChange("lastName")}
            />
          </Grid>
          {userRole === "model" && (
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
          )}
          {userRole === "model" && (
            <Grid item xs={12}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={1}>
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
                    <Grid item xs={12} sm={2}>
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
                    <Grid item xs={12} sm={1}>
                      <Autocomplete
                        value={profile.yearOfBirth || (new Date().getFullYear() - 21).toString()} // Default to 21 years ago
                        options={selectData.years}
                        renderInput={(params) => (
                          <FormField {...params} label="Birth Year" InputLabelProps={{ shrink: true }} />
                        )}
                        onChange={handleAutocompleteChange("yearOfBirth")}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormField
                        label="Email"
                        value={profile.email}
                        inputProps={{ type: "email" }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormField
                        label="Phone Number"
                        placeholder="+44 7777 123456"
                        value={profile.phone}
                        onChange={handleChange("phone")}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
          <Grid item xs={12} sm={4}>
            <Autocomplete
              value={profile.country}
              options={countries}
              onChange={handleCountryChange}
              getOptionDisabled={(option) => option === "────────"}
              renderOption={(props, option) =>
                option === "────────" ? (
                  <li {...props} style={{ fontStyle: "italic", opacity: 0.5 }}>
                    ────────
                  </li>
                ) : (
                  <li {...props}>{option}</li>
                )
              }
              renderInput={(params) => (
                <FormField {...params} label="Country" InputLabelProps={{ shrink: true }} />
              )}
            />
          </Grid>

          {profile.country === "United Kingdom" && (
            <>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  value={profile.county}
                  options={Object.keys(ukCounties)}
                  onChange={handleCountyChange}
                  renderInput={(params) => (
                    <FormField {...params} label="County" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Autocomplete
                  value={profile.city}
                  options={cities}
                  onChange={handleCityChange}
                  renderInput={(params) => (
                    <FormField {...params} label="City/Town" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
            </>
          )}

          {/* Additional logic for other countries (US, etc.) */}
          {profile.country === "United States" && (
            <>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  value={profile.state}
                  options={stateCities.getStates().sort((a, b) => a.localeCompare(b))}
                  onChange={handleStateChange}
                  renderInput={(params) => (
                    <FormField {...params} label="State" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Autocomplete
                  value={profile.city}
                  options={cities}
                  onChange={handleCityChange}
                  renderInput={(params) => (
                    <FormField {...params} label="City" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
            </>
          )}

          {userRole === "model" && (
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                value={profile.languages}
                options={selectData.languages}
                renderInput={(params) => <FormField {...params} label="Language spoken" InputLabelProps={{ shrink: true }} />}
                onChange={handleAutocompleteChange("languages")}
              />
            </Grid>
          )}
          {userRole === "model" && (
            <>
              <Grid item xs={12} sm={2}>
                <FormField
                  label="Rate"
                  placeholder="e.g. 250"
                  value={profile.rate}
                  onChange={handleChange("rate")}
                  inputProps={{ type: "number" }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Autocomplete
                  value={profile.rateType}
                  options={rateTypes}
                  renderInput={(params) => (
                    <FormField {...params} label="Rate Type" InputLabelProps={{ shrink: true }} />
                  )}
                  onChange={handleAutocompleteChange("rateType")}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Autocomplete
                  value={profile.currency}
                  options={currencies}
                  renderInput={(params) => (
                    <FormField {...params} label="Currency" InputLabelProps={{ shrink: true }} />
                  )}
                  onChange={handleAutocompleteChange("currency")}
                />
              </Grid>
            </>
          )}
        </Grid>
        {userRole === "client" || userRole === "super admin" || userRole === "admin" ? (
          <Grid container mt={1} spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormField
                label="Phone Number"
                placeholder="+44 7777 123456"
                value={profile.phone}
                onChange={handleChange("phone")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Company Name" value={profile.companyName} onChange={handleChange("companyName")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Year Established" value={profile.yearEstablished} onChange={handleChange("yearEstablished")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Company Number" value={profile.companyNumber} onChange={handleChange("companyNumber")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Registered Address" value={profile.registeredAddress} onChange={handleChange("registeredAddress")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="VAT Number (if applicable)" value={profile.vatNumber} onChange={handleChange("vatNumber")} />
            </Grid>
          </Grid>
        ) : null}
        {userRole === "model" && (
          <Grid container mt={1} spacing={3}>
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
                placeholder="Tell us something unique about yourself and if you have any hidden talents and abilities."
                value={profile.aboutMe}
                onChange={handleChange("aboutMe")}
                multiline
                rows={5}
              />
            </Grid>
          </Grid>
        )}
        {userRole === "super admin" && (
          <Grid container mt={1} spacing={3}>
            <Grid item xs={12} sm={12}>
              <FormField
                label="Internal details about this model"
                placeholder="Tell us something unique about yourself and if you have any hidden talents and abilities."
                value={profile.internalNotes}
                onChange={handleChange("internalNotes")}
                multiline rows={5}
              />
            </Grid>
          </Grid>
        )}
      </MDBox>
    </Card>
  );
}

export default BasicInfo;
