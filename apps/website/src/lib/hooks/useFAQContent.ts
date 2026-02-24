"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type { FAQPageContent, FAQContactCTA } from "@/types/siteContent";

export interface FAQContent {
  page: FAQPageContent | null;
  cta: FAQContactCTA | null;
}

export function useFAQContent() {
  const [content, setContent] = useState<FAQContent>({
    page: null,
    cta: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const results = await getSiteContentBatch([
          "faq-content",
          "faq-cta",
        ]);

        setContent({
          page: results.get("faq-content") as FAQPageContent | null,
          cta: results.get("faq-cta") as FAQContactCTA | null,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch FAQ content")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  return { content, loading, error };
}
