// MUI components
import Icon from "@mui/material/Icon";

// Material Dashboard components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function EmptyInbox() {
  return (
    <MDBox
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      p={4}
    >
      <MDBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        width={80}
        height={80}
        borderRadius="50%"
        bgColor="grey.200"
        mb={3}
      >
        <Icon sx={{ fontSize: 40, color: "grey.500" }}>chat_bubble_outline</Icon>
      </MDBox>
      <MDTypography variant="h5" fontWeight="medium" color="text" mb={1}>
        Select a conversation
      </MDTypography>
      <MDTypography variant="body2" color="text" textAlign="center">
        Choose a conversation from the list to view messages, or start a new conversation from a job listing.
      </MDTypography>
    </MDBox>
  );
}

export default EmptyInbox;
