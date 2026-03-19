"use client";

import { useQuery } from "@tanstack/react-query";
import { providersQueryOptions } from "@/app/(dashboard)/providers/hooks/use-providers";

interface SetupStatus {
  readonly hasProviders: boolean;
  readonly isLoading: boolean;
}

export const useSetupStatus = (): SetupStatus => {
  const { data: providers, isLoading } = useQuery(providersQueryOptions());

  return {
    hasProviders: (providers?.length ?? 0) > 0,
    isLoading
  };
};
