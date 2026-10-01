import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import TextField from "@mui/material/TextField";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import { clientPaymentState, isPaymentHeld, isPaymentReleased } from "utils/paymentStatus";

export const STATE_META = {
  require_payment: { label: "Require Payment", color: "warning" },
  pending: { label: "Pending", color: "default" },
  paid: { label: "Paid", color: "success" },
  refunded: { label: "Refunded", color: "default" },
};

const STATE_ORDER = { require_payment: 0, pending: 1, paid: 2, refunded: 3 };

export const formatMoney = (pence, currency = "GBP") => {
  const symbol = { GBP: "£", EUR: "€", USD: "$" }[currency] || `${currency} `;
  return `${symbol}${((pence || 0) / 100).toFixed(2)}`;
};

const subtext = (job, state) => {
  const status = job.payment?.status;
  if (state === "paid") {
    if (isPaymentHeld(status)) return "Held securely until the job is complete";
    if (isPaymentReleased(status)) return "Released to the model";
  }
  if (status === "processing") return "Processing with your bank";
  if (status === "failed") return "Last payment attempt failed";
  if (state === "require_payment") return "Booking confirmed, payment needed";
  if (state === "pending") return job.status === "closed" ? "Job closed" : "Not booked yet";
  return "";
};

/** Every job the client has, with what they owe or have paid. */
function JobPayments({ jobs, loading }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const rows = useMemo(
    () =>
      jobs
        // A closed job that never had a booking is just noise here
        .filter((job) => !(job.status === "closed" && !job.awardedTo && !job.payment))
        .map((job) => ({ job, state: clientPaymentState(job) })),
    [jobs]
  );

  const counts = useMemo(() => {
    const c = { all: rows.length, require_payment: 0, pending: 0, paid: 0 };
    rows.forEach((r) => {
      if (c[r.state] !== undefined) c[r.state] += 1;
    });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => filter === "all" || r.state === filter)
      .filter(
        (r) =>
          !term ||
          (r.job.title || "").toLowerCase().includes(term) ||
          (r.job.reference || "").toLowerCase().includes(term) ||
          (r.job.awardedTo?.modelName || "").toLowerCase().includes(term)
      )
      .sort(
        (a, b) =>
          STATE_ORDER[a.state] - STATE_ORDER[b.state] || String(b.job.createdAt || "").localeCompare(String(a.job.createdAt || ""))
      );
  }, [rows, filter, search]);

  const filters = [
    { key: "all", label: "All" },
    { key: "require_payment", label: "Require Payment" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
  ];

  return (
    <Card>
      <MDBox p={3} pb={1}>
        <MDTypography variant="h6" fontWeight="medium">
          Your jobs
        </MDTypography>
        <MDTypography variant="button" color="text">
          Pending jobs have not been booked yet. Once you book a model the job moves to Require Payment. Your payment
          is taken when you pay and held securely until the job is complete.
        </MDTypography>
        <MDBox display="flex" gap={1} flexWrap="wrap" alignItems="center" mt={2}>
          {filters.map((f) => (
            <Chip
              key={f.key}
              size="small"
              clickable
              label={`${f.label} (${counts[f.key] ?? 0})`}
              color={filter === f.key ? "info" : "default"}
              onClick={() => {
                setFilter(f.key);
                setPage(0);
              }}
            />
          ))}
          <TextField
            size="small"
            placeholder="Search job, reference or model"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ ml: "auto", minWidth: 240 }}
          />
        </MDBox>
      </MDBox>

      {loading ? (
        <MDBox p={3}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={60} />
        </MDBox>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Job</strong></TableCell>
                  <TableCell><strong>Model</strong></TableCell>
                  <TableCell align="right"><strong>Amount</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.slice(page * 10, page * 10 + 10).map(({ job, state }) => {
                  const meta = STATE_META[state];
                  const hasAmount = state !== "pending" && job.payment?.clientAmount;
                  const link = `/jobs/${job.reference || job.id}`;
                  return (
                    <TableRow key={job.id} hover>
                      <TableCell>
                        <MDTypography variant="button" fontWeight="medium" display="block">
                          {job.title || "Untitled job"}
                        </MDTypography>
                        <MDTypography variant="caption" color="text">{job.reference}</MDTypography>
                      </TableCell>
                      <TableCell>{job.awardedTo?.modelName || "—"}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {hasAmount ? (
                          formatMoney(job.payment.clientAmount, job.payment.currency)
                        ) : job.budget ? (
                          <MDTypography variant="caption" color="text">Budget {job.budget}</MDTypography>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={meta.color} label={meta.label} />
                        <MDTypography variant="caption" color="text" display="block">
                          {subtext(job, state)}
                        </MDTypography>
                      </TableCell>
                      <TableCell align="right">
                        {state === "require_payment" ? (
                          <MDButton variant="gradient" color="success" size="small" onClick={() => navigate(`${link}?pay=1`)}>
                            Pay now
                          </MDButton>
                        ) : (
                          <MDButton variant="outlined" color="dark" size="small" onClick={() => navigate(link)}>
                            View job
                          </MDButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <MDTypography variant="body2" color="text" textAlign="center" py={2}>
                        {rows.length === 0 ? "You haven't posted any jobs yet." : "No jobs match these filters."}
                      </MDTypography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={visible.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={10}
            rowsPerPageOptions={[10]}
          />
        </>
      )}
    </Card>
  );
}

JobPayments.defaultProps = { jobs: [], loading: false };
JobPayments.propTypes = {
  jobs: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
};

export default JobPayments;
