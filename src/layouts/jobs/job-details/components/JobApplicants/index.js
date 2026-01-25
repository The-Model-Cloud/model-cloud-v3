import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "config/firebase";

// MUI and MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ProfileAvatar from "components/Profile/ProfileAvatar";

// DataTable
import DataTable from "examples/Tables/DataTable";

function JobApplicants({ job, models }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        setCurrentUser(user);
      }
    };
    fetchUser();
  }, []);

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
          const { profileAvatar, name, publicSlug } = row.original;
          return (
            <MDBox display="flex" alignItems="center" gap={2}>
              <ProfileAvatar src={profileAvatar} alt={name} size={50} />
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
    <MDBox mt={5}>
      <MDBox mb={2}>
        <MDTypography variant="h5" fontWeight="medium">
          Applicants ({models.length})
        </MDTypography>
        <MDTypography variant="body2" color="text">
          Models who have applied for this job
        </MDTypography>
      </MDBox>
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
          <MDTypography variant="body2" color="text">
            No applicants yet. Models who apply will appear here.
          </MDTypography>
        </MDBox>
      )}
    </MDBox>
  );
}

export default JobApplicants;
