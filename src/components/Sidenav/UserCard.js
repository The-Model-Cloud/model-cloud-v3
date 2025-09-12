import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";
import MDAvatar from "components/MDAvatar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function UserCard() {
  const [fullName, setFullName] = useState("Loading...");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setFullName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
          setAvatarUrl(data.profileAvatar || "");
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <MDBox display="flex" alignItems="center" flexDirection="column" py={2}>
      <MDAvatar src={avatarUrl} alt={fullName} size="sm" />
      <MDTypography variant="button" fontWeight="small" mt={1}>
        {fullName}
      </MDTypography>
    </MDBox>
  );
}

export default UserCard;
