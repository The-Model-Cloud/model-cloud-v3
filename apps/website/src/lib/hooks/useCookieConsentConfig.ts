"use client";

import { useState, useEffect } from "react";
import { getSiteContent } from "@/lib/firebase/firestore";
import type { CookieConsentConfig, SiteContentId } from "@/types/siteContent";

export function useCookieConsentConfig() {
  const [config, setConfig] = useState<CookieConsentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const data = await getSiteContent<CookieConsentConfig>("cookie-consent" as SiteContentId);
        setConfig(data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch cookie consent config")
        );
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  return { config, loading, error };
}
