import { useState } from "react";
import PropTypes from "prop-types";

import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import { callCloudFunctionStrict } from "utils/api";
import { formatMoney } from "layouts/pages/account/billing/components/JobPayments";

const STATUS = {
  paid: { label: "Paid", color: "success" },
  partially_refunded: { label: "Part refunded", color: "warning" },
  refunded: { label: "Refunded", color: "default" },
};

const fmtDate = (ms) =>
  ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Firestore Timestamps to epoch milliseconds
const toMs = (value) => (value?.toMillis ? value.toMillis() : value ? new Date(value).getTime() : null);

/** Save a base64 PDF returned by the server. */
const savePdf = ({ filename, base64 }) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** The client's real invoices: membership invoices (every 30 days, even at £0) and one for each job they pay for. */
function InvoicesList({ invoices, loading, onError }) {
  const [busyId, setBusyId] = useState("");

  const download = async (invoice) => {
    setBusyId(invoice.id);
    try {
      savePdf(await callCloudFunctionStrict("getInvoicePdf", { invoiceId: invoice.id }));
    } catch (err) {
      onError(err.message || "Could not download the invoice. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3} pb={1}>
        <MDTypography variant="h6" fontWeight="medium">Invoices</MDTypography>
        <MDTypography variant="button" color="text">
          A membership invoice is issued every 30 days (including at no charge), plus one each time you pay for a job.
        </MDTypography>
      </MDBox>

      {loading ? (
        <MDBox p={3}>
          <Skeleton variant="rectangular" height={50} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={50} />
        </MDBox>
      ) : invoices.length === 0 ? (
        <MDBox p={3} pt={1}>
          <MDTypography variant="body2" color="text">
            No invoices yet. Your first membership invoice appears here shortly.
          </MDTypography>
        </MDBox>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Invoice</strong></TableCell>
                <TableCell><strong>For</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => {
                const isMembership = inv.type === "membership";
                const status = inv.total === 0 ? { label: "No charge", color: "default" } : STATUS[inv.status] || STATUS.paid;
                return (
                  <TableRow key={inv.id} hover>
                    <TableCell>
                      <MDTypography variant="button" fontWeight="medium" display="block">{inv.invoiceNumber}</MDTypography>
                      <MDTypography variant="caption" color="text">{fmtDate(inv.issuedAt)}</MDTypography>
                    </TableCell>
                    <TableCell>
                      <MDTypography variant="button" display="block">
                        {isMembership ? `${inv.membership?.tierName || "Membership"} membership` : inv.jobTitle}
                      </MDTypography>
                      <MDTypography variant="caption" color="text">
                        {isMembership
                          ? `${fmtDate(toMs(inv.membership?.periodStart))} to ${fmtDate(toMs(inv.membership?.periodEnd))}`
                          : inv.jobReference}
                      </MDTypography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {formatMoney(inv.total, inv.currency)}
                      {inv.refundedAmount > 0 && (
                        <MDTypography variant="caption" color="text" display="block">
                          Refunded {formatMoney(inv.refundedAmount, inv.currency)}
                        </MDTypography>
                      )}
                    </TableCell>
                    <TableCell><Chip size="small" label={status.label} color={status.color} /></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Download PDF">
                        <span>
                          <IconButton size="small" disabled={busyId === inv.id} onClick={() => download(inv)}>
                            <Icon fontSize="small">download</Icon>
                          </IconButton>
                        </span>
                      </Tooltip>
                      {inv.receiptUrl && (
                        <Tooltip title="Card receipt">
                          <IconButton size="small" component={Link} href={inv.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <Icon fontSize="small">receipt_long</Icon>
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}

InvoicesList.defaultProps = { invoices: [], loading: false };
InvoicesList.propTypes = {
  invoices: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  onError: PropTypes.func.isRequired,
};

export default InvoicesList;
