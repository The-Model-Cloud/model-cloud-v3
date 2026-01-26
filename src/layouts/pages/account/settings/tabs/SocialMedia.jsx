import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";

import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import MusicVideoIcon from "@mui/icons-material/MusicVideo"; // TikTok
import { logAdminAction, ADMIN_ACTIONS } from "utils/adminLogs";

function SocialMedia() {
  const { uid: impersonatedUid } = useParams(); // For admin editing
  const currentUser = auth.currentUser;
  const targetUid = impersonatedUid || currentUser?.uid;
  const isAdminEdit = !!impersonatedUid && currentUser?.uid !== impersonatedUid;

  const [links, setLinks] = useState({
    instagram: "",
    tiktok: "",
    youtube: "",
  });
  const [adminData, setAdminData] = useState(null);
  const [modelData, setModelData] = useState(null);

  useEffect(() => {
    const fetchSocial = async () => {
      if (targetUid) {
        const ref = doc(db, "users", targetUid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setLinks({
            instagram: data.instagram || "",
            tiktok: data.tiktok || "",
            youtube: data.youtube || "",
          });
          setModelData({ uid: targetUid, ...data });
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
    fetchSocial();
  }, [targetUid, isAdminEdit, currentUser]);

  // Helper function to log admin edits
  const logAdminEdit = async (field, oldValue, newValue) => {
    if (isAdminEdit && adminData && modelData) {
      await logAdminAction({
        adminUid: adminData.uid,
        adminEmail: adminData.email || currentUser?.email,
        adminName: `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin",
        action: ADMIN_ACTIONS.EDIT_MODEL,
        description: `Edited model social media: ${field}`,
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

  const platformMeta = {
    instagram: {
      icon: <InstagramIcon color="primary" sx={{ mr: 1 }} />,
      baseUrl: "https://instagram.com/",
      sanitize: (v) => v.replace(/.*(?:instagram\.com\/|@|\/)/i, "").split("?")[0],
    },
    tiktok: {
      icon: <MusicVideoIcon color="secondary" sx={{ mr: 1 }} />,
      baseUrl: "https://tiktok.com/@",
      sanitize: (v) => v.replace(/.*(?:tiktok\.com\/@|@|\/)/i, "").split("?")[0],
    },
    youtube: {
      icon: <YouTubeIcon color="error" sx={{ mr: 1 }} />,
      baseUrl: "https://youtube.com/",
      sanitize: (v) => v.replace(/.*(?:youtube\.com\/|\/)/i, "").split("?")[0],
    },
  };

  const handleChange = (field) => async (e) => {
    let raw = e.target.value.trim();
    const sanitize = platformMeta[field]?.sanitize;
    const value = sanitize ? sanitize(raw) : raw;

    if (!value) return;

    const oldValue = links[field];
    setLinks((prev) => ({ ...prev, [field]: value }));

    if (targetUid) {
      const ref = doc(db, "users", targetUid);
      await updateDoc(ref, { [field]: value });
      if (isAdminEdit && oldValue !== value) {
        await logAdminEdit(field, oldValue, value);
      }
    }
  };

  const renderPreview = (platform, handle) =>
    handle ? (
      <MDBox display="flex" alignItems="center" mt={1}>
        {platformMeta[platform]?.icon}
        <MDTypography variant="body2" color="info">
          <a
            href={`${platformMeta[platform].baseUrl}${handle}`}
            target="_blank"
            rel="noreferrer"
          >
            {platformMeta[platform].baseUrl}
            {handle}
          </a>
        </MDTypography>
      </MDBox>
    ) : (
      <MDTypography variant="caption" color="text" mt={1}>
        No {platform} link added
      </MDTypography>
    );

  return (
    <Card>
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
          Social Media
        </MDTypography>
      </MDBox>
      <MDBox p={3}>
        <Grid container spacing={3}>
          {Object.keys(platformMeta).map((platform) => (
            <Grid item xs={12} md={4} key={platform}>
              <MDInput
                label={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL or @handle`}
                value={links[platform]}
                onChange={handleChange(platform)}
                fullWidth
              />
              {renderPreview(platform, links[platform])}
            </Grid>
          ))}
        </Grid>
      </MDBox>
    </Card>
  );
}

export default SocialMedia;
