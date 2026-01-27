import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Default placeholder image for jobs without media
import placeholderImage from "assets/images/bg-profile.jpeg";

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

function JobCard({ job, isMatch }) {
  const currencySymbol = getCurrencySymbol(job.currency);

  // Get first image from media array or use placeholder
  const jobImage = job.media && job.media.length > 0
    ? job.media.find(url => !url.includes('.mp4') && !url.includes('.webm') && !url.includes('.mov')) || job.media[0]
    : placeholderImage;

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

  // Build description with budget and date info
  const buildDescription = () => {
    const parts = [];

    if (job.budget) {
      const budgetText = `${currencySymbol}${job.budget}${job.rateType ? ` / ${job.rateType}` : ''}`;
      parts.push(budgetText);
    }

    if (jobDate) {
      parts.push(jobDate);
    }

    if (job.categories && job.categories.length > 0) {
      const categoryText = job.categories.slice(0, 2).join(", ");
      if (job.categories.length > 2) {
        parts.push(`${categoryText} +${job.categories.length - 2} more`);
      } else {
        parts.push(categoryText);
      }
    }

    return parts.join(" • ") || "View job details";
  };

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
        boxShadow: "none",
        overflow: "visible",
        border: "0",
      }}
    >
      {/* Image with Match Badge */}
      <MDBox position="relative" width="100.25%" shadow="xl" borderRadius="xl">
        <CardMedia
          src={jobImage}
          component="img"
          title={job.title}
          sx={{
            maxWidth: "100%",
            margin: 0,
            boxShadow: ({ boxShadows: { md } }) => md,
            objectFit: "cover",
            objectPosition: "center",
            height: 200,
            borderRadius: "inherit",
          }}
        />
        {/* Match Badge Overlay */}
        <Tooltip title={isMatch ? "You match this job's requirements" : "You don't match all requirements"}>
          <MDBox
            position="absolute"
            top={12}
            right={12}
            display="flex"
            alignItems="center"
            gap={0.5}
            px={1.5}
            py={0.5}
            borderRadius="lg"
            sx={{
              background: isMatch
                ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                : "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",
              boxShadow: isMatch
                ? "0 4px 12px rgba(56, 239, 125, 0.4)"
                : "0 4px 12px rgba(235, 51, 73, 0.4)",
            }}
          >
            <Icon sx={{ color: "white", fontSize: "0.9rem" }}>
              {isMatch ? "check_circle" : "cancel"}
            </Icon>
            <MDTypography variant="caption" color="white" fontWeight="bold" sx={{ fontSize: "0.65rem" }}>
              {isMatch ? "MATCH" : "NO MATCH"}
            </MDTypography>
          </MDBox>
        </Tooltip>
      </MDBox>

      {/* Card Content */}
      <MDBox mt={1} mx={0.5}>
        {/* Label - Location */}
        <MDBox display="flex" alignItems="center" gap={0.5}>
          <Icon sx={{ color: "text.secondary", fontSize: "0.875rem" }}>location_on</Icon>
          <MDTypography
            variant="button"
            fontWeight="regular"
            color="text"
            textTransform="capitalize"
          >
            {formatLocation()}
          </MDTypography>
        </MDBox>

        {/* Title */}
        <MDBox mb={1}>
          <MDTypography
            component={Link}
            to={`/jobs/${job.reference}`}
            variant="h5"
            textTransform="capitalize"
            sx={{
              "&:hover": { color: "info.main" },
              transition: "color 0.2s",
            }}
          >
            {job.title}
          </MDTypography>
        </MDBox>

        {/* Description */}
        <MDBox mb={3} lineHeight={0}>
          <MDTypography variant="button" fontWeight="light" color="text">
            {buildDescription()}
          </MDTypography>
        </MDBox>

        {/* Footer with Action and Categories */}
        <MDBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <MDButton
            component={Link}
            to={`/jobs/${job.reference}`}
            variant="outlined"
            size="small"
            color="info"
          >
            view job
          </MDButton>

          {/* Category Chips */}
          <MDBox display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end" maxWidth="60%">
            {job.categories?.slice(0, 2).map((cat, index) => (
              <Chip
                key={index}
                label={cat}
                size="small"
                sx={{
                  backgroundColor: "rgba(76, 175, 80, 0.1)",
                  color: "success.main",
                  fontWeight: 500,
                  fontSize: "0.65rem",
                  height: 22,
                }}
              />
            ))}
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default JobCard;
