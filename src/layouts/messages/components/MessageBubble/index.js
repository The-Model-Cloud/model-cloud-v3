import PropTypes from "prop-types";
import { Link } from "react-router-dom";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";

// Utilities
import { formatDetailedTime } from "utils/messaging";

// Helper to parse message body and convert links to clickable elements
const parseMessageWithLinks = (text, textColor) => {
  if (!text) return null;

  // Pattern for markdown-style links [text](url) and plain URLs
  const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urlPattern = /(https?:\/\/[^\s]+)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  // First, handle markdown-style links
  const textWithMarkdownLinks = text.replace(markdownLinkPattern, (match, linkText, url) => {
    // Check if it's an internal link
    if (url.startsWith("/")) {
      return `__INTERNAL_LINK__${linkText}__URL__${url}__END__`;
    }
    return `__EXTERNAL_LINK__${linkText}__URL__${url}__END__`;
  });

  // Split by our markers and URLs
  const segments = textWithMarkdownLinks.split(/(__INTERNAL_LINK__|__EXTERNAL_LINK__|__URL__|__END__)/);

  let i = 0;
  const result = [];

  while (i < segments.length) {
    const segment = segments[i];

    if (segment === "__INTERNAL_LINK__") {
      const linkText = segments[i + 1];
      const url = segments[i + 3]; // Skip __URL__
      result.push(
        <Link
          key={`link-${i}`}
          to={url}
          style={{
            color: textColor === "white" ? "#90caf9" : "#1976d2",
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          {linkText}
        </Link>
      );
      i += 5; // Skip linkText, __URL__, url, __END__
    } else if (segment === "__EXTERNAL_LINK__") {
      const linkText = segments[i + 1];
      const url = segments[i + 3];
      result.push(
        <a
          key={`link-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: textColor === "white" ? "#90caf9" : "#1976d2",
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          {linkText}
        </a>
      );
      i += 5;
    } else if (segment && segment !== "__URL__" && segment !== "__END__") {
      // Regular text - also check for plain URLs
      const textParts = segment.split(urlPattern);
      textParts.forEach((part, idx) => {
        if (urlPattern.test(part)) {
          result.push(
            <a
              key={`url-${i}-${idx}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: textColor === "white" ? "#90caf9" : "#1976d2",
                textDecoration: "underline",
                wordBreak: "break-all",
              }}
            >
              {part}
            </a>
          );
        } else if (part) {
          result.push(part);
        }
      });
      i++;
    } else {
      i++;
    }
  }

  return result.length > 0 ? result : text;
};

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
              component="div"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {parseMessageWithLinks(message.body, textColor)}
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
