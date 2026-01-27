import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "config/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { doesModelMatchJob } from "utils/matching";

// @mui material components
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";

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
import DefaultProjectCard from "examples/Cards/ProjectCards/DefaultProjectCard";

// Overview page components
import ProfileCompletion from "components/ProfileCompletion";
import ConversationsWidget from "components/ConversationsWidget";
import ZCardWidget from "components/ZCard/ZCardWidget";
import Header from "layouts/pages/profile/components/Header";
import PlatformSettings from "layouts/pages/profile/profile-overview/components/PlatformSettings";
import JobCard from "layouts/jobs/search/components/JobCard";

// Images
import homeDecor1 from "assets/images/home-decor-1.jpg";
import homeDecor2 from "assets/images/home-decor-2.jpg";
import homeDecor3 from "assets/images/home-decor-3.jpg";
import homeDecor4 from "assets/images/home-decor-4.jpeg";
import team1 from "assets/images/team-1.jpg";
import team2 from "assets/images/team-2.jpg";
import team3 from "assets/images/team-3.jpg";
import team4 from "assets/images/team-4.jpg";

function Overview() {

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
        }
      }
    };
    fetchProfile();
  }, []);


  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />
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

        <MDBox pt={2} px={2} lineHeight={1.25}>
          <MDTypography variant="h6" fontWeight="medium">
            Projects
          </MDTypography>
          <MDBox mb={1}>
            <MDTypography variant="button" color="text">
              Architects design houses
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox p={2}>
          <Grid container spacing={6}>
            <Grid item xs={12} md={6} xl={3}>
              <DefaultProjectCard
                image={homeDecor1}
                label="project #2"
                title="modern"
                description="As Uber works through a huge amount of internal management turmoil."
                action={{
                  type: "internal",
                  route: "/dashboard",
                  color: "info",
                  label: "view project",
                }}
                authors={[
                  { image: team1, name: "Elena Morison" },
                  { image: team2, name: "Ryan Milly" },
                  { image: team3, name: "Nick Daniel" },
                  { image: team4, name: "Peterson" },
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6} xl={3}>
              <DefaultProjectCard
                image={homeDecor2}
                label="project #1"
                title="scandinavian"
                description="Music is something that everyone has their own specific opinion about."
                action={{
                  type: "internal",
                  route: "/dashboard",
                  color: "info",
                  label: "view project",
                }}
                authors={[
                  { image: team3, name: "Nick Daniel" },
                  { image: team4, name: "Peterson" },
                  { image: team1, name: "Elena Morison" },
                  { image: team2, name: "Ryan Milly" },
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6} xl={3}>
              <DefaultProjectCard
                image={homeDecor3}
                label="project #3"
                title="minimalist"
                description="Different people have different taste, and various types of music."
                action={{
                  type: "internal",
                  route: "/dashboard",
                  color: "info",
                  label: "view project",
                }}
                authors={[
                  { image: team4, name: "Peterson" },
                  { image: team3, name: "Nick Daniel" },
                  { image: team2, name: "Ryan Milly" },
                  { image: team1, name: "Elena Morison" },
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6} xl={3}>
              <DefaultProjectCard
                image={homeDecor4}
                label="project #4"
                title="gothic"
                description="Why would anyone pick blue over pink? Pink is obviously a better color."
                action={{
                  type: "internal",
                  route: "/dashboard",
                  color: "info",
                  label: "view project",
                }}
                authors={[
                  { image: team4, name: "Peterson" },
                  { image: team3, name: "Nick Daniel" },
                  { image: team2, name: "Ryan Milly" },
                  { image: team1, name: "Elena Morison" },
                ]}
              />
            </Grid>
          </Grid>
        </MDBox>
      </Header>
      <Footer />
    </DashboardLayout>
  );
}

export default Overview;
