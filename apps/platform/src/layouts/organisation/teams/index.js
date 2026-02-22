/**
 * Organisation Teams - List and manage teams within the organisation
 * For account managers to create and manage teams
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOrganisationTeams,
  createTeam,
  deleteTeam,
  getTeamMembers,
  canManageTeamMembers,
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
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function OrganisationTeams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create team dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const orgId = user?.organisationId;
  const canManage = canManageTeamMembers(user);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const teamsData = await getOrganisationTeams(orgId);

        // Get member count for each team
        const teamsWithCounts = await Promise.all(
          teamsData.map(async (team) => {
            const members = await getTeamMembers(orgId, team.id);
            return { ...team, memberCount: members.length };
          })
        );

        setTeams(teamsWithCounts);
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [orgId]);

  // Handle create team
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setCreating(true);
    try {
      const newTeam = await createTeam(orgId, {
        name: newTeamName,
        description: newTeamDescription,
        createdBy: user.uid,
      });

      setTeams([...teams, { ...newTeam, memberCount: 0 }]);
      setCreateDialogOpen(false);
      setNewTeamName("");
      setNewTeamDescription("");
    } catch (err) {
      console.error("Error creating team:", err);
      setError("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  // Handle delete team
  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    setDeleting(true);
    try {
      await deleteTeam(orgId, teamToDelete.id);
      setTeams(teams.filter((t) => t.id !== teamToDelete.id));
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (err) {
      console.error("Error deleting team:", err);
      setError("Failed to delete team");
    } finally {
      setDeleting(false);
    }
  };

  // Handle view team details
  const handleViewTeam = (team) => {
    navigate(`/organisation/teams/${team.id}`);
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

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        {/* Header */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="bold">
              Teams
            </MDTypography>
            <MDTypography variant="body2" color="text">
              Organise your team members into groups
            </MDTypography>
          </MDBox>
          {canManage && (
            <MDButton
              variant="gradient"
              color="info"
              startIcon={<Icon>add</Icon>}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Team
            </MDButton>
          )}
        </MDBox>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Teams Grid */}
        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} md={6} lg={4} key={i}>
                <Card>
                  <MDBox p={3}>
                    <Skeleton variant="text" width="60%" height={30} />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="40%" />
                  </MDBox>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : teams.length === 0 ? (
          <Card>
            <MDBox p={4} textAlign="center">
              <Icon sx={{ fontSize: 48, color: "grey.400", mb: 2 }}>groups</Icon>
              <MDTypography variant="h6" color="text">
                No teams yet
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={2}>
                Create teams to organise your members and control access.
              </MDTypography>
              {canManage && (
                <MDButton
                  variant="outlined"
                  color="info"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Your First Team
                </MDButton>
              )}
            </MDBox>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {teams.map((team) => (
              <Grid item xs={12} md={6} lg={4} key={team.id}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => handleViewTeam(team)}
                >
                  <MDBox p={3}>
                    <MDBox display="flex" justifyContent="space-between" alignItems="flex-start">
                      <MDBox display="flex" alignItems="center" gap={1} mb={1}>
                        <Icon color="info">groups</Icon>
                        <MDTypography variant="h6" fontWeight="medium">
                          {team.name}
                        </MDTypography>
                      </MDBox>
                      {canManage && (
                        <MDBox display="flex" gap={0.5}>
                          <Tooltip title="Edit Team">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTeam(team);
                              }}
                            >
                              <Icon fontSize="small">edit</Icon>
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Team">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTeamToDelete(team);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Icon fontSize="small">delete</Icon>
                            </IconButton>
                          </Tooltip>
                        </MDBox>
                      )}
                    </MDBox>

                    <MDTypography variant="body2" color="text" mb={2}>
                      {team.description || "No description"}
                    </MDTypography>

                    <MDBox display="flex" alignItems="center" gap={1}>
                      <Chip
                        icon={<Icon sx={{ fontSize: "1rem !important" }}>person</Icon>}
                        label={`${team.memberCount} member${team.memberCount !== 1 ? "s" : ""}`}
                        size="small"
                        variant="outlined"
                      />
                    </MDBox>
                  </MDBox>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </MDBox>

      {/* Create Team Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="info">group_add</Icon>
            <MDTypography variant="h6">Create New Team</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          <MDBox mt={2}>
            <TextField
              fullWidth
              label="Team Name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g., Photography Team"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              placeholder="What does this team handle?"
              multiline
              rows={2}
            />
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setCreateDialogOpen(false)}
            disabled={creating}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleCreateTeam}
            disabled={creating || !newTeamName.trim()}
          >
            {creating ? "Creating..." : "Create Team"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="error">warning</Icon>
            <MDTypography variant="h6">Delete Team?</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            Are you sure you want to delete <strong>{teamToDelete?.name}</strong>?
            Team members will be unassigned from this team.
          </MDTypography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="error"
            onClick={handleDeleteTeam}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Team"}
          </MDButton>
        </DialogActions>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default OrganisationTeams;
