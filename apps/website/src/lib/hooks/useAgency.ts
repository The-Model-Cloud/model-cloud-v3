"use client";

import { useState, useCallback } from "react";
import { useSubscription } from "./useSubscription";
import {
  getAgencyManagedUsers,
  assignSeatToClient,
  removeSeatFromClient,
  purchaseAdditionalSeats,
} from "@/lib/firebase/functions";
import type { ManagedUser } from "@/types/subscription";

export function useAgency() {
  const { isAgency, agency, refresh } = useSubscription();
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchManagedUsers = useCallback(async () => {
    if (!isAgency) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getAgencyManagedUsers();
      setManagedUsers(response.users);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch managed users")
      );
    } finally {
      setLoading(false);
    }
  }, [isAgency]);

  const assignSeat = useCallback(
    async (clientUserId: string) => {
      setLoading(true);
      setError(null);

      try {
        await assignSeatToClient(clientUserId);
        await Promise.all([fetchManagedUsers(), refresh()]);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to assign seat")
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchManagedUsers, refresh]
  );

  const removeSeat = useCallback(
    async (clientUserId: string) => {
      setLoading(true);
      setError(null);

      try {
        await removeSeatFromClient(clientUserId);
        await Promise.all([fetchManagedUsers(), refresh()]);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to remove seat")
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchManagedUsers, refresh]
  );

  const purchaseSeats = useCallback(
    async (quantity: number) => {
      setLoading(true);
      setError(null);

      try {
        const baseUrl = window.location.origin;
        const response = await purchaseAdditionalSeats(
          quantity,
          `${baseUrl}/account?seats_purchased=true`,
          `${baseUrl}/account`
        );
        // Redirect to Stripe checkout for seat purchase
        window.location.href = response.url;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to purchase seats")
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    isAgency,
    agency,
    managedUsers,
    loading,
    error,
    fetchManagedUsers,
    assignSeat,
    removeSeat,
    purchaseSeats,
  };
}
