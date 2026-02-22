import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "config/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { doesModelMatchJob } from "utils/matching";
import { useAuth } from "context/AuthContext";
import { useFavourites } from "context/FavouritesContext";
import { isUnverifiedModel } from "utils/verification";

// @mui material components
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Alert from "@mui/material/Alert";

// @mui icons
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 3 PRO React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ProfileInfoCard from "examples/Cards/InfoCards/ProfileInfoCard";

// Overview page components
import ProfileCompletion from "components/ProfileCompletion";
import ConversationsWidget from "components/ConversationsWidget";
import ZCardWidget from "components/ZCard/ZCardWidget";
import Header from "layouts/pages/profile/components/Header";
import PlatformSettings from "layouts/pages/profile/profile-overview/components/PlatformSettings";
import JobCard from "layouts/jobs/search/components/JobCard";
import ModelCard from "components/Favourites/ModelCard";

function Overview() {
  const { user } = useAuth();
  const { favouriteModelIds } = useFavourites();

  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    aboutMe: "",
    mobile: "",
    email: "",
    location: "",
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    gender: [],
    categories: [],
  });
  const [userRole, setUserRole] = useState(null);
  const [matchingJobs, setMatchingJobs] = useState([]);
  const [clientJobs, setClientJobs] = useState([]);
  const [favouriteModels, setFavouriteModels] = useState([]);

  const socialUrls = {
    facebook: "https://facebook.com/",
    twitter: "https://twitter.com/",
    instagram: "https://instagram.com/",
    youtube: "https://youtube.com/",
    linkedin: "https://linkedin.com/in/", // or `/company/` for brands
  };

  // Only show profile completion for models and clients
  const showProfileCompletion = userRole === "model" || userRole === "client";

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserRole(data.role || null);
          const profile = {
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            aboutMe: data.aboutMe || "",
            mobile: data.phone || "",
            email: data.email || user.email || "",
            location: data.location || "",
            facebook: data.facebook || "",
            twitter: data.twitter || "",
            instagram: data.instagram || "",
            linkedin: data.linkedin || "",
            youtube: data.youtube || "",
            gender: data.gender || [],
            categories: data.categories || [],
          };
          setUserProfile(profile);

          // Fetch matching jobs for models
          if (data.role === "model") {
            try {
              // Fetch all jobs (jobs don't have a status field when created)
              const jobsSnap = await getDocs(collection(db, "jobs"));
              const jobs = jobsSnap.docs
                .map((docSnap) => ({
                  id: docSnap.id,
                  ...docSnap.data(),
                }))
                .sort((a, b) => {
                  // Sort by createdAt descending (newest first)
                  const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || 0;
                  const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || 0;
                  return dateB - dateA;
                });

              // Filter jobs that match the model's profile
              const matched = jobs.filter((job) => doesModelMatchJob(profile, job));
              setMatchingJobs(matched.slice(0, 4)); // Show max 4 jobs
            } catch (error) {
              console.error("Error fetching matching jobs:", error);
            }
          }

          // Fetch client's live jobs
          if (data.role === "client") {
            try {
              const jobsQuery = query(
                collection(db, "jobs"),
                where("userId", "==", user.uid)
              );
              const jobsSnap = await getDocs(jobsQuery);
              const jobs = jobsSnap.docs
                .map((docSnap) => ({
                  id: docSnap.id,
                  ...docSnap.data(),
                }))
                .filter((job) => !job.status || job.status.toLowerCase() === "open")
                .sort((a, b) => {
                  const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || 0;
                  const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || 0;
                  return dateB - dateA;
                });
              setClientJobs(jobs.slice(0, 4)); // Show max 4 jobs
            } catch (error) {
              console.error("Error fetching client jobs:", error);
            }
          }
        }
      }
    };
    fetchProfile();
  }, []);

  // Fetch favourite models data when favouriteModelIds changes
  useEffect(() => {
    const fetchFavouriteModels = async () => {
      if (!favouriteModelIds || favouriteModelIds.length === 0 || userRole !== "client") {
        setFavouriteModels([]);
        return;
      }

      try {
        // Fetch model data for each favourite (limit to 4 for dashboard display)
        const modelIds = favouriteModelIds.slice(0, 4);
        const modelPromises = modelIds.map(async (modelId) => {
          const modelRef = doc(db, "users", modelId);
          const modelSnap = await getDoc(modelRef);
          if (modelSnap.exists()) {
            return { uid: modelSnap.id, ...modelSnap.data() };
          }
          return null;
        });

        const models = (await Promise.all(modelPromises)).filter(Boolean);
        setFavouriteModels(models);
      } catch (error) {
        console.error("Error fetching favourite models:", error);
      }
    };

    fetchFavouriteModels();
  }, [favouriteModelIds, userRole]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />

      {/* Verification pending banner for unverified models */}
      {isUnverifiedModel(user) && (
        <Card sx={{ mb: 3, p: 0, overflow: "hidden" }}>
          <Alert
            severity="warning"
            icon={<Icon>gpp_maybe</Icon>}
            sx={{
              borderRadius: 0,
              "& .MuiAlert-message": { width: "100%" },
            }}
          >
            <MDBox>
              <MDTypography variant="body2" fontWeight="medium" color="inherit">
                Account Pending Verification
              </MDTypography>
              <MDTypography variant="caption" color="inherit">
                Your account is being reviewed by an administrator. Once verified, you'll have full access to browse jobs, apply for opportunities, and create your Z-Card. In the meantime, you can complete your profile.
              </MDTypography>
            </MDBox>
          </Alert>
        </Card>
      )}

      <Header>
        <MDBox mt={5} mb={3}>
          <Grid container spacing={3}>

            {showProfileCompletion && (
              <Grid item xs={12}>
                <ProfileCompletion />
              </Grid>
            )}

            {/* Z-Card Widget for Models */}
            {userRole === "model" && (
              <Grid item xs={12} md={6} xl={4}>
                <ZCardWidget />
              </Grid>
            )}

            <Grid item xs={12} md={6} xl={4}>
              <PlatformSettings />
            </Grid>
            <Grid item xs={12} md={6} xl={4} sx={{ display: "flex" }}>
              <Divider orientation="vertical" sx={{ ml: -2, mr: 1 }} />
              <ProfileInfoCard
                title="profile information"
                description={userProfile.aboutMe || "No description provided."}
                info={{
                  fullName: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
                  mobile: userProfile.mobile,
                  email: userProfile.email,
                  location: userProfile.location,
                }}

                social={[
                  userProfile.facebook && {
                    link: `${socialUrls.facebook}${userProfile.facebook.replace(/^@|^\//, "")}`,
                    icon: <FacebookIcon />,
                    color: "facebook",
                  },
                  userProfile.twitter && {
                    link: `${socialUrls.twitter}${userProfile.twitter.replace(/^@|^\//, "")}`,
                    icon: <TwitterIcon />,
                    color: "twitter",
                  },
                  userProfile.instagram && {
                    link: `${socialUrls.instagram}${userProfile.instagram.replace(/^@|^\//, "")}`,
                    icon: <InstagramIcon />,
                    color: "instagram",
                  },
                  userProfile.youtube && {
                    link: `${socialUrls.youtube}${userProfile.youtube.replace(/^@|^\//, "")}`,
                    icon: <YouTubeIcon />,
                    color: "youtube",
                  },
                  userProfile.linkedin && {
                    link: `${socialUrls.linkedin}${userProfile.linkedin.replace(/^@|^\//, "")}`,
                    icon: <LinkedInIcon />,
                    color: "linkedin",
                  },
                ].filter(Boolean)}

                action={{ route: "/edit-profile", tooltip: "Edit Profile" }}
                shadow={false}
              />
              <Divider orientation="vertical" sx={{ mx: 0 }} />
            </Grid>
            <Grid item xs={12} xl={4}>
              <ConversationsWidget title="conversations" maxItems={5} shadow={false} />
            </Grid>
          </Grid>
        </MDBox>
        {/* Matching Jobs Section - Only for Models */}
        {userRole === "model" && matchingJobs.length > 0 && (
          <>
            <MDBox pt={2} px={2} lineHeight={1.25}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center">
                <MDTypography variant="h6" fontWeight="medium">
                  Jobs For You
                </MDTypography>
                <MDTypography
                  component={Link}
                  to="/jobs/search"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  View All Jobs
                </MDTypography>
              </MDBox>
              <MDBox mb={1}>
                <MDTypography variant="button" color="text">
                  Jobs matching your profile
                </MDTypography>
              </MDBox>
            </MDBox>
            <MDBox p={2}>
              <Grid container spacing={6}>
                {matchingJobs.map((job) => (
                  <Grid item xs={12} md={6} xl={3} key={job.id}>
                    <JobCard job={job} isMatch={true} />
                  </Grid>
                ))}
              </Grid>
            </MDBox>
          </>
        )}

        {/* Your Jobs Section - Only for Clients */}
        {userRole === "client" && clientJobs.length > 0 && (
          <>
            <MDBox pt={2} px={2} lineHeight={1.25}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center">
                <MDTypography variant="h6" fontWeight="medium">
                  Your Jobs
                </MDTypography>
                <MDTypography
                  component={Link}
                  to="/jobs/my-jobs"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  View All Jobs
                </MDTypography>
              </MDBox>
              <MDBox mb={1}>
                <MDTypography variant="button" color="text">
                  Your live job listings
                </MDTypography>
              </MDBox>
            </MDBox>
            <MDBox p={2}>
              <Grid container spacing={6}>
                {clientJobs.map((job) => (
                  <Grid item xs={12} md={6} xl={3} key={job.id}>
                    <JobCard job={job} />
                  </Grid>
                ))}
              </Grid>
            </MDBox>
          </>
        )}

        {/* Favourite Models Section - Only for Clients */}
        {userRole === "client" && favouriteModels.length > 0 && (
          <>
            <MDBox pt={2} px={2} lineHeight={1.25}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center">
                <MDTypography variant="h6" fontWeight="medium">
                  Your Favourites
                </MDTypography>
                <MDTypography
                  component={Link}
                  to="/favourites"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  View All Favourites
                </MDTypography>
              </MDBox>
              <MDBox mb={1}>
                <MDTypography variant="button" color="text">
                  Models you&apos;ve saved
                </MDTypography>
              </MDBox>
            </MDBox>
            <MDBox p={2}>
              <Grid container spacing={6}>
                {favouriteModels.map((model) => (
                  <Grid item xs={12} md={6} xl={3} key={model.uid}>
                    <ModelCard model={model} showActions={false} />
                  </Grid>
                ))}
              </Grid>
            </MDBox>
          </>
        )}
      </Header>
      <Footer />
    </DashboardLayout>
  );
}

export default Overview;
