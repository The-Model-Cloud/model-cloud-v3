import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "config/firebase";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import ProfileAvatar from "components/Profile/ProfileAvatar";

import { useAuth } from "context/AuthContext";
import { useFavourites } from "context/FavouritesContext";
import { sendJobInvitation } from "utils/invitations";

/**
 * ListModels - shows the models from the job owner's Model Lists (personal,
 * organisation and team) so they can be invited to this job in one click.
 */
function ListModels({ job }) {
  const { user } = useAuth();
  const { allLists, loading: listsLoading } = useFavourites();
  const [invitations, setInvitations] = useState({}); // modelId -> status
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitingId, setInvitingId] = useState(null);

  const isOwner = !!user && job?.userId === user.uid;
  const applicants = useMemo(() => job?.applicants || [], [job?.applicants]);

  useEffect(() => {
    if (!isOwner || !job?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "jobs", job.id, "invitations"));
        if (cancelled) return;
        const statuses = {};
        snapshot.docs.forEach((d) => {
          statuses[d.id] = d.data().status || "pending";
        });
        setInvitations(statuses);
      } catch (err) {
        console.error("Error fetching invitations:", err);
      } finally {
        if (!cancelled) setInvitationsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwner, job?.id]);

  // De-duplicate models across lists, remembering which lists each one is in
  const listModels = useMemo(() => {
    const byUid = new Map();
    (allLists || []).forEach((list) => {
      (list.models || []).forEach((m) => {
        if (!m?.uid || applicants.includes(m.uid)) return;
        const existing = byUid.get(m.uid);
        if (existing) {
          existing.listTitles.push(list.title);
        } else {
          byUid.set(m.uid, { ...m, listTitles: [list.title] });
        }
      });
    });
    return Array.from(byUid.values());
  }, [allLists, applicants]);

  const handleInvite = async (listModel) => {
    setInvitingId(listModel.uid);
    try {
      // Lists hold a denormalised copy of the model; the invite needs the email
      const modelSnap = await getDoc(doc(db, "users", listModel.uid));
      if (!modelSnap.exists()) {
        throw new Error("Model no longer exists");
      }
      await sendJobInvitation(job, { uid: listModel.uid, ...modelSnap.data() }, user);
      setInvitations((prev) => ({ ...prev, [listModel.uid]: "pending" }));
    } catch (err) {
      console.error("Error sending invitation:", err);
      alert("Failed to send invitation. Please try again.");
    } finally {
      setInvitingId(null);
    }
  };

  if (!isOwner) return null;

  const loading = listsLoading || invitationsLoading;

  return (
    <Card sx={{ mt: 3, overflow: "visible" }}>
      <MDBox p={{ xs: 2, md: 3 }}>
        <MDBox display="flex" alignItems="center" gap={1} mb={2}>
          <Icon sx={{ color: "info.main" }}>playlist_add_check</Icon>
          <MDTypography variant="h5" fontWeight="medium">
            Models From Your Lists ({loading ? "…" : listModels.length})
          </MDTypography>
        </MDBox>
        <MDTypography variant="body2" color="text" mb={3}>
          Your favourite models from your Model Lists. Invite them to apply for this job.
        </MDTypography>

        {loading ? (
          <MDBox py={4} textAlign="center">
            <CircularProgress size={40} />
          </MDBox>
        ) : listModels.length === 0 ? (
          <MDBox py={4} textAlign="center" sx={{ backgroundColor: "grey.100", borderRadius: 2 }}>
            <Icon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}>list_alt</Icon>
            <MDTypography variant="body2" color="text" mb={2}>
              No models in your lists yet. Add models to a list to invite them here.
            </MDTypography>
            <MDButton
              variant="outlined"
              color="info"
              size="small"
              component={Link}
              to="/favourites"
            >
              Go to Model Lists
            </MDButton>
          </MDBox>
        ) : (
          listModels.map((m) => {
            const status = invitations[m.uid];
            const name = `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Model";
            const invited = !!status && status !== "declined";
            return (
              <MDBox
                key={m.uid}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={1}
                p={2}
                mb={1}
                sx={{
                  backgroundColor: invited ? "success.lighter" : "grey.100",
                  borderRadius: 2,
                }}
              >
                <MDBox display="flex" alignItems="center" gap={2} flex={1}>
                  <ProfileAvatar src={m.profileAvatar} alt={name} size={50} />
                  <MDBox>
                    {m.publicSlug ? (
                      <Link
                        to={`/${m.publicSlug}`}
                        style={{ color: "#1976d2", textDecoration: "none", fontWeight: 600 }}
                      >
                        {name}
                      </Link>
                    ) : (
                      <MDTypography variant="button" fontWeight="medium">
                        {name}
                      </MDTypography>
                    )}
                    <MDBox display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                      {m.listTitles.map((title) => (
                        <Chip
                          key={title}
                          label={title}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                      ))}
                    </MDBox>
                  </MDBox>
                </MDBox>
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
                    onClick={() => handleInvite(m)}
                    disabled={invitingId === m.uid}
                  >
                    {invitingId === m.uid ? (
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
            );
          })
        )}
      </MDBox>
    </Card>
  );
}

ListModels.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string,
    userId: PropTypes.string,
    applicants: PropTypes.array,
  }).isRequired,
};

export default ListModels;
