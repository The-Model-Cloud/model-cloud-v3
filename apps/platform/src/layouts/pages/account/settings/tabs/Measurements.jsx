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
import selectOptions from "components/Profile/Measurements";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

function Measurements() {
  const { uid: impersonatedUid } = useParams(); // For admin editing
  const currentUser = auth.currentUser;
  const targetUid = impersonatedUid || currentUser?.uid;
  const isAdminEdit = !!impersonatedUid && currentUser?.uid !== impersonatedUid;

  const [data, setData] = useState({
    height: "",
    heightOriginal: "",
    bust: "",
    waist: "",
    waistOriginal: "",
    braSize: "",
    hips: "",
    hipsOriginal: "",
    chest: "",
    chestOriginal: "",
    insideLeg: "",
    collar: "",
    dressSize: "",
    shoeSize: "",
    cupSize: "",
    eyeColour: "",
    hairColour: "",
    gender: "",
  });
  const [adminData, setAdminData] = useState(null);
  const [modelData, setModelData] = useState(null);

  // Convert inches to cm (1 inch = 2.54 cm)
  const convertInchesToCm = (value) => {
    if (!value) return { cm: "", original: "" };
    const trimmed = String(value).trim();
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      // If value is likely already in cm (> 50), keep as-is
      // Otherwise convert from inches
      if (num > 50) {
        return { cm: String(Math.round(num)), original: trimmed };
      }
      return { cm: String(Math.round(num * 2.54)), original: trimmed };
    }
    return { cm: trimmed, original: trimmed };
  };

  // Convert height from feet/inches to cm (e.g., "5'6''" -> 168)
  const convertHeightToCm = (heightValue) => {
    if (!heightValue) return { cm: "", original: "" };

    const trimmed = String(heightValue).trim();

    // Match patterns like: 5'6'', 5'6", 5' 6", 5ft 6in, 5'6, etc.
    const feetInchesPattern = /(\d+)\s*[''′ft]*\s*(\d+)?\s*["''″in]*/i;
    const match = trimmed.match(feetInchesPattern);

    if (match && (trimmed.includes("'") || trimmed.includes("ft") || trimmed.includes("′"))) {
      const feet = parseInt(match[1], 10) || 0;
      const inches = parseInt(match[2], 10) || 0;
      // Convert to cm: 1 foot = 30.48 cm, 1 inch = 2.54 cm
      const totalCm = Math.round((feet * 30.48) + (inches * 2.54));
      return { cm: String(totalCm), original: trimmed };
    }

    // Already a number (cm), keep as-is
    if (/^\d+$/.test(trimmed)) {
      return { cm: trimmed, original: trimmed };
    }

    return { cm: trimmed, original: trimmed };
  };

  useEffect(() => {
    const fetchMeasurements = async () => {
      if (targetUid) {
        const ref = doc(db, "users", targetUid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const docData = snap.data();
          setData({
            height: docData.height || "",
            heightOriginal: docData.heightOriginal || "",
            bust: docData.bust || "",
            waist: docData.waist || "",
            waistOriginal: docData.waistOriginal || "",
            hips: docData.hips || "",
            hipsOriginal: docData.hipsOriginal || "",
            chest: docData.chest || "",
            chestOriginal: docData.chestOriginal || "",
            insideLeg: docData.insideLeg || "",
            collar: docData.collar || "",
            dressSize: docData.dressSize || "",
            shoeSize: docData.shoeSize || "",
            cupSize: docData.cupSize || "",
            eyeColour: docData.eyeColour || "",
            hairColour: docData.hairColour || "",
            gender: docData.gender || "",
            braSize: docData.braSize || "",
          });
          setModelData({ uid: targetUid, ...docData });
        }

        // Fetch admin data if admin is editing
        if (isAdminEdit && currentUser) {
          const adminRef = doc(db, "users", currentUser.uid);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            setAdminData({ uid: currentUser.uid, ...adminSnap.data() });
          }
        }
      }
    };
    fetchMeasurements();
  }, [targetUid, isAdminEdit, currentUser]);

  // Helper function to log admin edits
  const logAdminEdit = async (field, oldValue, newValue) => {
    if (isAdminEdit && adminData && modelData) {
      await logAdminAction({
        adminUid: adminData.uid,
        adminEmail: adminData.email || currentUser?.email,
        adminName: `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin",
        action: ADMIN_ACTIONS.EDIT_MODEL,
        description: `Edited model measurement: ${field}`,
        details: {
          modelUid: targetUid,
          modelEmail: modelData.email,
          modelName: `${modelData.firstName || ""} ${modelData.lastName || ""}`.trim(),
          field,
          oldValue,
          newValue,
        },
      });
    }
  };

  const handleChange = (field) => async (e) => {
    const value = e.target.value;
    const oldValue = data[field];
    setData((prev) => ({ ...prev, [field]: value }));

    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { [field]: value });
      if (isAdminEdit && oldValue !== value) {
        await logAdminEdit(field, oldValue, value);
      }
    }
  };

  // Track height input separately for live typing
  const [heightInput, setHeightInput] = useState("");

  // Sync heightInput with data.height when data loads
  useEffect(() => {
    if (data.height) {
      setHeightInput(data.height);
    }
  }, [data.height]);

  // Handle height typing (no conversion yet)
  const handleHeightInput = (e) => {
    setHeightInput(e.target.value);
  };

  // Convert and save on blur (when user finishes typing)
  const handleHeightBlur = async () => {
    const oldValue = data.height;
    const { cm, original } = convertHeightToCm(heightInput);

    setHeightInput(cm); // Show converted value
    setData((prev) => ({ ...prev, height: cm, heightOriginal: original }));

    if (targetUid && cm !== oldValue) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { height: cm, heightOriginal: original });
      if (isAdminEdit) {
        await logAdminEdit("height", oldValue, cm);
      }
    }
  };

  // Track waist input separately for live typing
  const [waistInput, setWaistInput] = useState("");
  useEffect(() => {
    if (data.waist) setWaistInput(data.waist);
  }, [data.waist]);

  const handleWaistBlur = async () => {
    const oldValue = data.waist;
    const { cm, original } = convertInchesToCm(waistInput);
    setWaistInput(cm);
    setData((prev) => ({ ...prev, waist: cm, waistOriginal: original }));
    if (targetUid && cm !== oldValue) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { waist: cm, waistOriginal: original });
      if (isAdminEdit) await logAdminEdit("waist", oldValue, cm);
    }
  };

  // Track hips input separately for live typing
  const [hipsInput, setHipsInput] = useState("");
  useEffect(() => {
    if (data.hips) setHipsInput(data.hips);
  }, [data.hips]);

  const handleHipsBlur = async () => {
    const oldValue = data.hips;
    const { cm, original } = convertInchesToCm(hipsInput);
    setHipsInput(cm);
    setData((prev) => ({ ...prev, hips: cm, hipsOriginal: original }));
    if (targetUid && cm !== oldValue) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { hips: cm, hipsOriginal: original });
      if (isAdminEdit) await logAdminEdit("hips", oldValue, cm);
    }
  };

  // Track chest input separately for live typing
  const [chestInput, setChestInput] = useState("");
  useEffect(() => {
    if (data.chest) setChestInput(data.chest);
  }, [data.chest]);

  const handleChestBlur = async () => {
    const oldValue = data.chest;
    const { cm, original } = convertInchesToCm(chestInput);
    setChestInput(cm);
    setData((prev) => ({ ...prev, chest: cm, chestOriginal: original }));
    if (targetUid && cm !== oldValue) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { chest: cm, chestOriginal: original });
      if (isAdminEdit) await logAdminEdit("chest", oldValue, cm);
    }
  };

  const handleAutocompleteChange = (field) => async (event, value) => {
    const oldValue = data[field];
    setData((prev) => ({ ...prev, [field]: value }));

    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { [field]: value });
      if (isAdminEdit && oldValue !== value) {
        await logAdminEdit(field, oldValue, value);
      }
    }
  };

  return (
    <Card>
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
          Measurements
        </MDTypography>
      </MDBox>
      <MDBox p={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={2}>
            <FormField
              label="Height"
              value={heightInput}
              onChange={handleHeightInput}
              onBlur={handleHeightBlur}
              placeholder="e.g. 170 or 5'7"
              helperText="Enter cm or feet'inches"
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormField
              label="Waist"
              value={waistInput}
              onChange={(e) => setWaistInput(e.target.value)}
              onBlur={handleWaistBlur}
              placeholder="e.g. 66 or 26"
              helperText="Enter cm or inches"
            />
          </Grid>
          {data.gender !== "Man" && (
            <Grid item xs={12} sm={2}>
              <FormField
                label="Hips"
                value={hipsInput}
                onChange={(e) => setHipsInput(e.target.value)}
                onBlur={handleHipsBlur}
                placeholder="e.g. 91 or 36"
                helperText="Enter cm or inches"
              />
            </Grid>
          )}
          {data.gender == "Man" && (
            <Grid item xs={12} sm={2}>
              <FormField
                label="Chest"
                value={chestInput}
                onChange={(e) => setChestInput(e.target.value)}
                onBlur={handleChestBlur}
                placeholder="e.g. 102 or 40"
                helperText="Enter cm or inches"
              />
            </Grid>
          )}
          {data.gender == "Man" && (
            <Grid item xs={12} sm={2}>
              <FormField
                label="Inside Leg (cm)"
                value={data.insideLeg}
                onChange={handleChange("insideLeg")}
                inputProps={{ type: "number" }}
              />
            </Grid>
          )}
          {data.gender == "Man" && (
            <Grid item xs={12} sm={2}>
              <FormField
                label="Collar (cm)"
                value={data.collar}
                onChange={handleChange("collar")}
                inputProps={{ type: "number" }}
              />
            </Grid>
          )}
        </Grid>
      </MDBox>
      <MDBox p={3}>
        <Grid container spacing={3}>
          {data.gender !== "Man" && (
            <Grid item xs={12} sm={2}>
              <Autocomplete
                value={data.braSize}
                options={selectOptions.braSizes}
                onChange={handleAutocompleteChange("braSize")}
                renderInput={(params) => <FormField {...params} label="Bra Size" />}
              />
            </Grid>
          )}
          {data.gender !== "Man" && (
            <Grid item xs={12} sm={2}>
              <Autocomplete
                value={data.dressSize}
                options={selectOptions.dressSizes}
                onChange={handleAutocompleteChange("dressSize")}
                renderInput={(params) => <FormField {...params} label="Dress Size (UK)" />}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={2}>
            <Autocomplete
              value={data.shoeSize}
              options={selectOptions.shoeSizes}
              onChange={handleAutocompleteChange("shoeSize")}
              renderInput={(params) => <FormField {...params} label="Shoe Size (UK)" />}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Autocomplete
              value={data.eyeColour}
              options={selectOptions.eyeColours}
              onChange={handleAutocompleteChange("eyeColour")}
              renderInput={(params) => <FormField {...params} label="Eye Colour" />}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Autocomplete
              value={data.hairColour}
              options={selectOptions.hairColours}
              onChange={handleAutocompleteChange("hairColour")}
              renderInput={(params) => <FormField {...params} label="Hair Colour" />}
            />
          </Grid>

        </Grid>
      </MDBox>
    </Card >
  );
}

export default Measurements;
