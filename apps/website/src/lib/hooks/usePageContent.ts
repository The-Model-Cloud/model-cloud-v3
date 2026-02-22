"use client";

import { useState, useEffect } from "react";
import { getCMSPage } from "@/lib/firebase/firestore";
import type { CMSPage } from "@/types/cms";

export function usePageContent(slug: string) {
  const [page, setPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPage() {
      try {
        setLoading(true);
        const data = await getCMSPage(slug);
        setPage(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch page"));
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug]);

  return { page, loading, error };
}
