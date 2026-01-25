import { useState } from "react";
import PropTypes from "prop-types";

// MUI components
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";

function MessageComposer({ onSend, sending }) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !sending) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <MDBox
      component="form"
      onSubmit={handleSubmit}
      p={2}
      display="flex"
      alignItems="flex-end"
      gap={1}
    >
      <MDInput
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        multiline
        maxRows={4}
        fullWidth
        disabled={sending}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "20px",
          },
        }}
      />
      <IconButton
        type="submit"
        disabled={!message.trim() || sending}
        sx={{
          backgroundColor: "info.main",
          color: "white",
          width: 44,
          height: 44,
          "&:hover": {
            backgroundColor: "info.dark",
          },
          "&:disabled": {
            backgroundColor: "grey.300",
            color: "grey.500",
          },
        }}
      >
        {sending ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <Icon>send</Icon>
        )}
      </IconButton>
    </MDBox>
  );
}

MessageComposer.propTypes = {
  onSend: PropTypes.func.isRequired,
  sending: PropTypes.bool,
};

MessageComposer.defaultProps = {
  sending: false,
};

export default MessageComposer;
