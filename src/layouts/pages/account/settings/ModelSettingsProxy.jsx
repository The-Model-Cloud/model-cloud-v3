import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "config/firebase";
import Settings from "./index";

function ModelSettingsProxy() {
  const { uid } = useParams();
  const [mockUser, setMockUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (uid) {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setMockUser({ uid, ...snap.data() });
        }
      }
    };
    fetchUser();
  }, [uid]);

  if (!mockUser) return null;

  // Inject mock user into Settings via props or context override if needed
  return <Settings impersonatedUser={mockUser} />;
}

export default ModelSettingsProxy;
