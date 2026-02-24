"use client";

import { useState, useEffect } from "react";
import { getSiteContentBatch } from "@/lib/firebase/firestore";
import type { ContactInfo, ContactFAQTeaser } from "@/types/siteContent";

export interface ContactContent {
  info: ContactInfo | null;
  faqTeaser: ContactFAQTeaser | null;
}

export function useContactContent() {
  const [content, setContent] = useState<ContactContent>({
    info: null,
    faqTeaser: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const results = await getSiteContentBatch([
          "contact-info",
          "contact-faqTeaser",
        ]);

        setContent({
          info: results.get("contact-info") as ContactInfo | null,
          faqTeaser: results.get("contact-faqTeaser") as ContactFAQTeaser | null,
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
