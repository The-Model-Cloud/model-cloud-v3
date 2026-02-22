"use client";

import { useState, useEffect } from "react";
import { getPricingTiers } from "@/lib/firebase/firestore";
import type { PricingTier } from "@/types/pricing";

export function usePricingTiers(publishedOnly = true) {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTiers() {
      try {
        setLoading(true);
        const data = await getPricingTiers(publishedOnly);
        setTiers(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch pricing tiers"));
      } finally {
        setLoading(false);
      }
    }

    fetchTiers();
  }, [publishedOnly]);

  return { tiers, loading, error };
}
