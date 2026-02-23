/**
 * CloudinaryImageInput - A component for entering/uploading Cloudinary images
 * Used in CMS for managing website images
 */

import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;

/**
 * Get optimized thumbnail URL from Cloudinary
 */
const getCloudinaryThumbnail = (url, width = 100, height = 100) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/c_fill,g_face,w_${width},h_${height},q_auto,f_auto/${parts[1]}`;
};

export default function CloudinaryImageInput({
  value,
  onChange,
  label = "Image URL",
  placeholder = "Enter Cloudinary URL or upload image",
  folder = "website/cms",
  size = "small",
  showPreview = true,
  previewSize = 80,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "ml_default");
      formData.append("folder", folder);

      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onChange(data.secure_url);
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so the same file can be selected again
    event.target.value = "";
  };

  const handleRemove = () => {
    onChange("");
  };

  const thumbnailUrl = value ? getCloudinaryThumbnail(value, previewSize * 2, previewSize * 2) : null;

  return (
    <Box>
      <Box display="flex" alignItems="flex-start" gap={1}>
        <TextField
          fullWidth
          size={size}
          label={label}
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error}
          InputProps={{
            endAdornment: uploading ? <CircularProgress size={20} /> : null,
          }}
        />
        <Button
          variant="outlined"
          size={size}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          sx={{ minWidth: 100, height: size === "small" ? 40 : 56 }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        {value && (
          <IconButton
            size={size}
            color="error"
            onClick={handleRemove}
            sx={{ height: size === "small" ? 40 : 56 }}
          >
            <Icon>delete</Icon>
          </IconButton>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showPreview && thumbnailUrl && (
        <Box mt={1} display="flex" alignItems="center" gap={1}>
          <Box
            component="img"
            src={thumbnailUrl}
            alt="Preview"
            sx={{
              width: previewSize,
              height: previewSize,
              objectFit: "cover",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Preview
          </Typography>
        </Box>
      )}
    </Box>
  );
}
