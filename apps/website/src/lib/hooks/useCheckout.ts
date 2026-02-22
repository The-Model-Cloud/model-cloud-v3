"use client";

import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  createSubscriptionCheckoutSession,
  createCustomerPortalSession,
  upgradeSubscription,
} from "@/lib/firebase/functions";
import type { SubscriptionTier } from "@/types/subscription";

export function useCheckout() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startCheckout = useCallback(
    async (tierId: SubscriptionTier) => {
      if (!firebaseUser) {
        throw new Error("Must be authenticated to start checkout");
      }

      setLoading(true);
      setError(null);

      try {
        const baseUrl = window.location.origin;
        const response = await createSubscriptionCheckoutSession(
          tierId,
          `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          `${baseUrl}/subscription/cancel`
        );

        // Redirect to Stripe Checkout
        window.location.href = response.url;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to create checkout session");
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [firebaseUser]
  );

  const openPortal = useCallback(async () => {
    if (!firebaseUser) {
      throw new Error("Must be authenticated to open portal");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createCustomerPortalSession(window.location.href);
      window.location.href = response.url;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to open customer portal");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  const upgrade = useCallback(
    async (newTierId: SubscriptionTier) => {
      if (!firebaseUser) {
        throw new Error("Must be authenticated to upgrade");
      }

      setLoading(true);
      setError(null);

      try {
        const response = await upgradeSubscription(newTierId);
        return response;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to upgrade subscription");
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [firebaseUser]
  );

  return {
    startCheckout,
    openPortal,
    upgrade,
    loading,
    error,
  };
}
