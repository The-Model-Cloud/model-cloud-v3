import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import { ReactSortable } from "react-sortablejs";
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`;

// Map fieldName to folder subfolder name
const getImageSubfolder = (field) => {
  const mapping = {
    profileAvatar: "profile",
    digitalImages: "digitals",
    portfolioImages: "polaroids",
  };
  return mapping[field] || "uploads";
};

// Get user type folder based on role
const getUserTypeFolder = (role) => {
  const modelRoles = ["model", "talent"];
  return modelRoles.includes(role?.toLowerCase()) ? "models" : "clients";
};

function ImageUploader({ fieldName, title, subtitle, maxFiles = 20 }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [userData, setUserData] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const { uid: impersonatedUid } = useParams(); // For admin impersonation
  const currentUser = auth.currentUser;
  const targetUid = impersonatedUid || currentUser?.uid;
  const isAdminEdit = !!impersonatedUid && currentUser?.uid !== impersonatedUid;

  useEffect(() => {
    const fetchImages = async () => {
      if (targetUid) {
        const ref = doc(db, "users", targetUid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          // Store user data for folder path generation
          setUserData({ uid: targetUid, ...data });

          let imageUrls = data[fieldName] || [];

          // MIGRATION FALLBACK: If new field is empty but old 'portfolio' exists
          if (imageUrls.length === 0 && fieldName === "portfolioImages" && data.portfolio?.length > 0) {
            console.log("Migrating old portfolio data to portfolioImages...");
            imageUrls = data.portfolio;

            // Auto-migrate to new field
            await updateDoc(ref, {
              portfolioImages: data.portfolio,
              digitalImages: data.digitalImages || [],
            });

            console.log("Migration complete!");
          }

          const formatted = imageUrls.map((url) => ({ id: url, url }));
          setImages(formatted);
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
    fetchImages();
  }, [targetUid, fieldName, isAdminEdit, currentUser]);

  // Helper function to log admin edits
  const logAdminEdit = async (action, details) => {
    if (isAdminEdit && adminData && userData) {
      await logAdminAction({
        adminUid: adminData.uid,
        adminEmail: adminData.email || currentUser?.email,
        adminName: `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin",
        action: ADMIN_ACTIONS.EDIT_MODEL,
        description: `${action} for model's ${fieldName}`,
        details: {
          modelUid: targetUid,
          modelEmail: userData.email,
          modelName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
          field: fieldName,
          ...details,
        },
      });
    }
  };

  // Build folder path: /users/{models|clients}/{username}/{imageType}
  const getFolderPath = () => {
    const userType = getUserTypeFolder(userData?.role);
    const username = userData?.username || userData?.uid || "unknown";
    const subfolder = getImageSubfolder(fieldName);
    return `users/${userType}/${username}/${subfolder}`;
  };

  const onDrop = async (acceptedFiles, rejectedFiles) => {
    // Clear any previous errors
    setUploadError(null);

    // Handle rejected files (too large, wrong format, etc.)
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(({ file, errors }) => {
        const errorMessages = errors.map(e => {
          if (e.code === 'file-too-large') {
            return `${file.name} is too large (max 5MB)`;
          }
          if (e.code === 'file-invalid-type') {
            return `${file.name} is not a supported image format`;
          }
          return `${file.name}: ${e.message}`;
        });
        return errorMessages.join(', ');
      });

      setUploadError(errors.join(' • '));
      
      // Auto-clear error after 8 seconds
      setTimeout(() => setUploadError(null), 8000);
      
      // If there are no accepted files, stop here
      if (acceptedFiles.length === 0) return;
    }

    if (!acceptedFiles.length) return;

    setUploading(true);
    
    // Initialize uploading files with preview URLs
    const filesPreviews = acceptedFiles.map(file => ({
      name: file.name,
      preview: URL.createObjectURL(file),
      status: 'uploading', // 'uploading' | 'success' | 'error'
      progress: 0
    }));
    setUploadingFiles(filesPreviews);

    const uploadedUrls = [];
    const uploadErrors = [];

    const folderPath = getFolderPath();
    const subfolder = getImageSubfolder(fieldName);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
      formData.append("folder", folderPath);
      formData.append("public_id", `${subfolder}_${Date.now()}_${i}`);

      try {
        // Update to show progress
        setUploadingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, progress: 50 } : f
        ));

        const res = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        
        if (data.error) {
          uploadErrors.push(`${file.name}: ${data.error.message}`);
          setUploadingFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error', progress: 100 } : f
          ));
        } else if (data.secure_url) {
          uploadedUrls.push({ id: data.secure_url, url: data.secure_url });
          setUploadingFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'success', progress: 100 } : f
          ));
        }
      } catch (error) {
        console.error("Cloudinary upload error:", error);
        uploadErrors.push(`${file.name}: Upload failed`);
        setUploadingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', progress: 100 } : f
        ));
      }
    }

    // Show any upload errors
    if (uploadErrors.length > 0) {
      setUploadError(uploadErrors.join(' • '));
      setTimeout(() => setUploadError(null), 8000);
    }

    // Only add successfully uploaded images
    if (uploadedUrls.length > 0) {
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);

      if (targetUid) {
        const ref = doc(db, "users", targetUid);
        await updateDoc(ref, { [fieldName]: newImages.map((img) => img.url) });

        // Log admin edit
        if (isAdminEdit) {
          await logAdminEdit("Uploaded images", {
            imagesAdded: uploadedUrls.length,
            newTotalImages: newImages.length,
          });
        }
      }
    }

    setUploading(false);
    
    // Clear uploading files after a brief delay
    setTimeout(() => {
      setUploadingFiles([]);
    }, 2000);
  };

  const handleDelete = async (url) => {
    const filtered = images.filter((img) => img.url !== url);
    setImages(filtered);

    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { [fieldName]: filtered.map((img) => img.url) });

      // Log admin edit
      if (isAdminEdit) {
        await logAdminEdit("Deleted image", {
          deletedImageUrl: url,
          remainingImages: filtered.length,
        });
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxFiles,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      uploadingFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [uploadingFiles]);

  return (
    <Card>
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
          {title}
        </MDTypography>
        {subtitle && (
          <MDTypography variant="body2" color="text" mb={2}>
            {subtitle}
          </MDTypography>
        )}
      </MDBox>

      <MDBox p={3}>
        <MDBox
          {...getRootProps()}
          border="2px dashed"
          borderColor={uploadError ? "error.main" : isDragActive ? "info.main" : "grey.400"}
          bgcolor={uploadError ? "error.light" : "transparent"}
          p={4}
          textAlign="center"
          borderRadius="lg"
          sx={{ 
            cursor: "pointer", 
            transition: "all 0.3s",
            opacity: uploadError ? 0.9 : 1
          }}
        >
          <input {...getInputProps()} />
          
          {uploadError ? (
            <>
              <MDBox sx={{ color: "error.main" }}>
                <CloudUploadIcon sx={{ fontSize: 40 }} />
              </MDBox>
              <MDTypography variant="body1" mt={1} color="error" fontWeight="medium">
                Upload Error
              </MDTypography>
              <MDTypography variant="body2" color="error" mt={1}>
                {uploadError}
              </MDTypography>
              <MDTypography variant="caption" color="text" display="block" mt={2}>
                Click or drag to try again
              </MDTypography>
            </>
          ) : (
            <>
              <CloudUploadIcon sx={{ fontSize: 40, color: "info.main" }} />
              <MDTypography variant="body1" mt={1}>
                {isDragActive ? "Drop the files here..." : "Drag & drop or click to upload images"}
              </MDTypography>
              <MDTypography variant="caption" color="text" display="block" mt={1}>
                Max {maxFiles} images • 5MB per file • JPG, PNG, WEBP
              </MDTypography>
            </>
          )}
          
          {uploading && (
            <MDBox mt={2}>
              <CircularProgress size={24} color="info" />
              <MDTypography variant="caption" display="block" mt={1}>
                Uploading...
              </MDTypography>
            </MDBox>
          )}
        </MDBox>

        {/* Upload Progress Indicators */}
        {uploadingFiles.length > 0 && (
          <MDBox mt={4} mb={4}>
            <MDTypography variant="h6" mb={2}>
              Uploading {uploadingFiles.length} {uploadingFiles.length === 1 ? "file" : "files"}...
            </MDTypography>
            <Grid container spacing={2}>
              {uploadingFiles.map((file, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <MDBox position="relative">
                    <MDBox
                      component="img"
                      src={file.preview}
                      alt={file.name}
                      width="100%"
                      height="250px"
                      borderRadius="lg"
                      sx={{ 
                        objectFit: "cover",
                        opacity: file.status === 'uploading' ? 0.5 : 1,
                        filter: file.status === 'error' ? 'grayscale(100%)' : 'none'
                      }}
                    />
                    
                    {/* Overlay with status */}
                    <MDBox
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      bgcolor="rgba(0,0,0,0.6)"
                      borderRadius="lg"
                    >
                      {file.status === 'uploading' && (
                        <>
                          <CircularProgress size={40} sx={{ color: "white", mb: 1 }} />
                          <MDTypography variant="caption" color="white" fontWeight="medium">
                            Uploading...
                          </MDTypography>
                        </>
                      )}
                      
                      {file.status === 'success' && (
                        <>
                          <MDBox 
                            sx={{ 
                              width: 48, 
                              height: 48, 
                              borderRadius: '50%', 
                              bgcolor: 'success.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1
                            }}
                          >
                            <MDTypography variant="h4" color="white">✓</MDTypography>
                          </MDBox>
                          <MDTypography variant="caption" color="white" fontWeight="medium">
                            Success!
                          </MDTypography>
                        </>
                      )}
                      
                      {file.status === 'error' && (
                        <>
                          <MDBox 
                            sx={{ 
                              width: 48, 
                              height: 48, 
                              borderRadius: '50%', 
                              bgcolor: 'error.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1
                            }}
                          >
                            <MDTypography variant="h4" color="white">✕</MDTypography>
                          </MDBox>
                          <MDTypography variant="caption" color="white" fontWeight="medium">
                            Failed
                          </MDTypography>
                        </>
                      )}
                    </MDBox>
                    
                    {/* File name */}
                    <MDBox mt={1}>
                      <MDTypography 
                        variant="caption" 
                        color="text"
                        sx={{ 
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {file.name}
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                </Grid>
              ))}
            </Grid>
          </MDBox>
        )}

        {/* Existing Images */}
        {images.length > 0 && (
          <MDBox mt={4}>
            <MDTypography variant="h6" mb={2}>
              {images.length} {images.length === 1 ? "Image" : "Images"} Uploaded
            </MDTypography>
            <Grid container spacing={2}>
              <ReactSortable
                list={images}
                setList={(newList) => {
                  setImages(newList);

                  // Save immediately with the new order
                  if (targetUid) {
                    const ref = doc(db, "users", targetUid);
                    const urls = newList.map((img) => img.url);

                    updateDoc(ref, { [fieldName]: urls })
                      .then(() => {
                        // Log admin edit for reordering
                        if (isAdminEdit) {
                          logAdminEdit("Reordered images", {
                            totalImages: newList.length,
                          });
                        }
                      })
                      .catch((error) => {
                        console.error("Failed to save order:", error);
                      });
                  }
                }}
                animation={200}
                style={{ display: "flex", flexWrap: "wrap", gap: "16px", width: "100%" }}
              >
                {images.map((img, index) => (
                  <div key={img.id} style={{ width: "calc(25% - 12px)", minWidth: "200px" }}>
                    <MDBox position="relative">
                      <MDBox
                        component="img"
                        src={img.url}
                        alt={`${title} ${index + 1}`}
                        width="100%"
                        height="250px"
                        borderRadius="lg"
                        boxShadow="md"
                        sx={{ 
                          cursor: "move", 
                          objectFit: "cover",
                          transition: "transform 0.2s",
                          "&:hover": {
                            transform: "scale(1.02)"
                          }
                        }}
                      />
                      <MDBox 
                        position="absolute" 
                        top={8} 
                        right={8}
                        bgcolor="rgba(0,0,0,0.6)"
                        borderRadius="50%"
                        p={0.5}
                      >
                        <IconButton 
                          onClick={() => handleDelete(img.url)} 
                          size="small" 
                          sx={{ color: "white" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </MDBox>
                    </MDBox>
                  </div>
                ))}
              </ReactSortable>
            </Grid>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

export default ImageUploader;