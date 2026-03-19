"use client";

import type { SelectOption } from "@raven/ui";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "./api";

export interface CatalogModel {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly provider: string;
}

export const catalogModelsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CatalogModel[]>("/v1/available-models"),
    queryKey: ["available-models"]
  });

export const useModelOptions = (): readonly SelectOption[] => {
  const { data: models = [] } = useQuery(catalogModelsQueryOptions());

  return useMemo(
    () =>
      models.map((m) => ({
        label: `${m.name} (${m.provider})`,
        value: m.slug
      })),
    [models]
  );
};
