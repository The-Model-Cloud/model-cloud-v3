import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, db, functions } from "config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import MusicVideoIcon from "@mui/icons-material/MusicVideo"; // TikTok
import RefreshIcon from "@mui/icons-material/Refresh";
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
  const [instagramFollowerCount, setInstagramFollowerCount] = useState(null);
  const [instagramLastChecked, setInstagramLastChecked] = useState(null);
  const [fetchingFollowers, setFetchingFollowers] = useState(false);
  const [followerError, setFollowerError] = useState(null);
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
          setInstagramFollowerCount(data.instagramFollowerCount || null);
          const lastChecked = data.instagramLastChecked?.toDate() || null;
          setInstagramLastChecked(lastChecked);
          setModelData({ uid: targetUid, ...data });

          // Auto-fetch Instagram followers if admin editing and has Instagram handle
          if (isAdminEdit && data.instagram) {
            const hoursSinceLastCheck = lastChecked
              ? (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60)
              : Infinity;

            // Fetch if never checked or last check was more than 24 hours ago
            if (hoursSinceLastCheck > 24) {
              fetchInstagramFollowersAuto(targetUid, data.instagram);
            }
          }
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

  // Auto-fetch function (doesn't log admin action since it's automatic)
  const fetchInstagramFollowersAuto = async (uid, instagramUsername) => {
    setFetchingFollowers(true);
    setFollowerError(null);

    try {
      const updateFollowerCount = httpsCallable(functions, "updateInstagramFollowerCount");
      const result = await updateFollowerCount({ uid, instagramUsername });

      if (result.data.success) {
        setInstagramFollowerCount(result.data.count);
        setInstagramLastChecked(new Date());
      }
    } catch (error) {
      console.error("Error fetching follower count:", error);
      setFollowerError(error.message || "Failed to fetch follower count");
    } finally {
      setFetchingFollowers(false);
    }
  };

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

  const formatFollowers = (count) => {
    if (!count && count !== 0) return "";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

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

        {/* Instagram Follower Count - Admin Only */}
        {isAdminEdit && links.instagram && (
          <MDBox mt={4}>
            <MDTypography variant="h6" mb={2}>
              Instagram Statistics
            </MDTypography>
            <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <InstagramIcon sx={{ color: "#E1306C", fontSize: 28 }} />

              {fetchingFollowers ? (
                <MDBox display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  <MDTypography variant="body2" color="text">
                    Fetching follower count...
                  </MDTypography>
                </MDBox>
              ) : instagramFollowerCount !== null ? (
                <MDTypography variant="body2" fontWeight="medium">
                  {formatFollowers(instagramFollowerCount)} followers
                </MDTypography>
              ) : (
                <MDTypography variant="body2" color="text">
                  No follower data
                </MDTypography>
              )}

              {instagramLastChecked && !fetchingFollowers && (
                <MDTypography variant="caption" color="text">
                  (Updated: {instagramLastChecked.toLocaleDateString()})
                </MDTypography>
              )}

              {!fetchingFollowers && (
                <MDButton
                  variant="text"
                  color="info"
                  size="small"
                  onClick={() => fetchInstagramFollowersAuto(targetUid, links.instagram)}
                  startIcon={<RefreshIcon />}
                  sx={{ minWidth: "auto", p: 0.5 }}
                >
                  Refresh
                </MDButton>
              )}
            </MDBox>

            {followerError && (
              <MDTypography variant="caption" color="error" mt={1}>
                {followerError}
              </MDTypography>
            )}
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

export default SocialMedia;
