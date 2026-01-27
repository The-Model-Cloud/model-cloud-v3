import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "config/firebase";

// MUI and MD components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ProfileAvatar from "components/Profile/ProfileAvatar";

// DataTable
import DataTable from "examples/Tables/DataTable";

function JobApplicants({ job, models }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [invitedModelIds, setInvitedModelIds] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        setCurrentUser(user);
      }
    };
    fetchUser();
  }, []);

  // Fetch invited models for this job
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!job?.id) return;
      try {
        const invitationsRef = collection(db, "jobs", job.id, "invitations");
        const invitationsSnap = await getDocs(invitationsRef);
        const invited = invitationsSnap.docs.map((doc) => doc.id);
        setInvitedModelIds(invited);
      } catch (error) {
        console.error("Error fetching invitations:", error);
      }
    };
    fetchInvitations();
  }, [job?.id]);

  const isOwner = currentUser && job?.userId === currentUser.uid;

  // Don't render anything if not the job owner
  if (!isOwner) {
    return null;
  }

  // Build table data
  const tableData = {
    columns: [
      {
        Header: "Model",
        accessor: "model",
        width: "40%",
        Cell: ({ row }) => {
          const { profileAvatar, name, publicSlug, wasInvited } = row.original;
          return (
            <MDBox display="flex" alignItems="center" gap={2}>
              <ProfileAvatar src={profileAvatar} alt={name} size={50} />
              <MDBox>
                <MDBox display="flex" alignItems="center" gap={1}>
                  {publicSlug ? (
                    <Link
                      to={`/${publicSlug}`}
                      style={{ color: "#1976d2", textDecoration: "none", fontWeight: 500 }}
                    >
                      {name}
                    </Link>
                  ) : (
                    <MDTypography variant="button" fontWeight="medium">
                      {name}
                    </MDTypography>
                  )}
                  {wasInvited && (
                    <Chip
                      label="Invited"
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<Icon sx={{ fontSize: "14px !important" }}>mail</Icon>}
                      sx={{ height: 20, "& .MuiChip-label": { px: 0.5, fontSize: "0.7rem" } }}
                    />
                  )}
                </MDBox>
              </MDBox>
            </MDBox>
          );
        },
      },
      {
        Header: "Location",
        accessor: "location",
        Cell: ({ value }) => (
          <MDTypography variant="body2" color="text">
            {value || "—"}
          </MDTypography>
        ),
      },
      {
        Header: "Rate",
        accessor: "rate",
        Cell: ({ value }) => (
          <MDTypography variant="body2" color="text">
            {value || "—"}
          </MDTypography>
        ),
      },
    ],
    rows: models.map((model) => ({
      uid: model.uid,
      profileAvatar: model.profileAvatar || "",
      name: `${model.firstName || ""} ${model.lastName || ""}`.trim() || "Unknown",
      publicSlug: model.publicSlug || null,
      wasInvited: invitedModelIds.includes(model.uid),
      location: model.city && model.country
        ? `${model.city}, ${model.country}`
        : model.location || model.city || model.country || "",
      rate: model.dayRate
        ? `£${model.dayRate}/day`
        : model.hourlyRate
          ? `£${model.hourlyRate}/hr`
          : null,
    })),
  };

  return (
    <Card sx={{ mt: 3, overflow: "visible" }}>
      <MDBox p={{ xs: 2, md: 3 }}>
        <MDBox display="flex" alignItems="center" gap={1} mb={2}>
          <Icon sx={{ color: "info.main" }}>people</Icon>
          <MDTypography variant="h5" fontWeight="medium">
            Applicants ({models.length})
          </MDTypography>
        </MDBox>
        <MDTypography variant="body2" color="text" mb={3}>
          Models who have applied for this job
        </MDTypography>
        {models.length > 0 ? (
          <DataTable
            table={tableData}
            entriesPerPage={{ defaultValue: 10 }}
            showTotalEntries={false}
            noEndBorder
          />
        ) : (
          <MDBox
            py={4}
            textAlign="center"
            sx={{ backgroundColor: "grey.100", borderRadius: 2 }}
          >
            <Icon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}>person_search</Icon>
            <MDTypography variant="body2" color="text">
              No applicants yet. Models who apply will appear here.
            </MDTypography>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

export default JobApplicants;
