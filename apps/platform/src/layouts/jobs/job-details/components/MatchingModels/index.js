import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "config/firebase";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import ProfileAvatar from "components/Profile/ProfileAvatar";

// Matching algorithm
import { getMatchingModels } from "utils/matching";

// Invitation utilities
import { sendJobInvitation } from "utils/invitations";

function MatchingModels({ job }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [matchingModels, setMatchingModels] = useState([]);
  const [invitedModelIds, setInvitedModelIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState(null);
  const [error, setError] = useState(null);

  // Use stable reference for applicants - read directly from job
  const applicants = job?.applicants || [];

  // Wait for Firebase Auth to initialize before doing anything
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setCurrentUser({ uid: user.uid, ...userDoc.data() });
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isOwner = currentUser && job?.userId === currentUser.uid;

  // Fetch matching models and invitation status
  useEffect(() => {
    const fetchMatchingModels = async () => {
      // Wait for auth to be ready and confirm we're the owner
      if (authLoading || !job || !isOwner) {
        if (!authLoading && !isOwner) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all models
        const usersRef = collection(db, "users");
        const modelsQuery = query(usersRef, where("role", "==", "model"));
        const modelsSnapshot = await getDocs(modelsQuery);

        const allModels = modelsSnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));

        // Fetch invited model IDs for this job
        const invitationsRef = collection(db, "jobs", job.id, "invitations");
        const invitationsSnapshot = await getDocs(invitationsRef);
        const invited = invitationsSnapshot.docs.map((doc) => doc.id);
        setInvitedModelIds(invited);

        // Get matching models (excluding applicants but including invited)
        const matches = getMatchingModels(allModels, job, {
          excludeApplicants: applicants,
          excludeInvited: [], // Don't exclude invited, we want to show them
        });

        // Mark which ones were invited
        const matchesWithInviteStatus = matches.map((model) => ({
          ...model,
          wasInvited: invited.includes(model.uid),
        }));

        setMatchingModels(matchesWithInviteStatus);
      } catch (err) {
        console.error("Error fetching matching models:", err);
        setError("Failed to load matching models");
      } finally {
        setLoading(false);
      }
    };

    fetchMatchingModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, currentUser?.uid, authLoading]);

  const handleInvite = async (model) => {
    if (!currentUser || !job) return;

    setInvitingId(model.uid);

    try {
      await sendJobInvitation(job, model, currentUser);

      // Update local state
      setInvitedModelIds((prev) => [...prev, model.uid]);
      setMatchingModels((prev) =>
        prev.map((m) =>
          m.uid === model.uid ? { ...m, wasInvited: true } : m
        )
      );
    } catch (err) {
      console.error("Error sending invitation:", err);
      alert("Failed to send invitation. Please try again.");
    } finally {
      setInvitingId(null);
    }
  };

  // Don't render anything if auth is still loading or not the job owner
  if (authLoading) {
    return null; // Wait for auth to initialize
  }

  if (!isOwner) {
    return null;
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "success";
    if (score >= 60) return "info";
    if (score >= 40) return "warning";
    return "error";
  };

  return (
    <Card sx={{ mt: 3, overflow: "visible" }}>
      <MDBox p={{ xs: 2, md: 3 }}>
        <MDBox display="flex" alignItems="center" gap={1} mb={2}>
          <Icon sx={{ color: "success.main" }}>person_search</Icon>
          <MDTypography variant="h5" fontWeight="medium">
            Matching Models ({matchingModels.length})
          </MDTypography>
        </MDBox>
        <MDTypography variant="body2" color="text" mb={3}>
          Models who match your job requirements. Invite them to apply!
        </MDTypography>

        {loading ? (
          <MDBox py={4} textAlign="center">
            <CircularProgress size={40} />
            <MDTypography variant="body2" color="text" mt={2}>
              Finding matching models...
            </MDTypography>
          </MDBox>
        ) : error ? (
          <MDBox
            py={4}
            textAlign="center"
            sx={{ backgroundColor: "error.lighter", borderRadius: 2 }}
          >
            <Icon sx={{ fontSize: 48, color: "error.main", mb: 1 }}>error</Icon>
            <MDTypography variant="body2" color="error">
              {error}
            </MDTypography>
          </MDBox>
        ) : matchingModels.length > 0 ? (
          <MDBox>
            {matchingModels.slice(0, 10).map((model) => (
              <MDBox
                key={model.uid}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                p={2}
                mb={1}
                sx={{
                  backgroundColor: model.wasInvited ? "success.lighter" : "grey.100",
                  borderRadius: 2,
                  border: model.wasInvited ? "1px solid" : "none",
                  borderColor: model.wasInvited ? "success.light" : "transparent",
                }}
              >
                <MDBox display="flex" alignItems="center" gap={2} flex={1}>
                  <ProfileAvatar
                    src={model.profileAvatar}
                    alt={`${model.firstName} ${model.lastName}`}
                    size={60}
                  />
                  <MDBox flex={1}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      {model.publicSlug ? (
                        <Link
                          to={`/${model.publicSlug}`}
                          style={{
                            color: "#1976d2",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          {model.firstName} {model.lastName}
                        </Link>
                      ) : (
                        <MDTypography variant="button" fontWeight="medium">
                          {model.firstName} {model.lastName}
                        </MDTypography>
                      )}
                      {model.wasInvited && (
                        <Chip
                          label="Invited"
                          size="small"
                          color="success"
                          icon={<Icon sx={{ fontSize: "16px !important" }}>check</Icon>}
                          sx={{ height: 22, "& .MuiChip-label": { px: 1 } }}
                        />
                      )}
                    </MDBox>
                    <MDTypography variant="caption" color="text">
                      {model.city && model.country
                        ? `${model.city}, ${model.country}`
                        : model.city || model.country || "Location not set"}
                      {model.dayRate && ` • £${model.dayRate}/day`}
                      {!model.dayRate && model.hourlyRate && ` • £${model.hourlyRate}/hr`}
                    </MDTypography>
                    <MDBox display="flex" alignItems="center" gap={1} mt={0.5}>
                      <MDBox sx={{ width: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={model.matchScore}
                          color={getScoreColor(model.matchScore)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </MDBox>
                      <MDTypography
                        variant="caption"
                        fontWeight="medium"
                        color={getScoreColor(model.matchScore)}
                      >
                        {model.matchScore}% match
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                </MDBox>
                <MDBox display="flex" gap={1}>
                  {model.publicSlug && (
                    <MDButton
                      variant="outlined"
                      color="info"
                      size="small"
                      component={Link}
                      to={`/${model.publicSlug}`}
                    >
                      View Profile
                    </MDButton>
                  )}
                  {model.wasInvited ? (
                    <MDButton variant="outlined" color="success" size="small" disabled>
                      <Icon sx={{ mr: 0.5 }}>check</Icon>
                      Invited
                    </MDButton>
                  ) : (
                    <MDButton
                      variant="gradient"
                      color="info"
                      size="small"
                      onClick={() => handleInvite(model)}
                      disabled={invitingId === model.uid}
                    >
                      {invitingId === model.uid ? (
                        <>
                          <CircularProgress size={14} color="inherit" sx={{ mr: 0.5 }} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Icon sx={{ mr: 0.5 }}>send</Icon>
                          Invite to Apply
                        </>
                      )}
                    </MDButton>
                  )}
                </MDBox>
              </MDBox>
            ))}
            {matchingModels.length > 10 && (
              <MDBox textAlign="center" mt={2}>
                <MDTypography variant="caption" color="text">
                  Showing top 10 of {matchingModels.length} matching models
                </MDTypography>
              </MDBox>
            )}
          </MDBox>
        ) : (
          <MDBox
            py={4}
            textAlign="center"
            sx={{ backgroundColor: "grey.100", borderRadius: 2 }}
          >
            <Icon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}>
              person_off
            </Icon>
            <MDTypography variant="body2" color="text">
              No matching models found. Try adjusting your job requirements.
            </MDTypography>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

export default MatchingModels;
