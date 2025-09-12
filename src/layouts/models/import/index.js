import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useAuth } from "context/AuthContext";

// Firebase
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";

// UI
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Button from "@mui/material/Button";
import Icon from "@mui/material/Icon";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

function CircularProgressWithLabel({ value }) {
  return (
    <Box position="relative" display="inline-flex">
      <CircularProgress variant="determinate" value={value} />
      <Box
        top={0}
        left={0}
        bottom={0}
        right={0}
        position="absolute"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography variant="caption" component="div" color="text.secondary">
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ImportModels() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState([]);
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const allowedRoles = ["admin", "super admin"];
  const isAuthorised = user && allowedRoles.includes(user?.role);

  useEffect(() => {
    if (loading) return;
    if (!user || !allowedRoles.includes(user?.role)) {
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    setUploading(true);
    const file = acceptedFiles[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cleaned = res.data
          .filter((row) => row.email)
          .map((row) => {
            const {
              firstName,
              lastName,
              instagram,
              email,
              gender,
              phone,
              town,
              county,
              height,
              chest,
              waist,
              hips,
              shoeSize,
              aboutMe,
            } = row;

            return {
              firstName: firstName?.trim() ?? "",
              lastName: lastName?.trim() ?? "",
              instagram: instagram?.trim() ?? "",
              email: email?.trim().toLowerCase() ?? "",
              gender: gender?.trim() ?? "",
              phone: phone?.trim() ?? "",
              height: height?.trim() ?? "",
              chest: chest?.trim() ?? "",
              waist: waist?.trim() ?? "",
              hips: hips?.trim() ?? "",
              shoeSize: shoeSize?.trim() ?? "",
              aboutMe: aboutMe?.trim() ?? "",
              location: [town?.trim(), county?.trim()].filter(Boolean).join(", ")
            };
          });

        setRawData(cleaned);
        setUploading(false);
      },
    });
  };

  const handleImport = async () => {
    const auth = getAuth();
    const db = getFirestore();
    const feedback = [];

    for (let i = 0; i < rawData.length; i++) {
      const model = rawData[i];
      const email = model.email?.toLowerCase();
      if (!email) {
        feedback.push({ email: "(missing)", status: "error", message: "Missing email address" });
        setProgress(((i + 1) / rawData.length) * 100);
        continue;
      }

      const firstName = (model.firstName || "").trim().toLowerCase();
      const lastInitial = (model.lastName || "").trim().charAt(0).toLowerCase();
      const publicSlug = `${firstName}.${lastInitial}`;

      const modelData = {
        ...model,
        email,
        role: "model",
        publicSlug,
        updatedAt: new Date().toISOString(),
      };

      try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          await setDoc(docRef, {
            ...snapshot.docs[0].data(),
            ...modelData,
            status: "imported",
          });
          feedback.push({ email, status: "updated" });
        } else {
          const password = model.password || "Model123!";
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          const uid = userCred.user.uid;

          await setDoc(doc(db, "users", uid), {
            ...modelData,
            createdAt: new Date().toISOString(),
            status: "activated",
          });

          feedback.push({ email, status: "created" });
        }
      } catch (err) {
        feedback.push({ email, status: "error", message: err.message });
      }

      setProgress(((i + 1) / rawData.length) * 100);
    }

    setResults(feedback);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    maxSize: 2 * 1024 * 1024, // 2MB
  });

  if (loading) {
    return (
      <DashboardLayout>
        <MDBox p={3}><MDTypography>Loading...</MDTypography></MDBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={4} pb={3}>
        <Card>
          <MDBox p={3}>
            <MDTypography variant="h5" gutterBottom>Import Models via CSV</MDTypography>
            <MDBox
              {...getRootProps()}
              border="2px dashed"
              borderColor={isDragActive ? "info.main" : "grey.400"}
              p={4}
              textAlign="center"
              borderRadius="lg"
              sx={{ cursor: "pointer" }}
            >
              <input {...getInputProps()} />
              <Icon sx={{ fontSize: 40, color: "info.main" }}>cloud_upload</Icon>
              <MDTypography variant="body1" mt={1}>
                {isDragActive ? "Drop the CSV here..." : "Drag & drop or click to upload a CSV file"}
              </MDTypography>
              {uploading && (
                <MDBox mt={2}>
                  <CircularProgress size={24} color="info" />
                </MDBox>
              )}
            </MDBox>
          </MDBox>

          {rawData.length > 0 && (
            <MDBox px={3} pb={3}>
              <MDTypography>Rows ready to import: {rawData.length}</MDTypography>
              <Button variant="contained" color="info" onClick={handleImport} startIcon={<Icon>cloud_upload</Icon>}>
                Import {rawData.length} Models
              </Button>
            </MDBox>
          )}

          {progress > 0 && progress < 100 && (
            <MDBox px={3} pb={3}>
              <MDTypography variant="body2" mb={1}>Importing…</MDTypography>
              <CircularProgressWithLabel value={progress} />
            </MDBox>
          )}

          {results.length > 0 && (
            <MDBox px={3} pb={3}>
              <MDTypography variant="h6">Import Summary:</MDTypography>
              <ul>
                {results.map((res, i) => (
                  <li key={i}>
                    <strong>{res.email}</strong>: {res.status}
                    {res.message && ` — ${res.message}`}
                  </li>
                ))}
              </ul>
            </MDBox>
          )}
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
