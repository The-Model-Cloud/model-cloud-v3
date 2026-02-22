"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User as FirebaseUser } from "firebase/auth";
import { onAuthChange, getUserData, isSuperAdmin, isAdmin } from "@/lib/firebase/auth";
import type { User } from "@/types/user";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userData: null,
  loading: true,
  isSuperAdmin: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setFirebaseUser(user);

      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    firebaseUser,
    userData,
    loading,
    isSuperAdmin: isSuperAdmin(userData?.role),
    isAdmin: isAdmin(userData?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
