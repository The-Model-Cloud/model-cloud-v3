import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

// MUI components
import Icon from "@mui/material/Icon";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";

// Child components
import MessageBubble from "../MessageBubble";
import MessageComposer from "../MessageComposer";

// Utilities
import { getOtherParticipant, sendMessage } from "utils/messaging";

function ThreadView({ thread, messages, loading, currentUser }) {
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const otherParticipant = getOtherParticipant(thread, currentUser?.uid);
  const participantName = `${otherParticipant.firstName} ${otherParticipant.lastName || ""}`.trim();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (body) => {
    if (!body.trim() || !thread?.id || !currentUser?.uid) return;

    setSending(true);
    try {
      await sendMessage(thread.id, currentUser.uid, {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        profileAvatar: currentUser.profileAvatar,
      }, body);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <MDBox display="flex" flexDirection="column" height="100%">
      {/* Thread Header */}
      <MDBox
        p={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        borderBottom="1px solid"
        borderColor="divider"
      >
        <MDBox display="flex" alignItems="center">
          <MDAvatar
            src={otherParticipant.profileAvatar}
            alt={participantName}
            size="md"
            shadow="sm"
          >
            {participantName.charAt(0).toUpperCase()}
          </MDAvatar>
          <MDBox ml={2}>
            <MDTypography variant="h6" fontWeight="medium">
              {participantName}
            </MDTypography>
            {thread.type === "job" && thread.jobDetails && (
              <MDTypography variant="caption" color="text">
                Re: {thread.jobDetails.title}
              </MDTypography>
            )}
          </MDBox>
        </MDBox>

        {/* Job link button */}
        {thread.type === "job" && thread.jobId && (
          <MDButton
            component={Link}
            to={`/jobs/${thread.jobDetails?.reference || thread.jobId}`}
            variant="outlined"
            color="info"
            size="small"
          >
            <Icon sx={{ mr: 0.5 }}>work</Icon>
            View Job
          </MDButton>
        )}
      </MDBox>

      {/* Messages Area */}
      <MDBox
        flex={1}
        p={2}
        sx={{
          overflowY: "auto",
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "background.default" : "grey.50",
        }}
      >
        {loading ? (
          <MDBox display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress size={30} />
          </MDBox>
        ) : messages.length === 0 ? (
          <MDBox display="flex" justifyContent="center" alignItems="center" height="100%">
            <MDTypography variant="body2" color="text">
              No messages yet. Start the conversation!
            </MDTypography>
          </MDBox>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === currentUser?.uid;
              const showAvatar =
                index === 0 || messages[index - 1].senderId !== message.senderId;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showAvatar={showAvatar}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </MDBox>

      {/* Message Composer */}
      <MDBox borderTop="1px solid" borderColor="divider">
        <MessageComposer onSend={handleSendMessage} sending={sending} />
      </MDBox>
    </MDBox>
  );
}

ThreadView.propTypes = {
  thread: PropTypes.object.isRequired,
  messages: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  currentUser: PropTypes.object,
};

ThreadView.defaultProps = {
  loading: false,
  currentUser: null,
};

export default ThreadView;
