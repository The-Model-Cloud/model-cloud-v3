import { useEffect, useState } from "react";
import { auth, db } from "config/firebase";
import { doc, getDoc } from "firebase/firestore";
import MDAvatar from "components/MDAvatar";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";

function UserAvatarCard() {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [fullName, setFullName] = useState("Loading...");

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
    <MDBox display="flex" alignItems="center" px={2} py={1}>
      <MDAvatar src={avatarUrl} alt={fullName} size="sm" />
      <MDTypography variant="button" fontWeight="medium" ml={1}>
        {fullName}
      </MDTypography>
    </MDBox>
  );
}

export default UserAvatarCard;
