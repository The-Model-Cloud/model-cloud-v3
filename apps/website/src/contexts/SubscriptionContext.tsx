"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSubscriptionStatus } from "@/lib/firebase/functions";
import type {
  SubscriptionTier,
  SubscriptionState,
  TierDetails,
  SubscriptionInfo,
  AgencyInfo,
  ManagedByInfo,
} from "@/types/subscription";

interface SubscriptionContextType extends SubscriptionState {
  refresh: () => Promise<void>;
  isFreeTier: boolean;
  isAgency: boolean;
  isManagedClient: boolean;
}

const defaultTierDetails: TierDetails = {
  id: "free",
  name: "Free",
  price: 0,
  currency: "gbp",
  includesSeats: 0,
};

const defaultState: SubscriptionState = {
  isActive: false,
  tier: "free",
  tierDetails: defaultTierDetails,
  subscription: null,
  agency: null,
  managedBy: null,
  loading: true,
  error: null,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  ...defaultState,
  refresh: async () => {},
  isFreeTier: true,
  isAgency: false,
  isManagedClient: false,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>(defaultState);

  const fetchSubscription = useCallback(async () => {
    if (!firebaseUser) {
      setState({
        ...defaultState,
        loading: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await getSubscriptionStatus();

      const subscription: SubscriptionInfo | null = data.subscription
        ? {
            status: data.subscription.status as SubscriptionInfo["status"],
            currentPeriodEnd: data.subscription.currentPeriodEnd
              ? new Date(data.subscription.currentPeriodEnd)
              : null,
            cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd,
            managedSeat: data.subscription.managedSeat,
          }
        : null;

      const agency: AgencyInfo | null = data.agency
        ? {
            totalSeats: data.agency.totalSeats,
            usedSeats: data.agency.usedSeats,
            availableSeats: data.agency.availableSeats,
            managedUserIds: data.agency.managedUserIds,
          }
        : null;

      const managedBy: ManagedByInfo | null = data.managedBy
        ? {
            agencyUserId: data.managedBy.agencyUserId,
            agencyOrganisationId: data.managedBy.agencyOrganisationId,
            assignedAt: new Date(data.managedBy.assignedAt),
          }
        : null;

      setState({
        isActive: data.isActive,
        tier: data.tier,
        tierDetails: data.tierDetails,
        subscription,
        agency,
        managedBy,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error
            ? err
            : new Error("Failed to fetch subscription"),
      }));
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, firebaseUser, fetchSubscription]);

  const value: SubscriptionContextType = {
    ...state,
    refresh: fetchSubscription,
    isFreeTier: state.tier === "free",
    isAgency: state.tier === "agency",
    isManagedClient: state.managedBy !== null,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscriptionContext must be used within a SubscriptionProvider"
    );
  }
  return context;
}
