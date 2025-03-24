import { useState, useEffect } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";

// Matching algorithm
import { doesModelMatchJob } from "utils/matching";

function JobApplicants({ job, models }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [invitedModels, setInvitedModels] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        setCurrentUser(user);
      }
    };
    fetchUser();
  }, []);

  const handleInviteModel = async (modelUid) => {
    const jobRef = doc(db, "jobs", job.id); // assuming job.id exists after fetch
    try {
      await updateDoc(jobRef, {
        invitedModels: arrayUnion(modelUid), // Invite model to apply
      });
      setInvitedModels([...invitedModels, modelUid]);
    } catch (error) {
      console.error("Error inviting model:", error);
    }
  };

  const isOwner = currentUser && job?.userId === currentUser.uid;

  return (
    <MDBox>
      {isOwner ? (
        <>
          <MDTypography variant="h5" fontWeight="medium">Applicants</MDTypography>
          {models.map((model) => (
            <MDBox key={model.uid} display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <MDBox display="flex" alignItems="center">
                <MDAvatar src={model.avatar} alt={model.name} size="lg" />
                <MDBox ml={2}>
                  <MDTypography variant="h6">{model.name}</MDTypography>
                  <MDTypography variant="body2" color="textSecondary">{model.location}</MDTypography>
                  <MDTypography variant="body2" color="textSecondary">Availability: {model.availability ? "Available" : "Not Available"}</MDTypography>
                </MDBox>
              </MDBox>

              <MDBox>
                {job.applicants.includes(model.uid) ? (
                  <MDTypography variant="body2" color="info" fontWeight="medium">Applied</MDTypography>
                ) : doesModelMatchJob(model, job) ? (
                  <MDButton
                    variant="outlined"
                    color="info"
                    onClick={() => handleInviteModel(model.uid)}
                    disabled={invitedModels.includes(model.uid)}
                  >
                    Invite Model
                  </MDButton>
                ) : (
                  <MDTypography variant="body2" color="textSecondary">Not a match</MDTypography>
                )}
              </MDBox>
            </MDBox>
          ))}
        </>
      ) : (
        <MDTypography variant="body1">You are not the job owner, so you cannot view applicants.</MDTypography>
      )}
    </MDBox>
  );
}

export default JobApplicants;
