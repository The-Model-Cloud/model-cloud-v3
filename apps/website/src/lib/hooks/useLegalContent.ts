"use client";

import { useState, useEffect } from "react";
import { getSiteContent } from "@/lib/firebase/firestore";
import type { LegalPageContent, SiteContentId } from "@/types/siteContent";

export function useLegalContent(pageId: "legal-privacy" | "legal-terms" | "legal-cookies") {
  const [content, setContent] = useState<LegalPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const data = await getSiteContent<LegalPageContent>(pageId as SiteContentId);
        setContent(data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch legal content")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [pageId]);

  return { content, loading, error };
}
