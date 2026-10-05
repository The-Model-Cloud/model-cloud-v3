import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, serverTimestamp, where } from "firebase/firestore";
import { auth, db } from "./config";
import type { User, UserRole } from "@/types/user";
import type { SubscriptionTier } from "@/types/subscription";

/**
 * Marketing consent recorded at sign-up. Must mirror the platform sign-up form and the
 * server-side model in functions/email/consent.js. The checkbox is unticked by default,
 * so "not_opted_in" is the norm and only an explicit tick produces "opted_in".
 */
function marketingConsentFields(marketingOptIn: boolean) {
  return {
    marketingConsent: {
      status: marketingOptIn ? "opted_in" : "not_opted_in",
      source: "signup",
      date: serverTimestamp(),
    },
    marketingPreferences: {
      newLaunches: marketingOptIn,
      productUpdates: marketingOptIn,
      newsletter: marketingOptIn,
    },
  };
}

/**
 * Public profile slug ("first.l", then "first.l1", "first.l2"...). Same format as the platform
 * sign-up (apps/platform sign-up/illustration), which links to /{publicSlug}.
 * Falls back to the uid so a slug lookup failure never blocks sign-up.
 */
async function generateUniqueSlug(firstName: string, lastName: string, uid: string) {
  const clean = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const first = clean(firstName);
  const lastInitial = clean(lastName).charAt(0);
  const baseSlug = [first, lastInitial].filter(Boolean).join(".");
  if (!baseSlug) return uid;

  try {
    let slug = baseSlug;
    for (let count = 1; ; count++) {
      const snapshot = await getDocs(query(collection(db, "users"), where("publicSlug", "==", slug)));
      if (snapshot.empty) return slug;
      slug = `${baseSlug}${count}`;
    }
  } catch (error) {
    console.error("Could not check publicSlug, using uid:", error);
    return uid;
  }
}

/** Display name and verification email. Neither may stop the account being created. */
async function finishAccountSetup(user: FirebaseUser, firstName: string, lastName: string) {
  try {
    await updateProfile(user, { displayName: `${firstName} ${lastName}`.trim() });
    await sendEmailVerification(user);
  } catch (error) {
    console.error("Could not send verification email:", error);
  }
}

export async function signIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  marketingOptIn = false
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await finishAccountSetup(user, firstName, lastName);
  const publicSlug = await generateUniqueSlug(firstName, lastName, user.uid);

  // Create user document in Firestore
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    firstName,
    lastName,
    role,
    publicSlug,
    verified: false,
    ...marketingConsentFields(marketingOptIn),
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
  selectedTier: SubscriptionTier,
  marketingOptIn = false
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await finishAccountSetup(user, firstName, lastName);
  const publicSlug = await generateUniqueSlug(firstName, lastName, user.uid);

  // Create user document in Firestore with client-specific fields
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    firstName,
    lastName,
    companyName,
    publicSlug,
    role: "client" as UserRole,
    verified: false,
    subscription: {
      tier: selectedTier === "free" ? "free" : "free",
      intendedTier: selectedTier,
      status: selectedTier === "free" ? "active" : "pending_payment",
    },
    ...marketingConsentFields(marketingOptIn),
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
