import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { callCloudFunctionStrict } from "utils/api";

import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import ApplyVoucherDialog from "./ApplyVoucherDialog";
import { TIER_LABEL, WARNING_DAYS, csvCell, endingSoon, errorMessage, fmt, hasEnded } from "./utils";

const CARDS = [
  { key: "paying", label: "Paying", help: "Live Stripe subscription" },
  { key: "nocharge", label: "No charge", help: "Free paid tier from a voucher or organisation" },
  { key: "free", label: "Free plan", help: "No paid tier" },
  { key: "voucher", label: "With a voucher", help: "Any voucher, paying or not" },
  { key: "ending", label: `Ending in ${WARNING_DAYS} days`, help: "Free time about to run out" },
];

function ClientsTab({ clients, vouchers, reload, notify }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [applyFor, setApplyFor] = useState(null); // client row being given a voucher

  const counts = useMemo(
    () => ({
      paying: clients.filter((c) => c.billing.key === "paying").length,
      nocharge: clients.filter((c) => c.billing.key === "nocharge").length,
      free: clients.filter((c) => c.billing.key === "free").length,
      voucher: clients.filter((c) => c.voucherCode || c.viaOrganisation).length,
      ending: clients.filter((c) => (c.voucherCode || c.viaOrganisation) && endingSoon(c.endsAt)).length,
    }),
    [clients]
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients
      .filter((c) => {
        if (filter === "all") return true;
        if (filter === "voucher") return c.voucherCode || c.viaOrganisation;
        if (filter === "novoucher") return !c.voucherCode && !c.viaOrganisation;
        if (filter === "ending") return (c.voucherCode || c.viaOrganisation) && endingSoon(c.endsAt);
        return c.billing.key === filter;
      })
      .filter((c) => !term || [c.name, c.email, c.company, c.voucherCode].some((v) => (v || "").toLowerCase().includes(term)))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  }, [clients, filter, search]);

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const select = (key) => {
    setFilter((prev) => (prev === key ? "all" : key));
    setPage(0);
  };

  const removeVoucher = async (c) => {
    const what =
      c.voucherMethod === "stripe_coupon"
        ? "The free months come off their Stripe subscription and they are billed normally again."
        : "They move to the Free plan immediately.";
    if (!window.confirm(`Remove voucher ${c.voucherCode} from ${c.name || c.email}? ${what}`)) return;
    try {
      await callCloudFunctionStrict("removeVoucherFromUser", { userId: c.uid });
      notify({ severity: "success", text: `Voucher removed from ${c.name || c.email}.` });
      reload();
    } catch (err) {
      notify({ severity: "error", text: errorMessage(err) });
    }
  };

  const exportCsv = () => {
    const header = ["Name", "Company", "Email", "Billing", "Tier", "Voucher", "Applied as", "Free time ends"];
    const lines = rows.map((c) =>
      [c.name, c.company, c.email, c.billing.label, TIER_LABEL[c.tier] || c.tier, c.voucherCode, c.voucherMethod, c.endsAt ? fmt(c.endsAt) : ""]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-billing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const methodLabel = { complimentary: "No charge", stripe_coupon: "Free months", organisation: "Via organisation" };

  return (
    <>
      <Grid container spacing={2} mb={3}>
        {CARDS.map((c) => (
          <Grid item xs={6} md={4} lg key={c.key}>
            <Card
              onClick={() => select(c.key)}
              sx={{
                p: 2,
                cursor: "pointer",
                height: "100%",
                border: "2px solid",
                borderColor: filter === c.key ? "info.main" : "transparent",
              }}
            >
              <MDTypography variant="h3" fontWeight="bold">
                {counts[c.key]}
              </MDTypography>
              <MDTypography variant="button" fontWeight="medium" display="block">
                {c.label}
              </MDTypography>
              <MDTypography variant="caption" color="text" display="block">
                {c.help}
              </MDTypography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ p: 3 }}>
        <MDBox display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
          <TextField
            size="small"
            placeholder="Search name, email, company or code"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon fontSize="small">search</Icon>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Show"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 200 }}
            SelectProps={{ sx: { height: 36 } }}
          >
            <MenuItem value="all">All clients</MenuItem>
            <MenuItem value="paying">Paying</MenuItem>
            <MenuItem value="nocharge">No charge</MenuItem>
            <MenuItem value="free">Free plan</MenuItem>
            <MenuItem value="other">Expired / agency seat</MenuItem>
            <MenuItem value="voucher">Has a voucher</MenuItem>
            <MenuItem value="novoucher">No voucher</MenuItem>
            <MenuItem value="ending">Free time ending soon</MenuItem>
          </TextField>
          <MDTypography variant="button" color="text">
            {rows.length} client{rows.length !== 1 ? "s" : ""}
          </MDTypography>
          <MDBox ml="auto">
            <MDButton variant="outlined" color="info" size="small" onClick={exportCsv} disabled={rows.length === 0}>
              <Icon sx={{ mr: 0.5 }}>download</Icon>
              Export CSV
            </MDButton>
          </MDBox>
        </MDBox>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell><strong>Billing</strong></TableCell>
                <TableCell><strong>Tier</strong></TableCell>
                <TableCell><strong>Voucher</strong></TableCell>
                <TableCell><strong>Free time ends</strong></TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((c) => (
                <TableRow key={c.uid} hover>
                  <TableCell>
                    <MDTypography component={Link} to={`/admin/user/${c.uid}/settings`} variant="button" fontWeight="medium" color="info">
                      {c.name || c.email || "—"}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block">
                      {c.company ? `${c.company} · ` : ""}
                      {c.email}
                    </MDTypography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={c.billing.color} label={c.billing.label} />
                  </TableCell>
                  <TableCell>{TIER_LABEL[c.tier] || c.tier}</TableCell>
                  <TableCell>
                    {c.voucherCode ? (
                      <>
                        <MDTypography variant="button" fontWeight="medium">{c.voucherCode}</MDTypography>
                        <MDTypography variant="caption" color="text" display="block">
                          {methodLabel[c.voucherMethod] || c.voucherMethod}
                        </MDTypography>
                      </>
                    ) : c.viaOrganisation ? (
                      <MDTypography variant="caption" color="text">Organisation no-charge</MDTypography>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.endsAt ? (
                      <>
                        {fmt(c.endsAt)}
                        {hasEnded(c.endsAt) && <Chip size="small" label="Ended" sx={{ ml: 1 }} />}
                        {endingSoon(c.endsAt) && <Chip size="small" color="warning" label="Ending soon" sx={{ ml: 1 }} />}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <MDButton variant="text" color="info" size="small" onClick={() => setApplyFor(c)}>
                      {c.voucherCode ? "Add voucher" : "Apply voucher"}
                    </MDButton>
                    {c.voucherCode && (
                      <MDButton variant="text" color="error" size="small" onClick={() => removeVoucher(c)}>
                        Remove
                      </MDButton>
                    )}
                    {c.viaOrganisation && (
                      <Tooltip title="Comes from an organisation no-charge grant. End it from the Organisations tab.">
                        <Icon fontSize="small" color="disabled" sx={{ verticalAlign: "middle" }}>info</Icon>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <MDTypography variant="body2" color="text" textAlign="center" py={2}>
                      No clients match these filters.
                    </MDTypography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Card>

      <ApplyVoucherDialog
        open={!!applyFor}
        client={applyFor}
        vouchers={vouchers}
        clients={clients}
        onClose={() => setApplyFor(null)}
        onDone={(message) => {
          setApplyFor(null);
          notify(message);
          reload();
        }}
      />
    </>
  );
}

export default ClientsTab;
