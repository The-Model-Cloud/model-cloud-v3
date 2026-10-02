import { useMemo } from "react";
import PropTypes from "prop-types";

import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import { formatMoney } from "layouts/pages/account/billing/components/JobPayments";
import { clientPaymentState } from "utils/paymentStatus";

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/**
 * What is coming up: the next membership invoice or renewal, and any booked jobs waiting to be paid for.
 * (Everything already paid is in the invoices list below.)
 */
function UpcomingPayments({ membership, jobs, loading }) {
  const rows = useMemo(() => {
    const list = [];
    (membership?.upcoming || []).forEach((u) =>
      list.push({
        key: `m-${u.date}`,
        what: u.description,
        when: fmt(u.date),
        amount: u.amount,
        currency: u.currency,
        note: u.amount === 0 ? "No charge" : "Charged automatically",
        color: u.amount === 0 ? "default" : "info",
      })
    );
    jobs
      .filter((job) => clientPaymentState(job) === "require_payment")
      .forEach((job) =>
        list.push({
          key: `j-${job.id}`,
          what: `Booking: ${job.title || job.reference}${job.awardedTo?.modelName ? ` (${job.awardedTo.modelName})` : ""}`,
          when: "Due now",
          amount: job.payment?.clientAmount || 0,
          currency: job.payment?.currency || "GBP",
          note: "Waiting for payment",
          color: "warning",
        })
      );
    return list;
  }, [membership, jobs]);

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3} pb={1}>
        <MDTypography variant="h6" fontWeight="medium">
          Upcoming payments
        </MDTypography>
        <MDTypography variant="button" color="text">
          What you will be charged next, and bookings waiting for payment
        </MDTypography>
      </MDBox>

      {loading ? (
        <MDBox p={3} pt={1}>
          <Skeleton variant="rectangular" height={50} />
        </MDBox>
      ) : rows.length === 0 ? (
        <MDBox p={3} pt={1}>
          <MDTypography variant="body2" color="text">
            Nothing coming up. You have no membership charge or unpaid bookings.
          </MDTypography>
        </MDBox>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>
                    <MDTypography variant="button" fontWeight="medium" display="block">
                      {r.what}
                    </MDTypography>
                    <MDTypography variant="caption" color="text">
                      {r.when}
                    </MDTypography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={r.color} label={r.note} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {formatMoney(r.amount, r.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}

UpcomingPayments.defaultProps = { membership: null, jobs: [], loading: false };
UpcomingPayments.propTypes = {
  membership: PropTypes.shape({ upcoming: PropTypes.array }),
  jobs: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
};

export default UpcomingPayments;
