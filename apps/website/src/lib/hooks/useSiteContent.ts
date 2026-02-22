"use client";

import { useState, useEffect } from "react";
import { getSiteContent } from "@/lib/firebase/firestore";
import type { SiteContent, SiteContentId } from "@/types/siteContent";

export function useSiteContent<T extends SiteContent>(contentId: SiteContentId) {
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const data = await getSiteContent<T>(contentId);
        setContent(data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch content")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [contentId]);

  return { content, loading, error };
}
