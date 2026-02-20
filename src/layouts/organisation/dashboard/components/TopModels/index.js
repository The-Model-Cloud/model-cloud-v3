/**
 * TopModels - Shows the most frequently booked models by the organisation
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

function TopModels({ models, loading }) {
  const navigate = useNavigate();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  const getRankColor = (index) => {
    switch (index) {
      case 0:
        return "warning"; // Gold
      case 1:
        return "secondary"; // Silver
      case 2:
        return "error"; // Bronze
      default:
        return "default";
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
        return "star";
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: "100%" }}>
        <MDBox p={3}>
          <Skeleton width={150} height={28} />
          <MDBox mt={2}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MDBox key={i} display="flex" alignItems="center" mb={2}>
                <Skeleton variant="circular" width={48} height={48} />
                <MDBox ml={2} flex={1}>
                  <Skeleton width="60%" height={20} />
                  <Skeleton width="40%" height={16} />
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
              bgColor="primary"
              variant="gradient"
              borderRadius="lg"
              display="flex"
              justifyContent="center"
              alignItems="center"
              color="white"
              mr={2}
            >
              <Icon>star</Icon>
            </MDBox>
            <MDTypography variant="h6" fontWeight="medium">
              Top Models
            </MDTypography>
          </MDBox>
          <MDButton
            variant="text"
            color="primary"
            size="small"
            onClick={() => navigate("/models")}
          >
            Browse
          </MDButton>
        </MDBox>

        {models.length === 0 ? (
          <MDBox textAlign="center" py={4}>
            <Icon sx={{ fontSize: 48, color: "grey.400", mb: 1 }}>person_search</Icon>
            <MDTypography variant="body2" color="text">
              No models booked yet
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Your most booked models will appear here
            </MDTypography>
          </MDBox>
        ) : (
          <MDBox>
            {models.map((model, index) => (
              <MDBox key={model.uid}>
                <MDBox
                  display="flex"
                  alignItems="center"
                  py={1.5}
                  sx={{
                    cursor: model.publicSlug ? "pointer" : "default",
                    "&:hover": model.publicSlug ? { bgcolor: "grey.50" } : {},
                    borderRadius: 1,
                    px: 1,
                  }}
                  onClick={() => {
                    if (model.publicSlug) {
                      navigate(`/profile/${model.publicSlug}`);
                    }
                  }}
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
                      <Icon
                        sx={{
                          color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32",
                          fontSize: 24,
                        }}
                      >
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
                    src={model.profileImage}
                    sx={{
                      width: 48,
                      height: 48,
                      mr: 2,
                      bgcolor: "primary.main",
                      border: index === 0 ? "2px solid #FFD700" : "none",
                    }}
                  >
                    {getInitials(model.firstName, model.lastName)}
                  </Avatar>

                  {/* Name and Stats */}
                  <MDBox flex={1}>
                    <MDTypography variant="button" fontWeight="medium" display="block">
                      {model.firstName} {model.lastName}
                    </MDTypography>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <Chip
                        icon={<Icon sx={{ fontSize: "14px !important" }}>work</Icon>}
                        label={`${model.bookings} ${model.bookings === 1 ? "booking" : "bookings"}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: "0.7rem" }}
                      />
                      {model.totalSpend > 0 && (
                        <MDTypography variant="caption" color="success" fontWeight="medium">
                          {formatCurrency(model.totalSpend)}
                        </MDTypography>
                      )}
                    </MDBox>
                  </MDBox>

                  {/* Arrow */}
                  {model.publicSlug && (
                    <Icon sx={{ color: "grey.400", fontSize: 20 }}>chevron_right</Icon>
                  )}
                </MDBox>
                {index < models.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </MDBox>
            ))}
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

TopModels.propTypes = {
  models: PropTypes.arrayOf(
    PropTypes.shape({
      uid: PropTypes.string.isRequired,
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      profileImage: PropTypes.string,
      publicSlug: PropTypes.string,
      bookings: PropTypes.number.isRequired,
      totalSpend: PropTypes.number,
    })
  ).isRequired,
  loading: PropTypes.bool,
};

TopModels.defaultProps = {
  loading: false,
};

export default TopModels;
