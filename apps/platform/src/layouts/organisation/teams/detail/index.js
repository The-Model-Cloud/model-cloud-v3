/**
 * Team Detail - View and manage team members
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTeamById,
  getTeamMembers,
  updateTeam,
  assignUserToTeam,
  canManageTeamMembers,
  getOrganisationUsers,
} from "utils/organisations";
import { useAuth } from "context/AuthContext";

// MUI components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function TeamDetail() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Edit team dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Add member dialog
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addingMember, setAddingMember] = useState(false);

  const orgId = user?.organisationId;
  const canManage = canManageTeamMembers(user);

  // Fetch team and members
  useEffect(() => {
    const fetchData = async () => {
      if (!orgId || !teamId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [teamData, membersData] = await Promise.all([
          getTeamById(orgId, teamId),
          getTeamMembers(orgId, teamId),
        ]);

        if (!teamData) {
          setError("Team not found");
          return;
        }

        setTeam(teamData);
        setMembers(membersData);
        setEditName(teamData.name);
        setEditDescription(teamData.description || "");
      } catch (err) {
        console.error("Error fetching team:", err);
        setError("Failed to load team details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, teamId]);

  // Fetch available users when add member dialog opens
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      if (!addMemberDialogOpen || !orgId) return;

      try {
        const orgUsers = await getOrganisationUsers(orgId);
        // Filter out users already in this team
        const memberIds = members.map((m) => m.id);
        const available = orgUsers.filter((u) => !memberIds.includes(u.id));
        setAvailableUsers(available);
      } catch (err) {
        console.error("Error fetching available users:", err);
      }
    };

    fetchAvailableUsers();
  }, [addMemberDialogOpen, orgId, members]);

  // Handle save team changes
  const handleSaveTeam = async () => {
    if (!editName.trim()) return;

    setSaving(true);
    try {
      await updateTeam(orgId, teamId, {
        name: editName,
        description: editDescription,
      });
      setTeam({ ...team, name: editName, description: editDescription });
      setEditDialogOpen(false);
      setSuccess("Team updated successfully");
    } catch (err) {
      console.error("Error updating team:", err);
      setError("Failed to update team");
    } finally {
      setSaving(false);
    }
  };

  // Handle add member to team
  const handleAddMember = async () => {
    if (!selectedUser) return;

    setAddingMember(true);
    try {
      await assignUserToTeam(orgId, selectedUser.id, teamId);
      setMembers([...members, selectedUser]);
      setAddMemberDialogOpen(false);
      setSelectedUser(null);
      setSuccess(`${selectedUser.firstName} added to team`);
    } catch (err) {
      console.error("Error adding member:", err);
      setError("Failed to add member to team");
    } finally {
      setAddingMember(false);
    }
  };

  // Handle remove member from team
  const handleRemoveMember = async (member) => {
    try {
      await assignUserToTeam(orgId, member.id, null);
      setMembers(members.filter((m) => m.id !== member.id));
      setSuccess(`${member.firstName} removed from team`);
    } catch (err) {
      console.error("Error removing member:", err);
      setError("Failed to remove member from team");
    }
  };

  if (!orgId) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox pt={6} pb={3}>
          <Alert severity="warning">
            You are not associated with an organisation.
          </Alert>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox pt={6} pb={3}>
          <Card>
            <MDBox p={3}>
              <Skeleton variant="text" width="40%" height={40} />
              <Skeleton variant="text" width="60%" />
              <MDBox mt={3}>
                <Skeleton variant="rectangular" height={200} />
              </MDBox>
            </MDBox>
          </Card>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  if (error && !team) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox pt={6} pb={3}>
          <Alert severity="error">{error}</Alert>
          <MDBox mt={2}>
            <MDButton
              variant="outlined"
              color="info"
              onClick={() => navigate("/organisation/teams")}
            >
              Back to Teams
            </MDButton>
          </MDBox>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        {/* Back button */}
        <MDBox mb={3}>
          <MDButton
            variant="text"
            color="info"
            startIcon={<Icon>arrow_back</Icon>}
            onClick={() => navigate("/organisation/teams")}
          >
            Back to Teams
          </MDButton>
        </MDBox>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Team Info Card */}
          <Grid item xs={12} lg={4}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <Icon color="info" sx={{ fontSize: 32 }}>groups</Icon>
                    <MDTypography variant="h5" fontWeight="bold">
                      {team?.name}
                    </MDTypography>
                  </MDBox>
                  {canManage && (
                    <Tooltip title="Edit Team">
                      <IconButton
                        size="small"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Icon>edit</Icon>
                      </IconButton>
                    </Tooltip>
                  )}
                </MDBox>

                <MDTypography variant="body2" color="text" mb={3}>
                  {team?.description || "No description"}
                </MDTypography>

                <MDBox display="flex" gap={1}>
                  <Chip
                    icon={<Icon sx={{ fontSize: "1rem !important" }}>person</Icon>}
                    label={`${members.length} member${members.length !== 1 ? "s" : ""}`}
                    size="small"
                    variant="outlined"
                  />
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

          {/* Team Members Card */}
          <Grid item xs={12} lg={8}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <MDTypography variant="h6" fontWeight="medium">
                    Team Members
                  </MDTypography>
                  {canManage && (
                    <MDButton
                      variant="gradient"
                      color="info"
                      size="small"
                      startIcon={<Icon>person_add</Icon>}
                      onClick={() => setAddMemberDialogOpen(true)}
                    >
                      Add Member
                    </MDButton>
                  )}
                </MDBox>

                {members.length === 0 ? (
                  <MDBox textAlign="center" py={4}>
                    <Icon sx={{ fontSize: 48, color: "grey.400", mb: 2 }}>person_outline</Icon>
                    <MDTypography variant="body2" color="text">
                      No members in this team yet.
                    </MDTypography>
                    {canManage && (
                      <MDButton
                        variant="outlined"
                        color="info"
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={() => setAddMemberDialogOpen(true)}
                      >
                        Add First Member
                      </MDButton>
                    )}
                  </MDBox>
                ) : (
                  <List>
                    {members.map((member) => (
                      <ListItem
                        key={member.id}
                        sx={{
                          borderRadius: 2,
                          mb: 1,
                          "&:hover": { bgcolor: "grey.100" },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar src={member.photoURL}>
                            {member.firstName?.[0] || member.email?.[0]?.toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <MDTypography variant="body2" fontWeight="medium">
                              {member.firstName} {member.lastName}
                            </MDTypography>
                          }
                          secondary={
                            <MDTypography variant="caption" color="text">
                              {member.email}
                            </MDTypography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <MDBox display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={member.organisationRole || "member"}
                              size="small"
                              color={
                                member.organisationRole === "owner"
                                  ? "primary"
                                  : member.organisationRole === "admin"
                                  ? "info"
                                  : "default"
                              }
                              variant="outlined"
                            />
                            {canManage && member.id !== user.uid && (
                              <Tooltip title="Remove from Team">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  <Icon fontSize="small">remove_circle</Icon>
                                </IconButton>
                              </Tooltip>
                            )}
                          </MDBox>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      {/* Edit Team Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="info">edit</Icon>
            <MDTypography variant="h6">Edit Team</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          <MDBox mt={2}>
            <TextField
              fullWidth
              label="Team Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              multiline
              rows={2}
            />
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setEditDialogOpen(false)}
            disabled={saving}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleSaveTeam}
            disabled={saving || !editName.trim()}
          >
            {saving ? "Saving..." : "Save Changes"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="info">person_add</Icon>
            <MDTypography variant="h6">Add Team Member</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          <MDBox mt={2}>
            {availableUsers.length === 0 ? (
              <Alert severity="info">
                All organisation members are already in this team.
              </Alert>
            ) : (
              <Autocomplete
                options={availableUsers}
                getOptionLabel={(option) =>
                  `${option.firstName || ""} ${option.lastName || ""} (${option.email})`
                }
                value={selectedUser}
                onChange={(_, newValue) => setSelectedUser(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Member"
                    placeholder="Search organisation members..."
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <Avatar src={option.photoURL} sx={{ width: 32, height: 32 }}>
                        {option.firstName?.[0]}
                      </Avatar>
                      <MDBox>
                        <MDTypography variant="body2" fontWeight="medium">
                          {option.firstName} {option.lastName}
                        </MDTypography>
                        <MDTypography variant="caption" color="text">
                          {option.email}
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                  </li>
                )}
              />
            )}
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => {
              setAddMemberDialogOpen(false);
              setSelectedUser(null);
            }}
            disabled={addingMember}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleAddMember}
            disabled={addingMember || !selectedUser}
          >
            {addingMember ? "Adding..." : "Add to Team"}
          </MDButton>
        </DialogActions>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default TeamDetail;
