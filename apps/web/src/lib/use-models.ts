"use client";

import type { SelectOption } from "@raven/ui";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ModelIcon } from "@/components/model-icon";
import { api } from "./api";

export interface CatalogModel {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly provider: string;
  readonly capabilities: readonly string[];
  readonly category: string;
  readonly contextWindow: number;
  readonly maxOutput: number;
  readonly inputPrice: number;
  readonly outputPrice: number;
  readonly description: string;
}

/** All models from connected providers (org-scoped, for playground) */
export const catalogModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CatalogModel[]>("/v1/available-models"),
    queryKey: ["available-models"]
  });

/** All models in the platform (public catalog, for models page) */
export const allModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CatalogModel[]>("/v1/models"),
    queryKey: ["all-models"]
  });

export const useModelOptions = (): readonly SelectOption[] => {
  const { data: models = [] } = useQuery(catalogModelsQueryOptions());

  return useMemo(
    () =>
      models.map((m) => ({
        icon: ModelIcon({ model: m.slug, provider: m.provider, size: 16 }),
        label: `${m.name} (${m.provider})`,
        value: m.slug
      })),
    [models]
  );
};
