"use client";

import { useState, useEffect } from "react";

const HERO_MODELS_URL =
  "https://europe-west2-model-cloud.cloudfunctions.net/getHeroModels";

interface HeroModelImage {
  url: string;
  id: string;
}

export function useHeroModels(count: number = 6) {
  const [models, setModels] = useState<HeroModelImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        const response = await fetch(`${HERO_MODELS_URL}?count=${count}`);

        if (!response.ok) {
          throw new Error("Failed to fetch hero models");
        }

        const data = await response.json();

        if (data.success && data.images) {
          setModels(data.images);
        }
      } catch (err) {
        console.error("Failed to fetch hero models:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch models"));
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [count]);

  return { models, loading, error };
}
