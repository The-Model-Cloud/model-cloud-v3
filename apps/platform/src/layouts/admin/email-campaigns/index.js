import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { callCloudFunctionStrict } from "utils/api";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import { STATUS_META, audienceLabel, categoryLabel, fmtDateTime, pct } from "./constants";

function EmailCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    callCloudFunctionStrict("emailCampaignList", {})
      .then((res) => setCampaigns(res.campaigns))
      .catch((err) => setError(err.message || "Could not load campaigns."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">
              Email Campaigns
            </MDTypography>
            <MDTypography variant="body2" color="text">
              Send marketing emails to people who have opted in, and see how they perform.
            </MDTypography>
          </MDBox>
          <MDButton variant="gradient" color="info" onClick={() => navigate("/admin/email/campaigns/new")}>
            <Icon sx={{ mr: 0.5 }}>add</Icon>
            New campaign
          </MDButton>
        </MDBox>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Card sx={{ p: 2 }}>
          {loading ? (
            <MDBox display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </MDBox>
          ) : campaigns.length === 0 ? (
            <Alert severity="info">No campaigns yet. Click New campaign to write your first one.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Campaign</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Audience</strong></TableCell>
                    <TableCell><strong>When</strong></TableCell>
                    <TableCell align="right"><strong>Sent</strong></TableCell>
                    <TableCell align="right"><strong>Opened</strong></TableCell>
                    <TableCell align="right"><strong>Clicked</strong></TableCell>
                    <TableCell align="right"><strong>Visited</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.map((c) => {
                    const meta = STATUS_META[c.status] || { label: c.status, color: "default" };
                    const counts = c.counts || {};
                    return (
                      <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/email/campaigns/${c.id}`)}>
                        <TableCell>
                          <MDTypography variant="button" fontWeight="medium" display="block">{c.name}</MDTypography>
                          <MDTypography variant="caption" color="text">{c.subject || "No subject yet"}</MDTypography>
                        </TableCell>
                        <TableCell><Chip size="small" label={meta.label} color={meta.color} /></TableCell>
                        <TableCell>
                          <MDTypography variant="caption" color="text" display="block">{audienceLabel(c.audience)}</MDTypography>
                          <MDTypography variant="caption" color="text">{categoryLabel(c.category)}</MDTypography>
                        </TableCell>
                        <TableCell>
                          <MDTypography variant="caption" color="text">
                            {fmtDateTime(c.completedAt || c.scheduledAt || c.createdAt)}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="right">{counts.sent ?? 0}</TableCell>
                        <TableCell align="right">{pct(counts.opened, counts.sent)}</TableCell>
                        <TableCell align="right">{pct(counts.clicked, counts.sent)}</TableCell>
                        <TableCell align="right">{counts.visitors ?? 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default EmailCampaigns;
