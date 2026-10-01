import { useState } from "react";
import { auth, db } from "config/firebase";
import { doc, updateDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut,
} from "firebase/auth";
import { deleteMyAccount } from "utils/api";

import {
  Card,
  Modal,
  Box,
  Typography as MuiTypography,
  TextField,
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
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const providerIds = auth.currentUser?.providerData?.map((p) => p.providerId) || [];
  const usesPassword = providerIds.includes("password");

  const handleOpen = (type) => {
    setActionType(type);
    setModalOpen(true);
  };

  const handleClose = () => {
    if (deleting) return;
    setModalOpen(false);
    setActionType("");
    setPassword("");
    setConfirmText("");
    setErrorMessage("");
  };

  // Account deletion is irreversible, so always re-authenticate immediately beforehand.
  const reauthenticate = async (user) => {
    if (usesPassword) {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } else {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
    }
  };

  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setDeleting(true);
    setErrorMessage("");
    try {
      await reauthenticate(user);
      // Refresh the ID token so the server sees the new sign-in time
      await user.getIdToken(true);
      await deleteMyAccount();
      localStorage.removeItem("isLoggedIn");
      await signOut(auth).catch(() => {});
      alert("Your account has been deleted.");
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Error deleting account:", error.code, error.message);
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        setErrorMessage("That password is incorrect.");
      } else if (error.code === "functions/failed-precondition" && error.message !== "reauth-required") {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("There was a problem deleting your account. Please try again or contact support@themodel.cloud.");
      }
      setDeleting(false);
    }
  };

  const handleConfirmAction = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (actionType === "delete") {
      await handleDelete();
      return;
    }

    if (actionType === "deactivate") {
      // ✅ Simulate account deactivation by setting a Firestore flag
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { status: "deactivated" });

      // 🚨 Firebase Auth deactivation requires admin-side control
      alert(
        "Your account has been marked as deactivated. Please contact support@themodel.cloud to reactivate."
      );
    }

    handleClose();
  };

  const getModalText = () => {
    if (actionType === "delete") {
      return "This permanently deletes your profile, images, messages and favourites, and unsubscribes you from all email. Jobs and payment records are kept where we are legally required to. This cannot be undone.";
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
          {actionType === "delete" && (
            <Box mb={3} display="flex" flexDirection="column" gap={2}>
              {usesPassword ? (
                <TextField
                  type="password"
                  label="Confirm your password"
                  size="small"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={deleting}
                />
              ) : (
                <MuiTypography variant="body2">
                  You will be asked to sign in again to confirm it is you.
                </MuiTypography>
              )}
              <TextField
                label='Type "DELETE" to confirm'
                size="small"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={deleting}
              />
              {errorMessage && (
                <MuiTypography variant="body2" color="error">
                  {errorMessage}
                </MuiTypography>
              )}
            </Box>
          )}
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <MDButton variant="outlined" color="secondary" onClick={handleClose} disabled={deleting}>
              Cancel
            </MDButton>
            <MDButton
              variant="gradient"
              color="error"
              onClick={handleConfirmAction}
              disabled={
                deleting ||
                (actionType === "delete" && (confirmText !== "DELETE" || (usesPassword && !password)))
              }
            >
              {deleting ? "Deleting..." : "Confirm"}
            </MDButton>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

export default DeleteAccount;
