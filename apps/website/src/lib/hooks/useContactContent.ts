"use client";

import { useState, useEffect } from "react";
import { getSiteContent } from "@/lib/firebase/firestore";
import type { ContactInfo } from "@/types/siteContent";

export function useContactContent() {
  const [content, setContent] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const data = await getSiteContent<ContactInfo>("contact-info");
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
  }, []);

  return { content, loading, error };
}
