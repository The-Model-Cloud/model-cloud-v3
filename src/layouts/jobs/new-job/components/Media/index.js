import { useState } from "react";
import { useDropzone } from "react-dropzone";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;

function Media({ formik, jobRef, user }) {
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState(formik.values.media || []);

  // Build folder path: /users/clients/{username}/jobs/{jobReference}
  const getFolderPath = () => {
    const username = user?.username || user?.uid || "unknown";
    return `users/clients/${username}/jobs/${jobRef}`;
  };

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    setUploading(true);
    const uploaded = [];
    const folderPath = getFolderPath();

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
      formData.append("folder", folderPath);
      formData.append("public_id", `${jobRef}_${Date.now()}`);

      try {
        const res = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          uploaded.push(data.secure_url);
        }
      } catch (error) {
        console.error("Cloudinary upload error:", error);
      }
    }

    const updated = [...media, ...uploaded];
    setMedia(updated);
    formik.setFieldValue("media", updated);
    setUploading(false);
  };

  const handleDelete = (url) => {
    const updated = media.filter((item) => item !== url);
    setMedia(updated);
    formik.setFieldValue("media", updated);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
    },
    maxFiles: 10,
    maxSize: 100 * 1024 * 1024, // 100MB max
  });

  return (
    <MDBox>
      <MDTypography variant="h5">Upload Reference Material</MDTypography>
      <MDBox mt={3}>
        <MDBox mb={1} ml={0.5}>
          <MDTypography component="label" variant="button" fontWeight="regular" color="text">
            Attach example images, references, or moodboards (images and videos supported)
          </MDTypography>
        </MDBox>

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
            {isDragActive ? "Drop the files here..." : "Drag & drop or click to upload images/videos"}
          </MDTypography>
          {uploading && (
            <MDBox mt={2}>
              <CircularProgress size={24} color="info" />
            </MDBox>
          )}
        </MDBox>

        {media.length > 0 && (
          <MDBox mt={4} display="flex" flexWrap="wrap" gap={2}>
            {media.map((url, index) => {
              const isVideo = url.match(/\.(mp4|mov|webm)$/i);
              return (
                <MDBox key={index} position="relative" width="180px">
                  {isVideo ? (
                    <video
                      src={url}
                      controls
                      style={{ width: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
                    />
                  ) : (
                    <MDBox
                      component="img"
                      src={url}
                      alt={`Media ${index}`}
                      width="100%"
                      borderRadius="lg"
                      boxShadow="md"
                    />
                  )}
                  <MDBox position="absolute" top={4} right={4}>
                    <IconButton onClick={() => handleDelete(url)} size="small" color="error" sx={{ bgcolor: "white" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </MDBox>
                </MDBox>
              );
            })}
          </MDBox>
        )}
      </MDBox>
    </MDBox>
  );
}

export default Media;
