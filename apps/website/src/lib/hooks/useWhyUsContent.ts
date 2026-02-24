"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type {
  WhyUsHero,
  WhyUsBenefits,
  WhyUsComparisons,
  WhyUsForModels,
  WhyUsForClients,
  WhyUsTestimonials,
  WhyUsCTA,
} from "@/types/siteContent";

export interface WhyUsContent {
  hero: WhyUsHero | null;
  benefits: WhyUsBenefits | null;
  comparisons: WhyUsComparisons | null;
  forModels: WhyUsForModels | null;
  forClients: WhyUsForClients | null;
  testimonials: WhyUsTestimonials | null;
  cta: WhyUsCTA | null;
}

export function useWhyUsContent() {
  const [content, setContent] = useState<WhyUsContent>({
    hero: null,
    benefits: null,
    comparisons: null,
    forModels: null,
    forClients: null,
    testimonials: null,
    cta: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const results = await getSiteContentBatch([
          "whyUs-hero",
          "whyUs-benefits",
          "whyUs-comparisons",
          "whyUs-forModels",
          "whyUs-forClients",
          "whyUs-testimonials",
          "whyUs-cta",
        ]);

        setContent({
          hero: results.get("whyUs-hero") as WhyUsHero | null,
          benefits: results.get("whyUs-benefits") as WhyUsBenefits | null,
          comparisons: results.get("whyUs-comparisons") as WhyUsComparisons | null,
          forModels: results.get("whyUs-forModels") as WhyUsForModels | null,
          forClients: results.get("whyUs-forClients") as WhyUsForClients | null,
          testimonials: results.get("whyUs-testimonials") as WhyUsTestimonials | null,
          cta: results.get("whyUs-cta") as WhyUsCTA | null,
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
