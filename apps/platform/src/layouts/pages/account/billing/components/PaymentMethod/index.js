/**
 * Payment Method Component
 * Displays and manages saved payment methods with Stripe integration
 */

import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Images
import masterCardLogo from "assets/images/logos/mastercard.png";
import visaLogo from "assets/images/logos/visa.png";

// Material Dashboard 3 PRO React context
import { useMaterialUIController } from "context";

// API
import { deletePaymentMethod, setDefaultPaymentMethod } from "utils/api";

function PaymentMethod({ paymentMethods, loading, onAddCard, onRefresh, onError }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const [deleteDialog, setDeleteDialog] = useState({ open: false, method: null });
  const [processing, setProcessing] = useState(false);

  const getCardLogo = (brand) => {
    const brandLogos = {
      visa: visaLogo,
      mastercard: masterCardLogo,
    };
    return brandLogos[brand?.toLowerCase()] || visaLogo;
  };

  const handleSetDefault = async (methodId) => {
    setProcessing(true);
    try {
      const result = await setDefaultPaymentMethod(methodId);
      if (result.success) {
        onRefresh();
      } else {
        throw new Error("Failed to set default");
      }
    } catch (error) {
      console.error("Failed to set default payment method:", error);
      if (onError) onError("Failed to update default payment method.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.method) return;

    setProcessing(true);
    try {
      const result = await deletePaymentMethod(deleteDialog.method.id);
      if (result.success) {
        setDeleteDialog({ open: false, method: null });
        onRefresh();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete payment method:", error);
      if (onError) onError("Failed to remove payment method.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card id="payment-method">
        <MDBox pt={2} px={2} display="flex" justifyContent="space-between" alignItems="center">
          <Skeleton variant="text" width="30%" height={30} />
          <Skeleton variant="rectangular" width={120} height={36} />
        </MDBox>
        <MDBox p={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
        </MDBox>
      </Card>
    );
  }

  return (
    <>
      <Card id="payment-method">
        <MDBox pt={2} px={2} display="flex" justifyContent="space-between" alignItems="center">
          <MDTypography variant="h6" fontWeight="medium">
            Payment Method
          </MDTypography>
          <MDButton variant="gradient" color="dark" onClick={onAddCard}>
            <Icon sx={{ fontWeight: "bold" }}>add</Icon>
            &nbsp;add new card
          </MDButton>
        </MDBox>
        <MDBox p={2}>
          {paymentMethods.length === 0 ? (
            <MDBox
              p={4}
              textAlign="center"
              borderRadius="lg"
              sx={{
                border: ({ borders: { borderWidth, borderColor } }) =>
                  `${borderWidth[1]} solid ${borderColor}`,
              }}
            >
              <Icon fontSize="large" color="disabled">
                credit_card_off
              </Icon>
              <MDTypography variant="body2" color="text" mt={1}>
                No payment methods saved
              </MDTypography>
              <MDTypography variant="caption" color="text">
                Add a card to pay for jobs.
              </MDTypography>
              <MDBox mt={2}>
                <MDButton variant="outlined" color="info" size="small" onClick={onAddCard}>
                  Add Payment Method
                </MDButton>
              </MDBox>
            </MDBox>
          ) : (
            <Grid container spacing={3}>
              {paymentMethods.map((method) => (
                <Grid item xs={12} md={6} key={method.id}>
                  <MDBox
                    borderRadius="lg"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={3}
                    sx={{
                      border: ({ borders: { borderWidth, borderColor } }) =>
                        method.isDefault
                          ? `2px solid #1A73E8`
                          : `${borderWidth[1]} solid ${borderColor}`,
                      backgroundColor: method.isDefault ? "rgba(26, 115, 232, 0.05)" : "transparent",
                    }}
                  >
                    <MDBox component="img" src={getCardLogo(method.brand)} alt={method.brand} width="10%" mr={2} />
                    <MDBox flex={1}>
                      <MDBox display="flex" alignItems="center" gap={1}>
                        <MDTypography variant="h6" fontWeight="medium">
                          ****&nbsp;&nbsp;****&nbsp;&nbsp;****&nbsp;&nbsp;{method.last4}
                        </MDTypography>
                        {method.isDefault && (
                          <Chip label="Default" color="info" size="small" />
                        )}
                      </MDBox>
                      <MDTypography variant="caption" color="text">
                        Expires {method.expMonth}/{method.expYear}
                      </MDTypography>
                    </MDBox>
                    <MDBox display="flex" alignItems="center" gap={0.5}>
                      {!method.isDefault && (
                        <Tooltip title="Set as Default" placement="top">
                          <IconButton
                            size="small"
                            onClick={() => handleSetDefault(method.id)}
                            disabled={processing}
                            sx={{ color: darkMode ? "white" : "dark" }}
                          >
                            <Icon fontSize="small">check_circle</Icon>
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Remove Card" placement="top">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteDialog({ open: true, method })}
                          disabled={processing}
                          color="error"
                        >
                          <Icon fontSize="small">delete</Icon>
                        </IconButton>
                      </Tooltip>
                    </MDBox>
                  </MDBox>
                </Grid>
              ))}
            </Grid>
          )}
        </MDBox>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, method: null })}
      >
        <DialogTitle>Remove Payment Method</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            Are you sure you want to remove the card ending in{" "}
            <strong>{deleteDialog.method?.last4}</strong>?
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton
            variant="text"
            color="dark"
            onClick={() => setDeleteDialog({ open: false, method: null })}
            disabled={processing}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="error"
            onClick={handleDelete}
            disabled={processing}
          >
            {processing ? "Removing..." : "Remove"}
          </MDButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

PaymentMethod.defaultProps = {
  paymentMethods: [],
  loading: false,
  onError: null,
};

PaymentMethod.propTypes = {
  paymentMethods: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      brand: PropTypes.string,
      last4: PropTypes.string,
      expMonth: PropTypes.number,
      expYear: PropTypes.number,
      isDefault: PropTypes.bool,
    })
  ),
  loading: PropTypes.bool,
  onAddCard: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onError: PropTypes.func,
};

export default PaymentMethod;
