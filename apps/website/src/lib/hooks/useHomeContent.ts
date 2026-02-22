"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type {
  HomeHero,
  HomeFeatures,
  HomeHowItWorks,
  HomeTestimonials,
  HomeCTA,
} from "@/types/siteContent";

export interface HomeContent {
  hero: HomeHero | null;
  features: HomeFeatures | null;
  howItWorks: HomeHowItWorks | null;
  testimonials: HomeTestimonials | null;
  cta: HomeCTA | null;
}

export function useHomeContent() {
  const [content, setContent] = useState<HomeContent>({
    hero: null,
    features: null,
    howItWorks: null,
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
          "home-hero",
          "home-features",
          "home-howItWorks",
          "home-testimonials",
          "home-cta",
        ]);

        setContent({
          hero: results.get("home-hero") as HomeHero | null,
          features: results.get("home-features") as HomeFeatures | null,
          howItWorks: results.get("home-howItWorks") as HomeHowItWorks | null,
          testimonials: results.get(
            "home-testimonials"
          ) as HomeTestimonials | null,
          cta: results.get("home-cta") as HomeCTA | null,
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
