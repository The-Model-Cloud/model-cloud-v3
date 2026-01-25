import PropTypes from "prop-types";

// MUI components
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";

// Utilities
import { getOtherParticipant, getUnreadCount, formatMessageTime } from "utils/messaging";

function ThreadList({ threads, selectedThreadId, currentUserId, onSelectThread }) {
  return (
    <List sx={{ p: 0 }}>
      {threads.map((thread) => {
        const otherParticipant = getOtherParticipant(thread, currentUserId);
        const unreadCount = getUnreadCount(thread, currentUserId);
        const isSelected = thread.id === selectedThreadId;
        const participantName = `${otherParticipant.firstName} ${otherParticipant.lastName || ""}`.trim();

        return (
          <ListItem
            key={thread.id}
            button
            onClick={() => onSelectThread(thread)}
            sx={{
              py: 1.5,
              px: 2,
              backgroundColor: isSelected ? "action.selected" : "transparent",
              borderLeft: isSelected ? "3px solid" : "3px solid transparent",
              borderColor: isSelected ? "info.main" : "transparent",
              "&:hover": {
                backgroundColor: isSelected ? "action.selected" : "action.hover",
              },
            }}
          >
            <ListItemAvatar>
              <MDAvatar
                src={otherParticipant.profileAvatar}
                alt={participantName}
                size="md"
                shadow="sm"
              >
                {participantName.charAt(0).toUpperCase()}
              </MDAvatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <MDBox display="flex" justifyContent="space-between" alignItems="center">
                  <MDTypography
                    variant="button"
                    fontWeight={unreadCount > 0 ? "bold" : "medium"}
                    color={unreadCount > 0 ? "dark" : "text"}
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "140px",
                    }}
                  >
                    {participantName}
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    {formatMessageTime(thread.lastMessageAt)}
                  </MDTypography>
                </MDBox>
              }
              secondary={
                <MDBox display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                  <MDTypography
                    variant="caption"
                    color="text"
                    fontWeight={unreadCount > 0 ? "medium" : "regular"}
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: unreadCount > 0 ? "120px" : "160px",
                    }}
                  >
                    {thread.lastMessage || "No messages yet"}
                  </MDTypography>
                  {unreadCount > 0 && (
                    <MDBadge
                      badgeContent={unreadCount}
                      color="info"
                      size="xs"
                      circular
                      container
                    />
                  )}
                </MDBox>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
}

ThreadList.propTypes = {
  threads: PropTypes.array.isRequired,
  selectedThreadId: PropTypes.string,
  currentUserId: PropTypes.string,
  onSelectThread: PropTypes.func.isRequired,
};

ThreadList.defaultProps = {
  selectedThreadId: null,
  currentUserId: null,
};

export default ThreadList;
