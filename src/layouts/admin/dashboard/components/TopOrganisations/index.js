/**
 * TopOrganisations - Shows the most active organisations
 */

import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function TopOrganisations({ organisations, loading }) {
  const navigate = useNavigate();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const words = name.split(" ");
    if (words.length === 1) return name.charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  };

  const getRankColor = (index) => {
    switch (index) {
      case 0:
        return "#FFD700"; // Gold
      case 1:
        return "#C0C0C0"; // Silver
      case 2:
        return "#CD7F32"; // Bronze
      default:
        return "#7b809a";
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return "emoji_events";
      case 1:
        return "workspace_premium";
      case 2:
        return "military_tech";
      default:
        return "business";
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: "100%" }}>
        <MDBox p={3}>
          <Skeleton width={180} height={28} />
          <MDBox mt={2}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MDBox key={i} display="flex" alignItems="center" mb={2}>
                <Skeleton variant="circular" width={48} height={48} />
                <MDBox ml={2} flex={1}>
                  <Skeleton width="70%" height={20} />
                  <Skeleton width="50%" height={16} />
                </MDBox>
              </MDBox>
            ))}
          </MDBox>
        </MDBox>
      </Card>
    );
  }

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDBox display="flex" alignItems="center">
            <MDBox
              width="3rem"
              height="3rem"
              bgColor="warning"
              variant="gradient"
              borderRadius="lg"
              display="flex"
              justifyContent="center"
              alignItems="center"
              color="white"
              mr={2}
            >
              <Icon>corporate_fare</Icon>
            </MDBox>
            <MDTypography variant="h6" fontWeight="medium">
              Top Organisations
            </MDTypography>
          </MDBox>
          <MDButton
            variant="text"
            color="warning"
            size="small"
            onClick={() => navigate("/admin/organisations")}
          >
            View All
          </MDButton>
        </MDBox>

        {organisations.length === 0 ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 1 }}>business_center</Icon>
            <MDTypography variant="body2" color="text">
              No organisations yet
            </MDTypography>
          </MDBox>
        ) : (
          <MDBox>
            {organisations.map((org, index) => (
              <MDBox key={org.id}>
                <MDBox
                  display="flex"
                  alignItems="center"
                  py={1.5}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: "grey.50" },
                    borderRadius: 1,
                    px: 1,
                  }}
                  onClick={() => navigate(`/admin/organisations/${org.id}`)}
                >
                  {/* Rank Badge */}
                  <MDBox
                    width={28}
                    height={28}
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    mr={1}
                  >
                    {index < 3 ? (
                      <Icon sx={{ color: getRankColor(index), fontSize: 24 }}>
                        {getRankIcon(index)}
                      </Icon>
                    ) : (
                      <MDTypography variant="button" fontWeight="medium" color="text">
                        #{index + 1}
                      </MDTypography>
                    )}
                  </MDBox>

                  {/* Avatar */}
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      mr: 2,
                      bgcolor: index === 0 ? "warning.main" : "info.main",
                      border: index === 0 ? "2px solid #FFD700" : "none",
                    }}
                  >
                    {getInitials(org.companyName)}
                  </Avatar>

                  {/* Name and Stats */}
                  <MDBox flex={1}>
                    <MDTypography variant="button" fontWeight="medium" display="block">
                      {org.companyName}
                    </MDTypography>
                    <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Chip
                        icon={<Icon sx={{ fontSize: "14px !important" }}>work</Icon>}
                        label={`${org.totalJobs || 0} jobs`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: "0.7rem" }}
                      />
                      {org.totalSpend > 0 && (
                        <MDTypography variant="caption" color="success" fontWeight="medium">
                          {formatCurrency(org.totalSpend)}
                        </MDTypography>
                      )}
                      {org.userCount > 0 && (
                        <MDTypography variant="caption" color="text">
                          {org.userCount} users
                        </MDTypography>
                      )}
                    </MDBox>
                  </MDBox>

                  {/* Arrow */}
                  <Icon sx={{ color: "grey.400", fontSize: 20 }}>chevron_right</Icon>
                </MDBox>
                {index < organisations.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </MDBox>
            ))}
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

TopOrganisations.propTypes = {
  organisations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      companyName: PropTypes.string,
      totalJobs: PropTypes.number,
      activeJobs: PropTypes.number,
      totalSpend: PropTypes.number,
      userCount: PropTypes.number,
    })
  ).isRequired,
  loading: PropTypes.bool,
};

TopOrganisations.defaultProps = {
  loading: false,
};

export default TopOrganisations;
