import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";

import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import TwitterIcon from "@mui/icons-material/Twitter";
import MusicVideoIcon from "@mui/icons-material/MusicVideo"; // TikTok

function SocialMedia() {
  const [links, setLinks] = useState({
    instagram: "",
    tiktok: "",
    youtube: "",
  });

  const user = auth.currentUser;

  useEffect(() => {
    const fetchSocial = async () => {
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setLinks({
            instagram: data.instagram || "",
            tiktok: data.tiktok || "",
            youtube: data.youtube || "",
          });
        }
      }
    };
    fetchSocial();
  }, [user]);

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

    setLinks((prev) => ({ ...prev, [field]: value }));

    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { [field]: value });
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
