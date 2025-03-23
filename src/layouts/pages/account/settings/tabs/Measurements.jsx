import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import FormField from "layouts/pages/account/components/FormField";
import selectOptions from "components/Profile/Measurements"; 

function Measurements() {
  const user = auth.currentUser;
  const [data, setData] = useState({
    height: "",
    bust: "",
    waist: "",
    braSize: "",
    hips: "",
    chest: "",
    insideLeg: "",
    collar: "",
    dressSize: "",
    shoeSize: "",
    cupSize: "",
    eyeColour: "",
    hairColour: "",
    weight: "",
    gender: "",
  });

  useEffect(() => {
    const fetchMeasurements = async () => {
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const docData = snap.data();
          setData({
            height: docData.height || "",
            bust: docData.bust || "",
            waist: docData.waist || "",
            hips: docData.hips || "",
            chest: docData.chest || "",
            insideLeg: docData.insideLeg || "",
            collar: docData.collar || "",
            dressSize: docData.dressSize || "",
            shoeSize: docData.shoeSize || "",
            cupSize: docData.cupSize || "",
            eyeColour: docData.eyeColour || "",
            hairColour: docData.hairColour || "",
            weight: docData.weight || "",
            gender: docData.gender || "",
            braSize: docData.braSize || "",
          });
        }
      }
    };
    fetchMeasurements();
  }, [user]);

  const handleChange = (field) => async (e) => {
    const value = e.target.value;
    setData((prev) => ({ ...prev, [field]: value }));

    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { [field]: value });
    }
  };

  const handleAutocompleteChange = (field) => async (event, value) => {
    setData((prev) => ({ ...prev, [field]: value }));

    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { [field]: value });
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
              label="Height (cm)"
              value={data.height}
              onChange={handleChange("height")}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormField
              label="Weight (kg)"
              value={data.weight}
              onChange={handleChange("weight")}
              inputProps={{ type: "number" }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormField
              label="Waist (cm)"
              value={data.waist}
              onChange={handleChange("waist")}
              inputProps={{ type: "number" }}
            />
          </Grid>
          {data.gender !== "Man" && (
            <Grid item xs={12} sm={2}>
              <FormField
                label="Hips (cm)"
                value={data.hips}
                onChange={handleChange("hips")}
                inputProps={{ type: "number" }}
              />
            </Grid>
          )}
          {data.gender == "Man" && (
            <Grid item xs={12} sm={2}>
              <FormField
                label="Chest (cm)"
                value={data.chest}
                onChange={handleChange("chest")}
                inputProps={{ type: "number" }}
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
