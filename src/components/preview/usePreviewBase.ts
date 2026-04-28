"use client";

import { useState, useEffect } from "react";
import type { z } from "zod";
import { type Schema_File } from "~/types/schema";

type UsePreviewBaseProps = {
  file: z.infer<typeof Schema_File>;
  fetchPreview?: () => Promise<void>;
  maxSize?: number;
};

export function usePreviewBase({ file, fetchPreview, maxSize }: UsePreviewBaseProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");

    const loadPreview = async () => {
      try {
        if (fetchPreview) {
          await fetchPreview();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [file.encryptedId]);

  return {
    loading,
    error,
    loaded,
    setLoaded,
  };
}
