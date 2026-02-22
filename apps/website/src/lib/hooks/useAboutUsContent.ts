"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type {
  AboutUsHero,
  AboutUsStory,
  AboutUsValues,
  AboutUsStats,
  AboutUsTeam,
} from "@/types/siteContent";

export interface AboutUsContent {
  hero: AboutUsHero | null;
  story: AboutUsStory | null;
  values: AboutUsValues | null;
  stats: AboutUsStats | null;
  team: AboutUsTeam | null;
}

export function useAboutUsContent() {
  const [content, setContent] = useState<AboutUsContent>({
    hero: null,
    story: null,
    values: null,
    stats: null,
    team: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const results = await getSiteContentBatch([
          "aboutUs-hero",
          "aboutUs-story",
          "aboutUs-values",
          "aboutUs-stats",
          "aboutUs-team",
        ]);

        setContent({
          hero: results.get("aboutUs-hero") as AboutUsHero | null,
          story: results.get("aboutUs-story") as AboutUsStory | null,
          values: results.get("aboutUs-values") as AboutUsValues | null,
          stats: results.get("aboutUs-stats") as AboutUsStats | null,
          team: results.get("aboutUs-team") as AboutUsTeam | null,
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
