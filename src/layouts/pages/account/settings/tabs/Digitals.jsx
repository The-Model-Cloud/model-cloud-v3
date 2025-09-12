import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import { ReactSortable } from "react-sortablejs";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;

function Portfolio() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchImages = async () => {
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const portfolioUrls = data.portfolio || [];
          const formatted = portfolioUrls.map((url) => ({ id: url, url }));
          setImages(formatted);
        }
      }
    };
    fetchImages();
  }, [user]);

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    setUploading(true);
    const uploadedUrls = [];

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);

      try {
        const res = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          uploadedUrls.push({ id: data.secure_url, url: data.secure_url });
        }
      } catch (error) {
        console.error("Cloudinary upload error:", error);
      }
    }

    const newImages = [...images, ...uploadedUrls];
    setImages(newImages);

    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { portfolio: newImages.map((img) => img.url) });
    }

    setUploading(false);
  };

  const handleDelete = async (url) => {
    const filtered = images.filter((img) => img.url !== url);
    setImages(filtered);

    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { portfolio: filtered.map((img) => img.url) });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxFiles: 20,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <Card>
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
          Digitals Upload
        </MDTypography>

      </MDBox>
      <MDBox p={3}>
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
          <CloudUploadIcon sx={{ fontSize: 40, color: "info.main" }} />
          <MDTypography variant="body1" mt={1}>
            {isDragActive ? "Drop the files here..." : "Drag & drop or click to upload images"}
          </MDTypography>
          {uploading && (
            <MDBox mt={2}>
              <CircularProgress size={24} color="info" />
            </MDBox>
          )}
        </MDBox>

        <MDBox mt={4}>
          <Grid container spacing={2}>
            <ReactSortable
              list={images}
              setList={setImages}
              animation={200}
              style={{ display: "flex", flexWrap: "wrap", gap: "16px" }} // Optional: mimic MUI Grid gap
              onEnd={async () => {
                if (user) {
                  const ref = doc(db, "users", user.uid);
                  const urls = images.map((img) => img.url);
                  await updateDoc(ref, { portfolio: urls });
                }
              }}
            >
              {images.map((img, index) => (
                <div key={img.id} style={{ width: "calc(25% - 12px)", minWidth: "200px" }}>
                  <MDBox
                    component="img"
                    src={img.url}
                    alt={`Portfolio ${index}`}
                    width="100%"
                    height="auto"
                    borderRadius="lg"
                    boxShadow="lg"
                    sx={{ cursor: "move" }}
                  />
                  <MDBox textAlign="right" mt={1}>
                    <IconButton onClick={() => handleDelete(img.url)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </MDBox>
                </div>
              ))}
            </ReactSortable>
          </Grid>

        </MDBox>
      </MDBox>
    </Card>
  );
}

export default Portfolio;
