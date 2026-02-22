import { httpsCallable } from "firebase/functions";
import { functions } from "./config";
import type {
  SubscriptionTier,
  GetSubscriptionStatusResponse,
  ManagedUser,
} from "@/types/subscription";

// Response types
interface CheckoutSessionResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

interface PortalSessionResponse {
  success: boolean;
  url: string;
}

interface UpgradeResponse {
  success: boolean;
  message: string;
  newTier: SubscriptionTier;
}

interface PurchaseSeatsResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

interface SeatOperationResponse {
  success: boolean;
  message: string;
  remainingSeats?: number;
}

interface GetManagedUsersResponse {
  success: boolean;
  users: Array<{
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    profileAvatar: string;
    assignedAt: string;
  }>;
  seatInfo: {
    total: number;
    used: number;
    available: number;
  };
}

interface InitializeFreeTierResponse {
  success: boolean;
  message: string;
  tier: string;
}

// Helper to call functions with typed responses
async function callFunction<TData, TResponse>(
  name: string,
  data?: TData
): Promise<TResponse> {
  const fn = httpsCallable<TData, TResponse>(functions, name);
  const result = await fn(data as TData);
  return result.data;
}

// Initialize free tier for a new user
export async function initializeFreeTier(): Promise<InitializeFreeTierResponse> {
  return callFunction<undefined, InitializeFreeTierResponse>(
    "initializeFreeTier"
  );
}

// Get current user's subscription status
export async function getSubscriptionStatus(): Promise<GetSubscriptionStatusResponse> {
  return callFunction<undefined, GetSubscriptionStatusResponse>(
    "getSubscriptionStatus"
  );
}

// Create a Stripe checkout session for purchasing a subscription
export async function createSubscriptionCheckoutSession(
  tierId: SubscriptionTier,
  successUrl: string,
  cancelUrl: string
): Promise<CheckoutSessionResponse> {
  return callFunction<
    { tierId: string; successUrl: string; cancelUrl: string },
    CheckoutSessionResponse
  >("createSubscriptionCheckoutSession", {
    tierId,
    successUrl,
    cancelUrl,
  });
}

// Create a Stripe Customer Portal session
export async function createCustomerPortalSession(
  returnUrl: string
): Promise<PortalSessionResponse> {
  return callFunction<{ returnUrl: string }, PortalSessionResponse>(
    "createCustomerPortalSession",
    { returnUrl }
  );
}

// Upgrade an existing subscription to a higher tier
export async function upgradeSubscription(
  newTierId: SubscriptionTier
): Promise<UpgradeResponse> {
  return callFunction<{ newTierId: string }, UpgradeResponse>(
    "upgradeSubscription",
    { newTierId }
  );
}

// Purchase additional seats (Agency only)
export async function purchaseAdditionalSeats(
  quantity: number,
  successUrl: string,
  cancelUrl: string
): Promise<PurchaseSeatsResponse> {
  return callFunction<
    { quantity: number; successUrl: string; cancelUrl: string },
    PurchaseSeatsResponse
  >("purchaseAdditionalSeats", {
    quantity,
    successUrl,
    cancelUrl,
  });
}

// Assign a seat to a client (Agency only)
export async function assignSeatToClient(
  clientUserId: string
): Promise<SeatOperationResponse> {
  return callFunction<{ clientUserId: string }, SeatOperationResponse>(
    "assignSeatToClient",
    { clientUserId }
  );
}

// Remove a seat from a client (Agency only)
export async function removeSeatFromClient(
  clientUserId: string
): Promise<SeatOperationResponse> {
  return callFunction<{ clientUserId: string }, SeatOperationResponse>(
    "removeSeatFromClient",
    { clientUserId }
  );
}

// Get list of all clients managed by this agency (Agency only)
export async function getAgencyManagedUsers(): Promise<{
  users: ManagedUser[];
  seatInfo: { total: number; used: number; available: number };
}> {
  const response = await callFunction<undefined, GetManagedUsersResponse>(
    "getAgencyManagedUsers"
  );

  return {
    users: response.users.map((user) => ({
      ...user,
      assignedAt: new Date(user.assignedAt),
    })),
    seatInfo: response.seatInfo,
  };
}
