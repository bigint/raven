"use client";

import type { ModelDefinition } from "@raven/types";
import type { SelectOption } from "@raven/ui";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ModelIcon } from "@/components/model-icon";
import { api } from "./api";

/** All models from connected providers (org-scoped, for playground) */
export const catalogModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ModelDefinition[]>("/v1/available-models"),
    queryKey: ["available-models"]
  });

/** All models in the platform (public catalog, for models page) */
export const allModelsQueryOptions = () =>
  queryOptions({
    queryFn: async () => {
      const res = await api.get<{
        data: ModelDefinition[];
        object: string;
      }>("/v1/models");
      return res.data;
    },
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
