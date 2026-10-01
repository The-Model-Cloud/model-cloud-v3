import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callCloudFunctionStrict } from "utils/api";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

import MDBox from "components/MDBox";

import CampaignEditor from "./CampaignEditor";
import CampaignReport from "./CampaignReport";

/** /admin/email/campaigns/new, or /:id (the editor for a draft, the report for anything else). */
function CampaignDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (isNew) {
      setCampaign(null);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return callCloudFunctionStrict("emailCampaignGet", { id })
      .then((res) => setCampaign(res.campaign))
      .catch((err) => setError(err.message || "Could not load the campaign."))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <MDBox display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </MDBox>
        ) : isNew ? (
          <CampaignEditor key="new" campaign={null} />
        ) : campaign?.status === "draft" ? (
          <CampaignEditor key={campaign.id} campaign={campaign} onChanged={load} />
        ) : campaign ? (
          <CampaignReport campaignId={campaign.id} onChanged={load} />
        ) : null}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default CampaignDetail;
