import PropTypes from "prop-types";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";

// Utilities
import { formatDetailedTime } from "utils/messaging";

function MessageBubble({ message, isOwnMessage, showAvatar }) {
  const bubbleColor = isOwnMessage ? "info" : "white";
  const textColor = isOwnMessage ? "white" : "dark";

  return (
    <MDBox
      display="flex"
      justifyContent={isOwnMessage ? "flex-end" : "flex-start"}
      mb={1}
      px={1}
    >
      <MDBox
        display="flex"
        flexDirection={isOwnMessage ? "row-reverse" : "row"}
        alignItems="flex-end"
        maxWidth="70%"
      >
        {/* Avatar */}
        {!isOwnMessage && (
          <MDBox mr={1} visibility={showAvatar ? "visible" : "hidden"}>
            <MDAvatar
              src={message.senderAvatar}
              alt={message.senderName}
              size="sm"
              shadow="sm"
            >
              {(message.senderName || "U").charAt(0).toUpperCase()}
            </MDAvatar>
          </MDBox>
        )}

        {/* Message Content */}
        <MDBox>
          {/* Sender name for received messages */}
          {!isOwnMessage && showAvatar && (
            <MDTypography variant="caption" color="text" fontWeight="medium" ml={1}>
              {message.senderName}
            </MDTypography>
          )}

          {/* Message bubble */}
          <MDBox
            bgColor={bubbleColor}
            color={textColor}
            borderRadius="lg"
            p={1.5}
            px={2}
            shadow={isOwnMessage ? "sm" : "none"}
            sx={{
              border: isOwnMessage ? "none" : "1px solid",
              borderColor: "divider",
            }}
          >
            <MDTypography
              variant="body2"
              color={textColor}
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {message.body}
            </MDTypography>
          </MDBox>

          {/* Timestamp */}
          <MDTypography
            variant="caption"
            color="text"
            sx={{
              display: "block",
              textAlign: isOwnMessage ? "right" : "left",
              mt: 0.5,
              mx: 1,
              fontSize: "0.7rem",
            }}
          >
            {formatDetailedTime(message.createdAt)}
          </MDTypography>
        </MDBox>
      </MDBox>
    </MDBox>
  );
}

MessageBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string,
    senderId: PropTypes.string,
    senderName: PropTypes.string,
    senderAvatar: PropTypes.string,
    body: PropTypes.string,
    createdAt: PropTypes.object,
  }).isRequired,
  isOwnMessage: PropTypes.bool,
  showAvatar: PropTypes.bool,
};

MessageBubble.defaultProps = {
  isOwnMessage: false,
  showAvatar: true,
};

export default MessageBubble;
