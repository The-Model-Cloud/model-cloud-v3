"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type {
  PricingHero,
  PricingModelFeatures,
  PricingFAQs,
} from "@/types/siteContent";

export interface PricingContent {
  hero: PricingHero | null;
  modelFeatures: PricingModelFeatures | null;
  faqs: PricingFAQs | null;
}

export function usePricingContent() {
  const [content, setContent] = useState<PricingContent>({
    hero: null,
    modelFeatures: null,
    faqs: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const results = await getSiteContentBatch([
          "pricing-hero",
          "pricing-modelFeatures",
          "pricing-faqs",
        ]);

        setContent({
          hero: results.get("pricing-hero") as PricingHero | null,
          modelFeatures: results.get(
            "pricing-modelFeatures"
          ) as PricingModelFeatures | null,
          faqs: results.get("pricing-faqs") as PricingFAQs | null,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch content")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  return { content, loading, error };
}
