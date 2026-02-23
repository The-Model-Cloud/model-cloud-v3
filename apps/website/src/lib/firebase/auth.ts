import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import type { User, UserRole } from "@/types/user";
import type { SubscriptionTier } from "@/types/subscription";

export async function signIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Create user document in Firestore
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    firstName,
    lastName,
    role,
    verified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function signUpClient(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  companyName: string,
  selectedTier: SubscriptionTier
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Create user document in Firestore with client-specific fields
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    firstName,
    lastName,
    companyName,
    role: "client" as UserRole,
    verified: false,
    subscription: {
      tier: selectedTier === "free" ? "free" : "free",
      intendedTier: selectedTier,
      status: selectedTier === "free" ? "active" : "pending_payment",
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserData(uid: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as User;
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function isSuperAdmin(role?: UserRole): boolean {
  return role === "super admin";
}

export function isAdmin(role?: UserRole): boolean {
  return role === "admin" || role === "super admin";
}
