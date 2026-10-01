import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // After a verified email change (banner flow) the login email is new but the profile still holds
          // the old, bouncing one. Only reconcile in exactly that case, so an admin's manual edit to the
          // profile email is never overwritten.
          const bouncedEmail = data.emailBounced?.email?.toLowerCase();
          if (
            firebaseUser.emailVerified &&
            firebaseUser.email &&
            bouncedEmail &&
            data.email?.toLowerCase() === bouncedEmail &&
            firebaseUser.email.toLowerCase() !== bouncedEmail
          ) {
            try {
              await updateDoc(docRef, { email: firebaseUser.email });
              data.email = firebaseUser.email;
            } catch (err) {
              console.warn("Could not update profile email:", err);
            }
          }

          setUser({ uid: firebaseUser.uid, ...data }); // includes .role
        } else {
          setUser({ uid: firebaseUser.uid });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
