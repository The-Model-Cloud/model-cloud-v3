/**
 * TeamActivity - Shows activity from team members
 */

import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function TeamActivity({ activity, loading }) {
  const navigate = useNavigate();

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "owner":
        return "primary";
      case "admin":
        return "info";
      case "member":
        return "default";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Card>
        <MDBox p={3}>
          <Skeleton width={200} height={28} />
          <MDBox mt={2}>
            <Skeleton variant="rounded" height={250} />
          </MDBox>
        </MDBox>
      </Card>
    );
  }

  return (
    <Card>
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDBox display="flex" alignItems="center">
            <MDBox
              width="3rem"
              height="3rem"
              bgColor="dark"
              variant="gradient"
              borderRadius="lg"
              display="flex"
              justifyContent="center"
              alignItems="center"
              color="white"
              mr={2}
            >
              <Icon>groups</Icon>
            </MDBox>
            <MDBox>
              <MDTypography variant="h6" fontWeight="medium">
                Team Activity
              </MDTypography>
              <MDTypography variant="caption" color="text">
                Most active team members
              </MDTypography>
            </MDBox>
          </MDBox>
          <MDButton
            variant="text"
            color="dark"
            size="small"
            onClick={() => navigate("/organisation/members")}
          >
            View Team
          </MDButton>
        </MDBox>

        {activity.length === 0 ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 1 }}>group_off</Icon>
            <MDTypography variant="body2" color="text">
              No team activity yet
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Activity will appear as team members create jobs
            </MDTypography>
          </MDBox>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Team Member
                    </MDTypography>
                  </TableCell>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Role
                    </MDTypography>
                  </TableCell>
                  <TableCell align="center">
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Jobs Created
                    </MDTypography>
                  </TableCell>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Latest Job
                    </MDTypography>
                  </TableCell>
                  <TableCell>
                    <MDTypography variant="caption" fontWeight="medium" color="text">
                      Date
                    </MDTypography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activity.map((member, index) => (
                  <TableRow
                    key={member.uid}
                    sx={{
                      "&:hover": { bgcolor: "grey.50" },
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (member.recentJob?.id) {
                        navigate(`/jobs/${member.recentJob.id}`);
                      }
                    }}
                  >
                    <TableCell>
                      <MDBox display="flex" alignItems="center">
                        <Avatar
                          src={member.profileImage}
                          sx={{
                            width: 36,
                            height: 36,
                            mr: 1.5,
                            bgcolor: "primary.main",
                          }}
                        >
                          {getInitials(member.firstName, member.lastName)}
                        </Avatar>
                        <MDBox>
                          <MDTypography variant="button" fontWeight="medium">
                            {member.firstName} {member.lastName}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            {member.email}
                          </MDTypography>
                        </MDBox>
                      </MDBox>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.organisationRole || "member"}
                        size="small"
                        color={getRoleBadgeColor(member.organisationRole)}
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <MDBox
                        display="inline-flex"
                        alignItems="center"
                        justifyContent="center"
                        bgcolor={index === 0 ? "primary.main" : "grey.200"}
                        color={index === 0 ? "white" : "text.primary"}
                        borderRadius="50%"
                        width={32}
                        height={32}
                        fontWeight="medium"
                      >
                        {member.jobsCreated}
                      </MDBox>
                    </TableCell>
                    <TableCell>
                      <MDTypography variant="button" fontWeight="regular">
                        {member.recentJob?.title || "—"}
                      </MDTypography>
                    </TableCell>
                    <TableCell>
                      <MDTypography variant="caption" color="text">
                        {member.recentJob ? formatDate(member.recentJob.createdAt) : "—"}
                      </MDTypography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MDBox>
    </Card>
  );
}

TeamActivity.propTypes = {
  activity: PropTypes.arrayOf(
    PropTypes.shape({
      uid: PropTypes.string.isRequired,
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      email: PropTypes.string,
      profileImage: PropTypes.string,
      organisationRole: PropTypes.string,
      jobsCreated: PropTypes.number.isRequired,
      recentJob: PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        createdAt: PropTypes.any,
      }),
    })
  ).isRequired,
  loading: PropTypes.bool,
};

TeamActivity.defaultProps = {
  loading: false,
};

export default TeamActivity;
