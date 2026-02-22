export type UserRole = "model" | "client" | "account manager" | "admin" | "super admin";

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  verified: boolean;
  firstName: string;
  lastName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
