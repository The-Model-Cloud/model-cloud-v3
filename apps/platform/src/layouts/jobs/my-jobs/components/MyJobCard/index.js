import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import MDButton from "components/MDButton";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    case "USD":
      return "$";
    default:
      return currency || "£";
  }
};

const getApplicationStatusConfig = (status) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return { color: "warning", icon: "schedule", label: "Pending" };
    case "accepted":
    case "approved":
      return { color: "success", icon: "check_circle", label: "Accepted" };
    case "rejected":
      return { color: "error", icon: "cancel", label: "Rejected" };
    case "owner":
      return { color: "info", icon: "business_center", label: "Your Job" };
    case "invited":
      return { color: "secondary", icon: "mail", label: "Invited" };
    default:
      return { color: "secondary", icon: "help", label: status || "Unknown" };
  }
};

const getJobStatusConfig = (status) => {
  switch (status?.toLowerCase()) {
    case "open":
      return { color: "success", label: "Open" };
    case "closed":
      return { color: "error", label: "Closed" };
    default:
      return { color: "warning", label: status || "Open" };
  }
};

function MyJobCard({ job }) {
  const currencySymbol = getCurrencySymbol(job.budget?.currency || job.currency);
  const budgetAmount = job.budget?.amount || job.budget;
  const applicationConfig = getApplicationStatusConfig(job.applicationStatus);
  const jobStatusConfig = getJobStatusConfig(job.status);

  // Format the date
  const jobDate = job.dayDate && job.monthDate && job.yearDate
    ? `${job.dayDate} ${job.monthDate} ${job.yearDate}`
    : null;

  // Format location from country/county/state/city fields
  const formatLocation = () => {
    const parts = [];
    if (job.city) parts.push(job.city);
    if (job.county) parts.push(job.county);
    if (job.state) parts.push(job.state);
    if (job.country) parts.push(job.country);

    if (parts.length > 0) {
      return parts.join(", ");
    }
    return job.location || "Location TBD";
  };

  // Limit categories shown
  const maxCategories = 3;
  const displayCategories = job.categories?.slice(0, maxCategories) || [];
  const remainingCategories = (job.categories?.length || 0) - maxCategories;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
        },
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Application/Ownership Status Badge */}
      <MDBox
        position="absolute"
        top={-8}
        right={12}
        zIndex={2}
      >
        <Tooltip title={
          job.isOwner
            ? "You created this job"
            : job.isInvited
              ? `You've been invited to apply${job.invitedByName ? ` by ${job.invitedByName}` : ""}`
              : `Application status: ${applicationConfig.label}`
        }>
          <MDBox
            display="flex"
            alignItems="center"
            gap={0.5}
            px={1.5}
            py={0.5}
            borderRadius="lg"
            sx={{
              background: applicationConfig.color === "success"
                ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                : applicationConfig.color === "warning"
                  ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                  : applicationConfig.color === "error"
                    ? "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)"
                    : applicationConfig.color === "secondary"
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <Icon sx={{ color: "white", fontSize: "1rem" }}>
              {applicationConfig.icon}
            </Icon>
            <MDTypography variant="caption" color="white" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
              {applicationConfig.label.toUpperCase()}
            </MDTypography>
          </MDBox>
        </Tooltip>
      </MDBox>

      {/* Card Content */}
      <MDBox p={2.5} pt={3} display="flex" flexDirection="column" flexGrow={1}>
        {/* Header with Title and Job Status */}
        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Link to={`/jobs/${job.reference}`} style={{ textDecoration: "none", flex: 1 }}>
            <MDTypography
              variant="h6"
              fontWeight="bold"
              color="dark"
              sx={{
                "&:hover": { color: "info.main" },
                transition: "color 0.2s",
                lineHeight: 1.3,
              }}
            >
              {job.title}
            </MDTypography>
          </Link>
          <MDBadge
            variant="contained"
            color={jobStatusConfig.color}
            badgeContent={jobStatusConfig.label}
            size="xs"
            container
            sx={{ ml: 1 }}
          />
        </MDBox>

        {/* Location */}
        <MDBox display="flex" alignItems="center" gap={0.5} mb={1.5}>
          <Icon sx={{ color: "text.secondary", fontSize: "1rem" }}>location_on</Icon>
          <MDTypography variant="body2" color="text" fontWeight="regular">
            {formatLocation()}
          </MDTypography>
        </MDBox>

        {/* Budget & Date Row */}
        <MDBox display="flex" gap={2} mb={2} flexWrap="wrap">
          <MDBox
            display="flex"
            alignItems="center"
            gap={0.5}
            px={1.5}
            py={0.75}
            borderRadius="md"
            sx={{ backgroundColor: "rgba(102, 126, 234, 0.1)" }}
          >
            <Icon sx={{ color: "info.main", fontSize: "1rem" }}>payments</Icon>
            <MDTypography variant="button" fontWeight="medium" color="info">
              {currencySymbol}{budgetAmount || "TBD"}
              {job.rateType && <span style={{ fontWeight: 400, opacity: 0.8 }}> / {job.rateType}</span>}
            </MDTypography>
          </MDBox>

          {jobDate && (
            <MDBox
              display="flex"
              alignItems="center"
              gap={0.5}
              px={1.5}
              py={0.75}
              borderRadius="md"
              sx={{ backgroundColor: "rgba(245, 87, 108, 0.1)" }}
            >
              <Icon sx={{ color: "error.main", fontSize: "1rem" }}>event</Icon>
              <MDTypography variant="button" fontWeight="medium" sx={{ color: "error.main" }}>
                {jobDate}
              </MDTypography>
            </MDBox>
          )}
        </MDBox>

        {/* Categories */}
        {displayCategories.length > 0 && (
          <MDBox display="flex" flexWrap="wrap" gap={0.5} mb={2}>
            {displayCategories.map((cat, index) => (
              <Chip
                key={index}
                label={cat}
                size="small"
                sx={{
                  backgroundColor: "rgba(76, 175, 80, 0.1)",
                  color: "success.main",
                  fontWeight: 500,
                  fontSize: "0.7rem",
                }}
              />
            ))}
            {remainingCategories > 0 && (
              <Chip
                label={`+${remainingCategories} more`}
                size="small"
                sx={{
                  backgroundColor: "grey.200",
                  color: "text.secondary",
                  fontWeight: 500,
                  fontSize: "0.7rem",
                }}
              />
            )}
          </MDBox>
        )}

        {/* Spacer to push footer to bottom */}
        <MDBox flexGrow={1} />

        {/* Footer */}
        <MDBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          pt={2}
          mt={2}
          sx={{ borderTop: "1px solid", borderColor: "grey.200" }}
        >
          {/* Reference & Date */}
          <MDBox>
            <MDTypography variant="caption" color="text" fontWeight="medium">
              #{job.reference}
            </MDTypography>
            {job.createdAt && (
              <MDTypography variant="caption" color="text" display="block" sx={{ opacity: 0.7 }}>
                {typeof job.createdAt === 'string' ? job.createdAt : new Date(job.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </MDTypography>
            )}
          </MDBox>

          {/* Action Button */}
          {job.isOwner ? (
            <Link to={`/jobs/edit/${job.reference}`}>
              <MDButton variant="gradient" color="info" size="small">
                <Icon sx={{ mr: 0.5 }}>edit</Icon>
                Edit
              </MDButton>
            </Link>
          ) : job.isInvited ? (
            <Link to={`/jobs/${job.reference}`}>
              <MDButton variant="gradient" color="secondary" size="small">
                <Icon sx={{ mr: 0.5 }}>mail</Icon>
                View & Apply
              </MDButton>
            </Link>
          ) : (
            <Link to={`/jobs/${job.reference}`}>
              <MDButton variant="outlined" color="info" size="small">
                <Icon sx={{ mr: 0.5 }}>visibility</Icon>
                View
              </MDButton>
            </Link>
          )}
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default MyJobCard;
