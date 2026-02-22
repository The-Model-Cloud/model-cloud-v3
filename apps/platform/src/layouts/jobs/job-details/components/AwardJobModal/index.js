/**
 * Award Job Modal Component
 * Allows client to award a job to a specific applicant
 */

import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Icon from "@mui/material/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";

// API
import { awardJobToModel } from "utils/api";

function AwardJobModal({ open, onClose, job, model, onAwardSuccess }) {
  const [amount, setAmount] = useState(job?.budget || "");
  const [currency, setCurrency] = useState(job?.currency || "GBP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currencySymbols = { GBP: "£", EUR: "€", USD: "$" };
  const symbol = currencySymbols[currency] || currency;

  const platformFeePercent = 5;
  const amountNum = parseFloat(amount) || 0;
  const platformFee = amountNum * (platformFeePercent / 100);
  const totalAmount = amountNum + platformFee;

  const handleSubmit = async () => {
    if (!amount || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await awardJobToModel(job.id, model.uid, amountNum, currency);

      if (result.success) {
        onAwardSuccess(result);
        onClose();
      } else {
        throw new Error(result.message || "Failed to award job");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <MDBox display="flex" alignItems="center" gap={1}>
          <Icon color="info">emoji_events</Icon>
          Award Job
        </MDBox>
      </DialogTitle>
      <DialogContent>
        <MDBox py={2}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Model Info */}
          <MDBox
            display="flex"
            alignItems="center"
            gap={2}
            p={2}
            borderRadius="lg"
            bgColor="grey-100"
            mb={3}
          >
            <MDAvatar
              src={model?.profileAvatar}
              alt={model?.firstName}
              size="lg"
              shadow="md"
            />
            <MDBox>
              <MDTypography variant="h6" fontWeight="medium">
                {model?.firstName} {model?.lastName}
              </MDTypography>
              <MDTypography variant="caption" color="text">
                {model?.email}
              </MDTypography>
            </MDBox>
          </MDBox>

          {/* Job Info */}
          <MDBox mb={3}>
            <MDTypography variant="body2" color="text" mb={1}>
              <strong>Job:</strong> {job?.title}
            </MDTypography>
            <MDTypography variant="body2" color="text">
              <strong>Reference:</strong> {job?.reference}
            </MDTypography>
          </MDBox>

          {/* Amount and Currency */}
          <MDBox display="flex" gap={2} mb={3}>
            <MDBox flex={1}>
              <MDInput
                type="number"
                label="Agreed Amount"
                fullWidth
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{symbol}</InputAdornment>
                  ),
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
              />
            </MDBox>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                label="Currency"
              >
                <MenuItem value="GBP">GBP (£)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
                <MenuItem value="USD">USD ($)</MenuItem>
              </Select>
            </FormControl>
          </MDBox>

          {/* Fee Breakdown */}
          {amountNum > 0 && (
            <MDBox
              p={2}
              borderRadius="lg"
              bgColor="info"
              bgGradient
            >
              <MDTypography variant="body2" color="white" fontWeight="medium" mb={1}>
                Payment Summary
              </MDTypography>
              <MDBox display="flex" justifyContent="space-between" mb={0.5}>
                <MDTypography variant="caption" color="white">
                  Model receives
                </MDTypography>
                <MDTypography variant="caption" color="white" fontWeight="medium">
                  {symbol}{amountNum.toFixed(2)}
                </MDTypography>
              </MDBox>
              <MDBox display="flex" justifyContent="space-between" mb={0.5}>
                <MDTypography variant="caption" color="white">
                  Platform fee ({platformFeePercent}%)
                </MDTypography>
                <MDTypography variant="caption" color="white" fontWeight="medium">
                  {symbol}{platformFee.toFixed(2)}
                </MDTypography>
              </MDBox>
              <MDBox
                display="flex"
                justifyContent="space-between"
                pt={1}
                borderTop="1px solid rgba(255,255,255,0.3)"
              >
                <MDTypography variant="body2" color="white" fontWeight="bold">
                  You pay
                </MDTypography>
                <MDTypography variant="body2" color="white" fontWeight="bold">
                  {symbol}{totalAmount.toFixed(2)}
                </MDTypography>
              </MDBox>
            </MDBox>
          )}

          {/* Warning about Stripe account */}
          <MDBox mt={2}>
            <MDTypography variant="caption" color="text">
              <Icon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }}>
                info
              </Icon>
              The model will be notified of this award. Payment will be processed after the model
              completes their payout account setup (if not already done).
            </MDTypography>
          </MDBox>
        </MDBox>
      </DialogContent>
      <DialogActions>
        <MDButton variant="outlined" color="dark" onClick={onClose} disabled={loading}>
          Cancel
        </MDButton>
        <MDButton
          variant="gradient"
          color="info"
          onClick={handleSubmit}
          disabled={loading || amountNum <= 0}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <>
              <Icon sx={{ mr: 0.5 }}>emoji_events</Icon>
              Award Job
            </>
          )}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

AwardJobModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  job: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    reference: PropTypes.string,
    budget: PropTypes.number,
    currency: PropTypes.string,
  }).isRequired,
  model: PropTypes.shape({
    uid: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    profileAvatar: PropTypes.string,
  }).isRequired,
  onAwardSuccess: PropTypes.func.isRequired,
};

export default AwardJobModal;
