/**
 * ConversationsWidget - Displays recent conversations from the messaging system
 * Reusable component that can be placed on Dashboard and other pages
 */

import { Link } from "react-router-dom";
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";

// Material Dashboard 3 PRO React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";

// Context and utilities
import { useMessaging } from "context/MessagingContext";
import { useAuth } from "context/AuthContext";
import { getOtherParticipant, formatMessageTime, getUnreadCount } from "utils/messaging";

// Fallback avatar
import defaultAvatar from "assets/images/team-3.jpg";

function ConversationsWidget({ title, maxItems, shadow, showViewAll }) {
  const { threads, loading } = useMessaging();
  const { user } = useAuth();

  // Limit threads to maxItems
  const displayThreads = maxItems ? threads.slice(0, maxItems) : threads;

  // Empty state
  if (!loading && threads.length === 0) {
    return (
      <Card sx={{ height: "100%", boxShadow: !shadow && "none", border: "0" }}>
        <MDBox pt={2} px={2}>
          <MDTypography variant="h6" fontWeight="medium" textTransform="capitalize">
            {title}
          </MDTypography>
        </MDBox>
        <MDBox p={2} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="150px">
          <Icon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}>chat_bubble_outline</Icon>
          <MDTypography variant="body2" color="text">
            No conversations yet
          </MDTypography>
          <MDTypography variant="caption" color="text">
            Start a conversation from a job page
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card sx={{ height: "100%", boxShadow: !shadow && "none", border: "0" }}>
        <MDBox pt={2} px={2}>
          <MDTypography variant="h6" fontWeight="medium" textTransform="capitalize">
            {title}
          </MDTypography>
        </MDBox>
        <MDBox p={2} display="flex" alignItems="center" justifyContent="center" minHeight="150px">
          <MDTypography variant="body2" color="text">
            Loading...
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  const renderConversations = displayThreads.map((thread) => {
    const otherParticipant = getOtherParticipant(thread, user?.uid);
    const unreadCount = getUnreadCount(thread, user?.uid);
    const participantName = `${otherParticipant.firstName || ""} ${otherParticipant.lastName || ""}`.trim() || "Unknown";
    const lastMessage = thread.lastMessage || "No messages yet";
    const timeAgo = formatMessageTime(thread.lastMessageAt);

    return (
      <MDBox
        key={thread.id}
        component={Link}
        to={`/messages/${thread.id}`}
        sx={{
          textDecoration: "none",
          display: "block",
          "&:hover": {
            backgroundColor: "action.hover",
            borderRadius: 1,
          },
        }}
      >
        <MDBox
          display="flex"
          alignItems="center"
          py={1}
          px={1}
          mb={0.5}
        >
          {/* Avatar */}
          <MDBox mr={2} position="relative">
            <MDAvatar
              src={otherParticipant.profileAvatar || defaultAvatar}
              alt={participantName}
              shadow="md"
              size="sm"
            />
            {unreadCount > 0 && (
              <MDBox
                position="absolute"
                top={-4}
                right={-4}
              >
                <MDBadge
                  badgeContent={unreadCount > 9 ? "9+" : unreadCount}
                  color="error"
                  size="xs"
                  circular
                />
              </MDBox>
            )}
          </MDBox>

          {/* Name and message preview */}
          <MDBox
            display="flex"
            flexDirection="column"
            alignItems="flex-start"
            justifyContent="center"
            flex={1}
            minWidth={0}
          >
            <MDBox display="flex" alignItems="center" width="100%" justifyContent="space-between">
              <MDTypography
                variant="button"
                fontWeight={unreadCount > 0 ? "bold" : "medium"}
                color={unreadCount > 0 ? "dark" : "text"}
              >
                {participantName}
              </MDTypography>
              <MDTypography variant="caption" color="text" sx={{ ml: 1, flexShrink: 0 }}>
                {timeAgo}
              </MDTypography>
            </MDBox>
            <MDTypography
              variant="caption"
              color="text"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
                fontWeight: unreadCount > 0 ? "medium" : "regular",
              }}
            >
              {lastMessage}
            </MDTypography>
            {/* Show job reference if it's a job thread */}
            {thread.jobDetails && (
              <MDTypography variant="caption" color="info" sx={{ fontSize: "0.65rem" }}>
                Re: {thread.jobDetails.title}
              </MDTypography>
            )}
          </MDBox>

          {/* Reply icon */}
          <MDBox ml={1}>
            <Icon sx={{ color: "text.secondary", fontSize: 18 }}>chevron_right</Icon>
          </MDBox>
        </MDBox>
      </MDBox>
    );
  });

  return (
    <Card sx={{ height: "100%", boxShadow: !shadow && "none", border: "0" }}>
      <MDBox pt={2} px={2} display="flex" justifyContent="space-between" alignItems="center">
        <MDTypography variant="h6" fontWeight="medium" textTransform="capitalize">
          {title}
        </MDTypography>
        {showViewAll && threads.length > maxItems && (
          <MDTypography
            component={Link}
            to="/messages"
            variant="button"
            color="info"
            fontWeight="medium"
            sx={{ textDecoration: "none" }}
          >
            View All
          </MDTypography>
        )}
      </MDBox>
      <MDBox p={2} pt={1}>
        <MDBox component="ul" display="flex" flexDirection="column" p={0} m={0} sx={{ listStyle: "none" }}>
          {renderConversations}
        </MDBox>
      </MDBox>
    </Card>
  );
}

// Default props
ConversationsWidget.defaultProps = {
  title: "Conversations",
  maxItems: 5,
  shadow: true,
  showViewAll: true,
};

// PropTypes
ConversationsWidget.propTypes = {
  title: PropTypes.string,
  maxItems: PropTypes.number,
  shadow: PropTypes.bool,
  showViewAll: PropTypes.bool,
};

export default ConversationsWidget;
