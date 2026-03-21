"use client";

import type { ModelDefinition } from "@raven/types";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface UseInitialModelSelectionParams {
  readonly models: readonly ModelDefinition[];
  readonly selectedModel: {
    readonly model: string;
    readonly provider: string;
  } | null;
  readonly setSelectedModel: (value: {
    model: string;
    provider: string;
  }) => void;
  readonly setSystemPrompt: (value: string) => void;
  readonly systemPrompt: string;
}

/**
 * Reads URL search params on mount to auto-select model and system prompt.
 * Falls back to the first available model if no URL param matches.
 */
export function useInitialModelSelection({
  models,
  selectedModel,
  setSelectedModel,
  setSystemPrompt,
  systemPrompt
}: UseInitialModelSelectionParams): void {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!models.length || selectedModel) return;

    const urlSystem = searchParams.get("system");
    const urlModel = searchParams.get("model");

    if (urlSystem && !systemPrompt) {
      setSystemPrompt(urlSystem);
    }

    if (urlModel) {
      const match = models.find(
        (m) => m.slug === urlModel || m.name === urlModel
      );
      if (match) {
        setSelectedModel({ model: match.slug, provider: match.provider });
        return;
      }
    }

    const first = models[0];
    if (first) {
      setSelectedModel({ model: first.slug, provider: first.provider });
    }
  }, [
    searchParams,
    models,
    systemPrompt,
    selectedModel,
    setSystemPrompt,
    setSelectedModel
  ]);
}
