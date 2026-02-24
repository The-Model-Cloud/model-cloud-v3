"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type {
  PricingHero,
  PricingModelsSection,
  PricingModelCard,
  PricingClientsSection,
  PricingComparison,
  PricingCTA,
  PricingModelFeatures,
  PricingFAQs,
} from "@/types/siteContent";

export interface PricingContent {
  hero: PricingHero | null;
  modelsSection: PricingModelsSection | null;
  modelCard: PricingModelCard | null;
  clientsSection: PricingClientsSection | null;
  comparison: PricingComparison | null;
  cta: PricingCTA | null;
  modelFeatures: PricingModelFeatures | null;
  faqs: PricingFAQs | null;
}

export function usePricingContent() {
  const [content, setContent] = useState<PricingContent>({
    hero: null,
    modelsSection: null,
    modelCard: null,
    clientsSection: null,
    comparison: null,
    cta: null,
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
          "pricing-modelsSection",
          "pricing-modelCard",
          "pricing-clientsSection",
          "pricing-comparison",
          "pricing-cta",
          "pricing-modelFeatures",
          "pricing-faqs",
        ]);

        setContent({
          hero: results.get("pricing-hero") as PricingHero | null,
          modelsSection: results.get("pricing-modelsSection") as PricingModelsSection | null,
          modelCard: results.get("pricing-modelCard") as PricingModelCard | null,
          clientsSection: results.get("pricing-clientsSection") as PricingClientsSection | null,
          comparison: results.get("pricing-comparison") as PricingComparison | null,
          cta: results.get("pricing-cta") as PricingCTA | null,
          modelFeatures: results.get("pricing-modelFeatures") as PricingModelFeatures | null,
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
