import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "config/firebase";

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

import { useAuth } from "context/AuthContext";
import { useFavourites } from "context/FavouritesContext";
import { calculateMatchScore } from "utils/matching";
import { sendJobInvitation } from "utils/invitations";

const getScoreColor = (score) => {
  if (score >= 80) return "success";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "error";
};

/**
 * FavouriteModels - lists the job owner's quick-favourite models (the heart
 * button) in the same style as Matching Models, so they can be invited to the
 * job. Renders nothing when the client has no favourites.
 */
function FavouriteModels({ job }) {
  const { user } = useAuth();
  const { favouriteModelIds, loading: favouritesLoading } = useFavourites();
  const [models, setModels] = useState([]);
  const [invitations, setInvitations] = useState({}); // modelId -> status
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState(null);

  const isOwner = !!user && job?.userId === user.uid;
  const applicants = useMemo(() => job?.applicants || [], [job?.applicants]);
  const favouriteKey = (favouriteModelIds || []).join(",");

  useEffect(() => {
    if (!isOwner || !job?.id || favouritesLoading) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const ids = (favouriteModelIds || []).filter((id) => !applicants.includes(id));

        const [invitationSnap, modelDocs] = await Promise.all([
          getDocs(collection(db, "jobs", job.id, "invitations")),
          Promise.all(
            ids.map((id) =>
              getDoc(doc(db, "users", id)).catch((err) => {
                console.warn(`Could not fetch favourite ${id}:`, err.message);
                return null;
              })
            )
          ),
        ]);
        if (cancelled) return;

        const statuses = {};
        invitationSnap.docs.forEach((d) => {
          statuses[d.id] = d.data().status || "pending";
        });
        setInvitations(statuses);

        const loaded = modelDocs
          .filter((snap) => snap && snap.exists() && snap.data().role === "model")
          .map((snap) => {
            const data = { uid: snap.id, ...snap.data() };
            return { ...data, matchScore: calculateMatchScore(data, job).score };
          })
          .sort((a, b) => b.matchScore - a.matchScore);
        setModels(loaded);
      } catch (err) {
        console.error("Error loading favourite models:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, job?.id, favouriteKey, favouritesLoading, applicants]);

  const handleInvite = async (model) => {
    setInvitingId(model.uid);
    try {
      await sendJobInvitation(job, model, user);
      setInvitations((prev) => ({ ...prev, [model.uid]: "pending" }));
    } catch (err) {
      console.error("Error sending invitation:", err);
      alert("Failed to send invitation. Please try again.");
    } finally {
      setInvitingId(null);
    }
  };

  if (!isOwner || favouritesLoading || (!loading && models.length === 0)) return null;

  return (
    <Card sx={{ mt: 3, overflow: "visible" }}>
      <MDBox p={{ xs: 2, md: 3 }}>
        <MDBox display="flex" alignItems="center" gap={1} mb={2}>
          <Icon sx={{ color: "error.main" }}>favorite</Icon>
          <MDTypography variant="h5" fontWeight="medium">
            Favourite Models {!loading && `(${models.length})`}
          </MDTypography>
        </MDBox>
        <MDTypography variant="body2" color="text" mb={3}>
          Models you have favourited. Invite them to apply for this job.
        </MDTypography>

        {loading ? (
          <MDBox py={4} textAlign="center">
            <CircularProgress size={40} />
            <MDTypography variant="body2" color="text" mt={2}>
              Loading your favourites...
            </MDTypography>
          </MDBox>
        ) : (
          models.map((model) => {
            const status = invitations[model.uid];
            const invited = !!status && status !== "declined";
            const name = `${model.firstName || ""} ${model.lastName || ""}`.trim() || "Model";
            return (
              <MDBox
                key={model.uid}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                p={2}
                mb={1}
                sx={{
                  backgroundColor: invited ? "success.lighter" : "grey.100",
                  borderRadius: 2,
                  border: invited ? "1px solid" : "none",
                  borderColor: invited ? "success.light" : "transparent",
                }}
              >
                <MDBox display="flex" alignItems="center" gap={2} flex={1}>
                  <ProfileAvatar src={model.profileAvatar} alt={name} size={60} />
                  <MDBox flex={1}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      {model.publicSlug ? (
                        <Link
                          to={`/${model.publicSlug}`}
                          style={{ color: "#1976d2", textDecoration: "none", fontWeight: 600 }}
                        >
                          {name}
                        </Link>
                      ) : (
                        <MDTypography variant="button" fontWeight="medium">
                          {name}
                        </MDTypography>
                      )}
                      {invited && (
                        <Chip
                          label={status === "applied" ? "Applied" : "Invited"}
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
                  {invited ? (
                    <MDButton variant="outlined" color="success" size="small" disabled>
                      <Icon sx={{ mr: 0.5 }}>check</Icon>
                      {status === "applied" ? "Applied" : "Invited"}
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
            );
          })
        )}
      </MDBox>
    </Card>
  );
}

FavouriteModels.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string,
    userId: PropTypes.string,
    applicants: PropTypes.array,
  }).isRequired,
};

export default FavouriteModels;
