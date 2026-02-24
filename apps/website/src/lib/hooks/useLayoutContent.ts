"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type { HeaderContent, FooterContent } from "@/types/siteContent";

export interface LayoutContent {
  header: HeaderContent | null;
  footer: FooterContent | null;
}

export function useLayoutContent() {
  const [content, setContent] = useState<LayoutContent>({
    header: null,
    footer: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const results = await getSiteContentBatch([
          "layout-header",
          "layout-footer",
        ]);

        setContent({
          header: results.get("layout-header") as HeaderContent | null,
          footer: results.get("layout-footer") as FooterContent | null,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch layout content")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  return { content, loading, error };
}
