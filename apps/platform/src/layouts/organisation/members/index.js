/**
 * Organisation Members - List and manage all members in the organisation
 * For account managers and admins to manage user roles and team assignments
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getOrganisationUsers,
  getOrganisationTeams,
  updateMemberRole,
  assignUserToTeam,
  removeUserFromOrganisation,
  canManageOrganisation,
  canManageTeamMembers,
  canInviteMembers,
  ORG_ROLES,
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
import Avatar from "@mui/material/Avatar";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Layout components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function OrganisationMembers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Edit member dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editTeam, setEditTeam] = useState("");
  const [saving, setSaving] = useState(false);

  // Remove member dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Add member dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("member");
  const [newMemberTeam, setNewMemberTeam] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const orgId = user?.organisationId;
  const canManageOrg = canManageOrganisation(user);
  const canManageMembers = canManageTeamMembers(user);
  const canInvite = canInviteMembers(user) || user?.role === "account manager";

  // Fetch members and teams
  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [membersData, teamsData] = await Promise.all([
          getOrganisationUsers(orgId),
          getOrganisationTeams(orgId),
        ]);

        setMembers(membersData);
        setTeams(teamsData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load organisation members");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  // Open edit dialog
  const handleEditMember = (member) => {
    setMemberToEdit(member);
    setEditRole(member.organisationRole || ORG_ROLES.MEMBER);
    setEditTeam(member.teamId || "");
    setEditDialogOpen(true);
  };

  // Save member changes
  const handleSaveMember = async () => {
    if (!memberToEdit) return;

    setSaving(true);
    try {
      // Update role if changed
      if (editRole !== (memberToEdit.organisationRole || ORG_ROLES.MEMBER)) {
        await updateMemberRole(memberToEdit.uid, editRole);
      }

      // Update team if changed
      if (editTeam !== (memberToEdit.teamId || "")) {
        await assignUserToTeam(memberToEdit.uid, editTeam || null);
      }

      // Update local state
      setMembers(
        members.map((m) =>
          m.uid === memberToEdit.uid
            ? { ...m, organisationRole: editRole, teamId: editTeam || null }
            : m
        )
      );

      setEditDialogOpen(false);
      setMemberToEdit(null);
      setSuccess(`${memberToEdit.firstName}'s settings updated`);
    } catch (err) {
      console.error("Error updating member:", err);
      setError("Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  // Remove member from organisation
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setRemoving(true);
    try {
      await removeUserFromOrganisation(memberToRemove.uid);
      setMembers(members.filter((m) => m.uid !== memberToRemove.uid));
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
      setSuccess(`${memberToRemove.firstName} removed from organisation`);
    } catch (err) {
      console.error("Error removing member:", err);
      setError("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  // Reset add member form
  const resetAddMemberForm = () => {
    setNewMemberEmail("");
    setNewMemberPassword("");
    setNewMemberFirstName("");
    setNewMemberLastName("");
    setNewMemberRole("member");
    setNewMemberTeam("");
    setShowPassword(false);
  };

  // Add new member to organisation
  const handleAddMember = async () => {
    // Validate fields
    if (!newMemberEmail.trim() || !newMemberPassword || !newMemberFirstName.trim() || !newMemberLastName.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate password length
    if (newMemberPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setAddingMember(true);
    setError(null);

    try {
      const functions = getFunctions(getApp(), "us-central1");
      const createOrganisationMember = httpsCallable(functions, "createOrganisationMember");

      const result = await createOrganisationMember({
        email: newMemberEmail.trim(),
        password: newMemberPassword,
        firstName: newMemberFirstName.trim(),
        lastName: newMemberLastName.trim(),
        organisationRole: newMemberRole,
        teamId: newMemberTeam || null,
      });

      // Add new member to local state
      const newMember = {
        id: result.data.uid,
        uid: result.data.uid,
        email: result.data.email,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        role: "client",
        organisationRole: result.data.organisationRole,
        teamId: newMemberTeam || null,
      };

      setMembers([...members, newMember]);
      setAddDialogOpen(false);
      resetAddMemberForm();
      setSuccess(`${newMemberFirstName} ${newMemberLastName} has been added to the organisation`);
    } catch (err) {
      console.error("Error adding member:", err);
      // Extract error message from Firebase function error
      const errorMessage = err.message || "Failed to add member";
      setError(errorMessage.includes("already exists") ? "A user with this email already exists" : errorMessage);
    } finally {
      setAddingMember(false);
    }
  };

  // Generate random password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMemberPassword(password);
    setShowPassword(true);
  };

  // Get team name by ID
  const getTeamName = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name || "—";
  };

  // Get role display color
  const getRoleColor = (role) => {
    switch (role) {
      case ORG_ROLES.OWNER:
        return "primary";
      case ORG_ROLES.ADMIN:
        return "info";
      default:
        return "default";
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

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        {/* Header */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="bold">
              Organisation Members
            </MDTypography>
            <MDTypography variant="body2" color="text">
              Manage user roles and team assignments
            </MDTypography>
          </MDBox>
          <MDBox display="flex" gap={2}>
            <MDButton
              variant="outlined"
              color="info"
              startIcon={<Icon>groups</Icon>}
              onClick={() => navigate("/organisation/teams")}
            >
              Manage Teams
            </MDButton>
            {canInvite && (
              <MDButton
                variant="gradient"
                color="info"
                startIcon={<Icon>person_add</Icon>}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Member
              </MDButton>
            )}
          </MDBox>
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

        {/* Members Table */}
        <Card>
          {loading ? (
            <MDBox p={3}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </MDBox>
          ) : members.length === 0 ? (
            <MDBox p={4} textAlign="center">
              <Icon sx={{ fontSize: 48, color: "grey.400", mb: 2 }}>people_outline</Icon>
              <MDTypography variant="h6" color="text">
                No members found
              </MDTypography>
              <MDTypography variant="body2" color="text">
                Organisation members will appear here.
              </MDTypography>
            </MDBox>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <MDTypography variant="caption" fontWeight="bold" color="text">
                        Member
                      </MDTypography>
                    </TableCell>
                    <TableCell>
                      <MDTypography variant="caption" fontWeight="bold" color="text">
                        Role
                      </MDTypography>
                    </TableCell>
                    <TableCell>
                      <MDTypography variant="caption" fontWeight="bold" color="text">
                        Team
                      </MDTypography>
                    </TableCell>
                    <TableCell>
                      <MDTypography variant="caption" fontWeight="bold" color="text">
                        User Role
                      </MDTypography>
                    </TableCell>
                    {canManageMembers && (
                      <TableCell align="right">
                        <MDTypography variant="caption" fontWeight="bold" color="text">
                          Actions
                        </MDTypography>
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <TableRow
                      key={member.uid}
                      sx={{ "&:hover": { bgcolor: "grey.50" } }}
                    >
                      <TableCell>
                        <MDBox display="flex" alignItems="center" gap={2}>
                          <Avatar src={member.photoURL}>
                            {member.firstName?.[0] || member.email?.[0]?.toUpperCase()}
                          </Avatar>
                          <MDBox>
                            <MDTypography variant="body2" fontWeight="medium">
                              {member.firstName} {member.lastName}
                              {member.uid === user.uid && (
                                <Chip
                                  label="You"
                                  size="small"
                                  sx={{ ml: 1, height: 20, fontSize: "0.65rem" }}
                                />
                              )}
                            </MDTypography>
                            <MDTypography variant="caption" color="text">
                              {member.email}
                            </MDTypography>
                          </MDBox>
                        </MDBox>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.organisationRole || ORG_ROLES.MEMBER}
                          size="small"
                          color={getRoleColor(member.organisationRole)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <MDTypography variant="body2" color="text">
                          {member.teamId ? getTeamName(member.teamId) : "—"}
                        </MDTypography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.role || "client"}
                          size="small"
                          variant="filled"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>
                      {canManageMembers && (
                        <TableCell align="right">
                          <MDBox display="flex" justifyContent="flex-end" gap={0.5}>
                            <Tooltip title="Edit Member">
                              <IconButton
                                size="small"
                                onClick={() => handleEditMember(member)}
                                disabled={
                                  member.organisationRole === ORG_ROLES.OWNER &&
                                  user.organisationRole !== ORG_ROLES.OWNER
                                }
                              >
                                <Icon fontSize="small">edit</Icon>
                              </IconButton>
                            </Tooltip>
                            {canManageOrg && member.uid !== user.uid && (
                              <Tooltip title="Remove from Organisation">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setMemberToRemove(member);
                                    setRemoveDialogOpen(true);
                                  }}
                                  disabled={member.organisationRole === ORG_ROLES.OWNER}
                                >
                                  <Icon fontSize="small">person_remove</Icon>
                                </IconButton>
                              </Tooltip>
                            )}
                          </MDBox>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* Role Legend */}
        <Card sx={{ mt: 3 }}>
          <MDBox p={3}>
            <MDTypography variant="h6" fontWeight="medium" mb={2}>
              Role Permissions
            </MDTypography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <MDBox
                  p={2}
                  borderRadius="lg"
                  sx={{ bgcolor: "grey.100" }}
                >
                  <MDBox display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip label="owner" size="small" color="primary" variant="outlined" />
                  </MDBox>
                  <MDTypography variant="caption" color="text">
                    Full control: manage organisation settings, all members, teams, and view all jobs/analytics.
                  </MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12} md={4}>
                <MDBox
                  p={2}
                  borderRadius="lg"
                  sx={{ bgcolor: "grey.100" }}
                >
                  <MDBox display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip label="admin" size="small" color="info" variant="outlined" />
                  </MDBox>
                  <MDTypography variant="caption" color="text">
                    Team management: can manage team members, view all org jobs, invite new members.
                  </MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12} md={4}>
                <MDBox
                  p={2}
                  borderRadius="lg"
                  sx={{ bgcolor: "grey.100" }}
                >
                  <MDBox display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip label="member" size="small" variant="outlined" />
                  </MDBox>
                  <MDTypography variant="caption" color="text">
                    Standard access: can create and manage own jobs, view favourites.
                  </MDTypography>
                </MDBox>
              </Grid>
            </Grid>
          </MDBox>
        </Card>
      </MDBox>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="info">edit</Icon>
            <MDTypography variant="h6">Edit Member Settings</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          {memberToEdit && (
            <MDBox mt={2}>
              <MDBox display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar src={memberToEdit.photoURL} sx={{ width: 48, height: 48 }}>
                  {memberToEdit.firstName?.[0]}
                </Avatar>
                <MDBox>
                  <MDTypography variant="body1" fontWeight="medium">
                    {memberToEdit.firstName} {memberToEdit.lastName}
                  </MDTypography>
                  <MDTypography variant="body2" color="text">
                    {memberToEdit.email}
                  </MDTypography>
                </MDBox>
              </MDBox>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Organisation Role</InputLabel>
                <Select
                  value={editRole}
                  label="Organisation Role"
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={
                    memberToEdit.organisationRole === ORG_ROLES.OWNER &&
                    user.organisationRole !== ORG_ROLES.OWNER
                  }
                >
                  <MenuItem value={ORG_ROLES.MEMBER}>Member</MenuItem>
                  <MenuItem value={ORG_ROLES.ADMIN}>Admin</MenuItem>
                  {user.organisationRole === ORG_ROLES.OWNER && (
                    <MenuItem value={ORG_ROLES.OWNER}>Owner</MenuItem>
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Team Assignment</InputLabel>
                <Select
                  value={editTeam}
                  label="Team Assignment"
                  onChange={(e) => setEditTeam(e.target.value)}
                >
                  <MenuItem value="">
                    <em>No Team</em>
                  </MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </MDBox>
          )}
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
            onClick={handleSaveMember}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="error">warning</Icon>
            <MDTypography variant="h6">Remove Member?</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            Are you sure you want to remove{" "}
            <strong>
              {memberToRemove?.firstName} {memberToRemove?.lastName}
            </strong>{" "}
            from the organisation? They will lose access to all organisation resources.
          </MDTypography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => setRemoveDialogOpen(false)}
            disabled={removing}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="error"
            onClick={handleRemoveMember}
            disabled={removing}
          >
            {removing ? "Removing..." : "Remove Member"}
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => {
          if (!addingMember) {
            setAddDialogOpen(false);
            resetAddMemberForm();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="info">person_add</Icon>
            <MDTypography variant="h6">Add New Member</MDTypography>
          </MDBox>
        </DialogTitle>
        <DialogContent>
          <MDBox mt={2}>
            <MDTypography variant="body2" color="text" mb={2}>
              Create a new user account and add them to your organisation. They will receive an email with their login details.
            </MDTypography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={newMemberFirstName}
                  onChange={(e) => setNewMemberFirstName(e.target.value)}
                  disabled={addingMember}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={newMemberLastName}
                  onChange={(e) => setNewMemberLastName(e.target.value)}
                  disabled={addingMember}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  disabled={addingMember}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={newMemberPassword}
                  onChange={(e) => setNewMemberPassword(e.target.value)}
                  disabled={addingMember}
                  required
                  helperText="Minimum 6 characters"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <MDBox display="flex" gap={0.5}>
                          <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              <Icon fontSize="small">
                                {showPassword ? "visibility_off" : "visibility"}
                              </Icon>
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Generate password">
                            <IconButton size="small" onClick={generatePassword}>
                              <Icon fontSize="small">autorenew</Icon>
                            </IconButton>
                          </Tooltip>
                        </MDBox>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Organisation Role</InputLabel>
                  <Select
                    value={newMemberRole}
                    label="Organisation Role"
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    disabled={addingMember}
                  >
                    <MenuItem value="member">Member</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Team (Optional)</InputLabel>
                  <Select
                    value={newMemberTeam}
                    label="Team (Optional)"
                    onChange={(e) => setNewMemberTeam(e.target.value)}
                    disabled={addingMember}
                  >
                    <MenuItem value="">
                      <em>No Team</em>
                    </MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <MDBox mt={2} p={2} sx={{ bgcolor: "grey.100", borderRadius: 1 }}>
              <MDTypography variant="caption" color="text">
                <strong>Note:</strong> This user will be created with the platform role &quot;Client&quot; and added to your organisation with the selected organisation role.
              </MDTypography>
            </MDBox>
          </MDBox>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <MDButton
            variant="outlined"
            color="secondary"
            onClick={() => {
              setAddDialogOpen(false);
              resetAddMemberForm();
            }}
            disabled={addingMember}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleAddMember}
            disabled={addingMember || !newMemberEmail || !newMemberPassword || !newMemberFirstName || !newMemberLastName}
            startIcon={addingMember ? <CircularProgress size={16} color="inherit" /> : <Icon>person_add</Icon>}
          >
            {addingMember ? "Adding..." : "Add Member"}
          </MDButton>
        </DialogActions>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default OrganisationMembers;
