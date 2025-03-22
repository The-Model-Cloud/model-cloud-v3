import { useState } from "react";
import { auth, db } from "config/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";

import {
  Card,
  Modal,
  Box,
  Typography as MuiTypography,
} from "@mui/material";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 420,
  bgcolor: "background.paper",
  borderRadius: "10px",
  boxShadow: 24,
  p: 4,
};

function DeleteAccount() {
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState(""); // 'deactivate' or 'delete'

  const handleOpen = (type) => {
    setActionType(type);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setActionType("");
  };

  const handleConfirmAction = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (actionType === "deactivate") {
      // ✅ Simulate account deactivation by setting a Firestore flag
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { status: "deactivated" });

      // 🚨 Firebase Auth deactivation requires admin-side control
      alert(
        "Your account has been marked as deactivated. Please contact support@themodel.cloud to reactivate."
      );
    }

    if (actionType === "delete") {
      try {
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        alert("Your account has been deleted.");
      } catch (error) {
        console.error("Error deleting account:", error.message);
        alert("There was a problem deleting your account.");
      }
    }

    handleClose();
  };

  const getModalText = () => {
    if (actionType === "delete") {
      return "Once you delete your account, there is no going back. Please be certain.";
    }
    if (actionType === "deactivate") {
      return "Your account will be deactivated but your data will not be deleted. You will need to contact support@themodel.cloud to activate your account.";
    }
    return "";
  };

  return (
    <>
      <Card id="delete-account">
        <MDBox
          pr={3}
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          flexDirection={{ xs: "column", sm: "row" }}
        >
          <MDBox p={3} lineHeight={1}>
            <MDBox mb={1}>
              <MDTypography variant="h5">Delete Account</MDTypography>
            </MDBox>
            <MDTypography variant="button" color="text">
              Once you delete your account, there is no going back. Please be certain.
            </MDTypography>
          </MDBox>
          <MDBox display="flex" flexDirection={{ xs: "column", sm: "row" }}>
            <MDButton
              variant="outlined"
              color="secondary"
              onClick={() => handleOpen("deactivate")}
            >
              deactivate
            </MDButton>
            <MDBox ml={{ xs: 0, sm: 1 }} mt={{ xs: 1, sm: 0 }}>
              <MDButton
                variant="gradient"
                color="error"
                sx={{ height: "100%" }}
                onClick={() => handleOpen("delete")}
              >
                delete account
              </MDButton>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>

      <Modal
        open={modalOpen}
        onClose={handleClose}
        aria-labelledby="delete-confirmation-modal"
        aria-describedby="delete-confirmation-description"
      >
        <Box sx={modalStyle}>
          <MuiTypography id="delete-confirmation-modal" variant="h6" component="h2" gutterBottom>
            {actionType === "delete" ? "Delete Account" : "Deactivate Account"}
          </MuiTypography>
          <MuiTypography id="delete-confirmation-description" sx={{ mt: 1, mb: 3 }}>
            {getModalText()}
          </MuiTypography>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <MDButton variant="outlined" color="secondary" onClick={handleClose}>
              Cancel
            </MDButton>
            <MDButton variant="gradient" color="error" onClick={handleConfirmAction}>
              Confirm
            </MDButton>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

export default DeleteAccount;
