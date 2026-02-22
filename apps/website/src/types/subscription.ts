export type SubscriptionTier = "free" | "starter" | "premium" | "agency";

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "past_due"
  | "expired"
  | "none";

export interface TierDetails {
  id: string;
  name: string;
  price: number;
  currency: string;
  includesSeats: number;
}

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  managedSeat: boolean;
}

export interface AgencyInfo {
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  managedUserIds: string[];
}

export interface ManagedByInfo {
  agencyUserId: string;
  agencyOrganisationId: string;
  assignedAt: Date;
}

export interface ManagedUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  profileAvatar: string;
  assignedAt: Date;
}

// Response from getSubscriptionStatus cloud function
export interface GetSubscriptionStatusResponse {
  success: boolean;
  isActive: boolean;
  tier: SubscriptionTier;
  tierDetails: TierDetails;
  subscription?: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    managedSeat: boolean;
  };
  agency?: {
    totalSeats: number;
    usedSeats: number;
    availableSeats: number;
    managedUserIds: string[];
  };
  managedBy?: {
    agencyUserId: string;
    agencyOrganisationId: string;
    assignedAt: string;
  } | null;
}

// Subscription state for context
export interface SubscriptionState {
  isActive: boolean;
  tier: SubscriptionTier;
  tierDetails: TierDetails | null;
  subscription: SubscriptionInfo | null;
  agency: AgencyInfo | null;
  managedBy: ManagedByInfo | null;
  loading: boolean;
  error: Error | null;
}

// Map CMS tier IDs to subscription tier IDs
export const cmsTierToSubscriptionTier: Record<string, SubscriptionTier> = {
  starter: "starter",
  professional: "premium",
  premium: "premium",
  enterprise: "agency",
  agency: "agency",
};
