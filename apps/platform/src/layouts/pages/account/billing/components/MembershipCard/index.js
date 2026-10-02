import { useState } from "react";
import PropTypes from "prop-types";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import { callCloudFunctionStrict } from "utils/api";
import { formatMoney } from "layouts/pages/account/billing/components/JobPayments";
import ConfirmDialog from "layouts/pages/account/billing/components/ConfirmDialog";

const WEBSITE_URL = process.env.REACT_APP_WEBSITE_URL || "https://themodel.cloud";

const BILLING = {
  paying: { label: "Paying", color: "success" },
  payment_failed: { label: "Payment failed", color: "error" },
  no_charge: { label: "No charge", color: "info" },
  free: { label: "Free plan", color: "default" },
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";

function Fact({ label, children }) {
  return (
    <MDBox>
      <MDTypography variant="caption" color="text" display="block" textTransform="uppercase" fontWeight="bold">
        {label}
      </MDTypography>
      <MDTypography variant="body2" fontWeight="medium" component="div">
        {children}
      </MDTypography>
    </MDBox>
  );
}
Fact.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

/** The client's plan at a glance: tier, price, when it ends or renews, any voucher, and the billing switch. */
function MembershipCard({ membership, loading, onChanged, onError }) {
  const [confirm, setConfirm] = useState(null); // "cancel" | "resume"
  const [busy, setBusy] = useState(false);

  if (loading || !membership) {
    return (
      <Card sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={110} />
      </Card>
    );
  }

  const { plan, freeUntil, voucher, renewsOn, cancelAtPeriodEnd, canCancel, canResume } = membership;
  const billing = BILLING[plan.billing] || BILLING.free;
  const price =
    plan.billing === "paying" || plan.billing === "payment_failed"
      ? `${formatMoney(plan.priceMonthly)} per month`
      : plan.billing === "no_charge"
        ? `£0.00 (normally ${formatMoney(plan.priceMonthly)} per month)`
        : "£0.00";

  const run = async (fn, successText) => {
    setBusy(true);
    try {
      await callCloudFunctionStrict(fn, {});
      setConfirm(null);
      onChanged(successText);
    } catch (err) {
      setConfirm(null);
      onError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <MDBox display="flex" alignItems="center" gap={1.5} flexWrap="wrap" mb={2}>
        <MDTypography variant="h6" fontWeight="medium">
          Your membership
        </MDTypography>
        <Chip size="small" color={billing.color} label={billing.label} />
        {cancelAtPeriodEnd && <Chip size="small" color="warning" label="Billing stopped" />}
      </MDBox>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Fact label="Plan">{plan.name}</Fact>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Fact label="Price">{price}</Fact>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {plan.billing === "no_charge" ? (
            <Fact label="Free until">{fmt(freeUntil)}</Fact>
          ) : cancelAtPeriodEnd ? (
            <Fact label="Ends on">{fmt(renewsOn)}</Fact>
          ) : renewsOn ? (
            <Fact label="Renews on">{fmt(renewsOn)}</Fact>
          ) : (
            <Fact label="Expires">Never</Fact>
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Fact label="Voucher">
            {voucher ? (
              <>
                {voucher.code}
                {voucher.until ? (
                  <MDTypography variant="caption" color="text" display="block">
                    Free until {fmt(voucher.until)}
                  </MDTypography>
                ) : null}
              </>
            ) : (
              "None"
            )}
          </Fact>
        </Grid>
      </Grid>

      {plan.billing === "payment_failed" && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Your last membership payment failed. Please update your payment method below to keep your {plan.name} plan.
        </Alert>
      )}
      {plan.billing === "no_charge" && (
        <Alert severity="info" sx={{ mt: 2 }}>
          You have the full {plan.name} plan at no charge until {fmt(freeUntil)}. You won&apos;t be billed. We&apos;ll remind you
          before it ends, and your account then moves to the Free plan unless you choose a plan.
        </Alert>
      )}
      {cancelAtPeriodEnd && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Membership billing is switched off. You keep your {plan.name} plan until {fmt(renewsOn)} and won&apos;t be charged again.
          After that your account moves to the Free plan.
        </Alert>
      )}

      <MDBox display="flex" gap={1.5} flexWrap="wrap" mt={3}>
        {(plan.billing === "free" || plan.billing === "no_charge") && (
          <MDButton variant="gradient" color="info" component="a" href={`${WEBSITE_URL}/pricing`} target="_blank" rel="noopener noreferrer">
            <Icon sx={{ mr: 0.5 }}>workspace_premium</Icon>
            {plan.billing === "free" ? "Choose a plan" : "See plans"}
          </MDButton>
        )}
        {canCancel && (
          <MDButton variant="outlined" color="error" onClick={() => setConfirm("cancel")}>
            <Icon sx={{ mr: 0.5 }}>block</Icon>
            Turn off membership billing
          </MDButton>
        )}
        {canResume && (
          <MDButton variant="gradient" color="success" onClick={() => setConfirm("resume")}>
            <Icon sx={{ mr: 0.5 }}>restart_alt</Icon>
            Turn billing back on
          </MDButton>
        )}
      </MDBox>

      <ConfirmDialog
        open={confirm === "cancel"}
        title="Turn off membership billing?"
        confirmLabel="Turn off billing"
        confirmColor="error"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("cancelMyMembership", `Membership billing is off. You keep your ${plan.name} plan until ${fmt(renewsOn)}.`)}
      >
        You keep your {plan.name} plan until {fmt(renewsOn)}. You won&apos;t be charged again, and after that date your account
        moves to the Free plan. Your jobs, messages and history are not affected. You can turn billing back on any time before then.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "resume"}
        title="Turn billing back on?"
        confirmLabel="Turn billing on"
        confirmColor="success"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("resumeMyMembership", `Membership billing is back on. Your ${plan.name} plan renews on ${fmt(renewsOn)}.`)}
      >
        Your {plan.name} plan will carry on and renew on {fmt(renewsOn)}.
      </ConfirmDialog>
    </Card>
  );
}

MembershipCard.defaultProps = { membership: null, loading: false };
MembershipCard.propTypes = {
  membership: PropTypes.shape({
    plan: PropTypes.object,
    freeUntil: PropTypes.string,
    voucher: PropTypes.object,
    renewsOn: PropTypes.string,
    cancelAtPeriodEnd: PropTypes.bool,
    canCancel: PropTypes.bool,
    canResume: PropTypes.bool,
  }),
  loading: PropTypes.bool,
  onChanged: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default MembershipCard;
