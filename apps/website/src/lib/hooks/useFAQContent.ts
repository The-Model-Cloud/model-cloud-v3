"use client";

import { useState, useEffect } from "react";
import { getSiteContent } from "@/lib/firebase/firestore";
import type { FAQPageContent } from "@/types/siteContent";

export function useFAQContent() {
  const [content, setContent] = useState<FAQPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const data = await getSiteContent<FAQPageContent>("faq-content");
        setContent(data);
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
