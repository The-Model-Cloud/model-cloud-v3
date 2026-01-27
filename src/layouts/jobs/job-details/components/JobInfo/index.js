import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    case "USD":
      return "$";
    default:
      return currency || "";
  }
};

// Helper to format arrays as comma-separated strings or chips
const formatArray = (arr) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
  return arr.join(", ");
};

// Helper to check if a value exists and is not empty
const hasValue = (val) => {
  if (val === null || val === undefined || val === "") return false;
  if (Array.isArray(val)) return val.length > 0;
  return true;
};

// Section component for organizing details
function DetailSection({ title, icon, children }) {
  return (
    <MDBox mb={3}>
      <MDBox display="flex" alignItems="center" mb={1.5}>
        <Icon sx={{ color: "info.main", mr: 1 }}>{icon}</Icon>
        <MDTypography variant="h6" fontWeight="medium" color="dark">
          {title}
        </MDTypography>
      </MDBox>
      <MDBox pl={4}>
        {children}
      </MDBox>
    </MDBox>
  );
}

// Single detail item component
function DetailItem({ label, value, unit = "" }) {
  if (!hasValue(value)) return null;

  const displayValue = Array.isArray(value) ? formatArray(value) : value;

  return (
    <MDBox mb={1}>
      <MDTypography variant="caption" color="text" fontWeight="medium" textTransform="uppercase">
        {label}
      </MDTypography>
      <MDTypography variant="body2" color="dark">
        {displayValue}{unit}
      </MDTypography>
    </MDBox>
  );
}

// Tag chips for displaying arrays as visual chips
function TagChips({ items, color = "info" }) {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  return (
    <MDBox display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
      {items.map((item, index) => (
        <Chip
          key={index}
          label={item}
          size="small"
          sx={{
            backgroundColor: color === "info" ? "rgba(26, 115, 232, 0.1)" : "rgba(76, 175, 80, 0.1)",
            color: color === "info" ? "info.main" : "success.main",
            fontWeight: 500,
            fontSize: "0.75rem",
          }}
        />
      ))}
    </MDBox>
  );
}

function JobInfo({ job }) {
  const currencySymbol = getCurrencySymbol(job.currency);

  // Format the date
  const jobDate = job.dayDate && job.monthDate && job.yearDate
    ? `${job.dayDate} ${job.monthDate} ${job.yearDate}`
    : null;

  // Check if there are any requirements
  const hasRequirements = hasValue(job.minHeight) || hasValue(job.maxHeight) ||
    hasValue(job.minWeight) || hasValue(job.maxWeight) || hasValue(job.waist) ||
    hasValue(job.hips) || hasValue(job.chest) || hasValue(job.collar) ||
    hasValue(job.braSize) || hasValue(job.dressSize) || hasValue(job.shoeSize) ||
    hasValue(job.eyeColour) || hasValue(job.hairColour);

  return (
    <MDBox>
      {/* Header Section */}
      <MDBox mb={3}>
        <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <MDBox>
            <MDTypography variant="h3" fontWeight="bold" color="dark">
              {job.title}
            </MDTypography>
            <MDBox display="flex" alignItems="center" mt={1} gap={1}>
              <Icon sx={{ color: "text.secondary", fontSize: "1.2rem" }}>location_on</Icon>
              <MDTypography variant="body1" color="text">
                {job.location || `${job.city || ""}${job.city && (job.county || job.state || job.country) ? ", " : ""}${job.county || job.state || ""}${(job.county || job.state) && job.country ? ", " : ""}${job.country || ""}`}
              </MDTypography>
            </MDBox>
          </MDBox>
          <MDBadge
            variant="contained"
            color={job.status === "Closed" ? "error" : "success"}
            badgeContent={job.status || "Open"}
            container
            size="lg"
          />
        </MDBox>
      </MDBox>

      {/* Key Info Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4}>
          <MDBox
            p={2}
            borderRadius="lg"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white"
            }}
          >
            <MDTypography variant="caption" color="white" opacity={0.8} fontWeight="medium">
              BUDGET
            </MDTypography>
            <MDTypography variant="h4" color="white" fontWeight="bold">
              {currencySymbol}{job.budget || "TBD"}
            </MDTypography>
            <MDTypography variant="caption" color="white" opacity={0.8}>
              {job.rateType || ""}
            </MDTypography>
          </MDBox>
        </Grid>

        {jobDate && (
          <Grid item xs={6} sm={4}>
            <MDBox
              p={2}
              borderRadius="lg"
              sx={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white"
              }}
            >
              <MDTypography variant="caption" color="white" opacity={0.8} fontWeight="medium">
                JOB DATE
              </MDTypography>
              <MDTypography variant="h5" color="white" fontWeight="bold">
                {jobDate}
              </MDTypography>
            </MDBox>
          </Grid>
        )}

        {hasValue(job.qty) && (
          <Grid item xs={6} sm={4}>
            <MDBox
              p={2}
              borderRadius="lg"
              sx={{
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white"
              }}
            >
              <MDTypography variant="caption" color="white" opacity={0.8} fontWeight="medium">
                MODELS NEEDED
              </MDTypography>
              <MDTypography variant="h4" color="white" fontWeight="bold">
                {job.qty}
              </MDTypography>
            </MDBox>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Job Type & Categories */}
      {(hasValue(job.jobType) || hasValue(job.categories) || hasValue(job.gender)) && (
        <DetailSection title="Job Details" icon="work">
          {hasValue(job.jobType) && (
            <MDBox mb={2}>
              <MDTypography variant="caption" color="text" fontWeight="medium" textTransform="uppercase">
                Job Type
              </MDTypography>
              <TagChips items={Array.isArray(job.jobType) ? job.jobType : [job.jobType]} color="info" />
            </MDBox>
          )}

          {hasValue(job.categories) && (
            <MDBox mb={2}>
              <MDTypography variant="caption" color="text" fontWeight="medium" textTransform="uppercase">
                Categories / Skills Required
              </MDTypography>
              <TagChips items={job.categories} color="success" />
            </MDBox>
          )}

          {hasValue(job.gender) && (
            <MDBox mb={2}>
              <MDTypography variant="caption" color="text" fontWeight="medium" textTransform="uppercase">
                Preferred Gender
              </MDTypography>
              <TagChips items={Array.isArray(job.gender) ? job.gender : [job.gender]} color="info" />
            </MDBox>
          )}
        </DetailSection>
      )}

      {/* Description */}
      {hasValue(job.description) && (
        <DetailSection title="Description" icon="description">
          <MDTypography
            variant="body2"
            color="text"
            component="div"
            dangerouslySetInnerHTML={{ __html: job.description }}
            sx={{
              "& ul, & ol": {
                marginLeft: "20px",
                paddingLeft: "10px",
              },
              "& li": {
                marginBottom: "0.5rem",
              },
              "& p": {
                marginBottom: "0.75rem",
              },
            }}
          />
        </DetailSection>
      )}

      {/* Usage */}
      {hasValue(job.usage) && (
        <DetailSection title="Usage Rights" icon="copyright">
          <MDTypography
            variant="body2"
            color="text"
            component="div"
            dangerouslySetInnerHTML={{ __html: job.usage }}
            sx={{
              "& ul, & ol": {
                marginLeft: "20px",
                paddingLeft: "10px",
              },
              "& li": {
                marginBottom: "0.5rem",
              },
              "& p": {
                marginBottom: "0.75rem",
              },
            }}
          />
        </DetailSection>
      )}

      {/* Model Requirements Section */}
      {hasRequirements && (
        <>
          <Divider sx={{ my: 3 }} />
          <DetailSection title="Model Requirements" icon="person_search">
            <Grid container spacing={2}>
              {/* Height Requirements */}
              {(hasValue(job.minHeight) || hasValue(job.maxHeight)) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDBox display="flex" alignItems="center" mb={0.5}>
                      <Icon sx={{ fontSize: "1rem", mr: 0.5, color: "text.secondary" }}>height</Icon>
                      <MDTypography variant="caption" color="text" fontWeight="medium">
                        Height
                      </MDTypography>
                    </MDBox>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {hasValue(job.minHeight) && hasValue(job.maxHeight)
                        ? `${job.minHeight} - ${job.maxHeight} cm`
                        : hasValue(job.minHeight)
                          ? `Min ${job.minHeight} cm`
                          : `Max ${job.maxHeight} cm`
                      }
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Weight Requirements */}
              {(hasValue(job.minWeight) || hasValue(job.maxWeight)) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDBox display="flex" alignItems="center" mb={0.5}>
                      <Icon sx={{ fontSize: "1rem", mr: 0.5, color: "text.secondary" }}>fitness_center</Icon>
                      <MDTypography variant="caption" color="text" fontWeight="medium">
                        Weight
                      </MDTypography>
                    </MDBox>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {hasValue(job.minWeight) && hasValue(job.maxWeight)
                        ? `${job.minWeight} - ${job.maxWeight} kg`
                        : hasValue(job.minWeight)
                          ? `Min ${job.minWeight} kg`
                          : `Max ${job.maxWeight} kg`
                      }
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Waist */}
              {hasValue(job.waist) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDTypography variant="caption" color="text" fontWeight="medium">
                      Waist
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {job.waist} cm
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Hips */}
              {hasValue(job.hips) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDTypography variant="caption" color="text" fontWeight="medium">
                      Hips
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {job.hips} cm
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Chest */}
              {hasValue(job.chest) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDTypography variant="caption" color="text" fontWeight="medium">
                      Chest
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {job.chest} cm
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Collar */}
              {hasValue(job.collar) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDTypography variant="caption" color="text" fontWeight="medium">
                      Collar
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {job.collar} cm
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Bra Size */}
              {hasValue(job.braSize) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDTypography variant="caption" color="text" fontWeight="medium">
                      Bra Size
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {formatArray(job.braSize)}
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Dress Size */}
              {hasValue(job.dressSize) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDTypography variant="caption" color="text" fontWeight="medium">
                      Dress Size (UK)
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {formatArray(job.dressSize)}
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Shoe Size */}
              {hasValue(job.shoeSize) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDTypography variant="caption" color="text" fontWeight="medium">
                      Shoe Size (UK)
                    </MDTypography>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {formatArray(job.shoeSize)}
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Eye Colour */}
              {hasValue(job.eyeColour) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDBox display="flex" alignItems="center" mb={0.5}>
                      <Icon sx={{ fontSize: "1rem", mr: 0.5, color: "text.secondary" }}>visibility</Icon>
                      <MDTypography variant="caption" color="text" fontWeight="medium">
                        Eye Colour
                      </MDTypography>
                    </MDBox>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {formatArray(job.eyeColour)}
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}

              {/* Hair Colour */}
              {hasValue(job.hairColour) && (
                <Grid item xs={6} sm={4} md={3}>
                  <MDBox
                    p={1.5}
                    borderRadius="lg"
                    sx={{ backgroundColor: "grey.100" }}
                  >
                    <MDBox display="flex" alignItems="center" mb={0.5}>
                      <Icon sx={{ fontSize: "1rem", mr: 0.5, color: "text.secondary" }}>face</Icon>
                      <MDTypography variant="caption" color="text" fontWeight="medium">
                        Hair Colour
                      </MDTypography>
                    </MDBox>
                    <MDTypography variant="body2" fontWeight="medium" color="dark">
                      {formatArray(job.hairColour)}
                    </MDTypography>
                  </MDBox>
                </Grid>
              )}
            </Grid>
          </DetailSection>
        </>
      )}

      {/* Job Reference */}
      <Divider sx={{ my: 3 }} />
      <MDBox display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <MDTypography variant="caption" color="text">
          Job Reference: <strong>{job.reference}</strong>
        </MDTypography>
        {job.createdAt && (
          <MDTypography variant="caption" color="text">
            Posted: {new Date(job.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </MDTypography>
        )}
      </MDBox>
    </MDBox>
  );
}

export default JobInfo;
