"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type {
  WhyUsHero,
  WhyUsBenefits,
  WhyUsComparisons,
  WhyUsTestimonials,
} from "@/types/siteContent";

export interface WhyUsContent {
  hero: WhyUsHero | null;
  benefits: WhyUsBenefits | null;
  comparisons: WhyUsComparisons | null;
  testimonials: WhyUsTestimonials | null;
}

export function useWhyUsContent() {
  const [content, setContent] = useState<WhyUsContent>({
    hero: null,
    benefits: null,
    comparisons: null,
    testimonials: null,
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
          "whyUs-testimonials",
        ]);

        setContent({
          hero: results.get("whyUs-hero") as WhyUsHero | null,
          benefits: results.get("whyUs-benefits") as WhyUsBenefits | null,
          comparisons: results.get(
            "whyUs-comparisons"
          ) as WhyUsComparisons | null,
          testimonials: results.get(
            "whyUs-testimonials"
          ) as WhyUsTestimonials | null,
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
