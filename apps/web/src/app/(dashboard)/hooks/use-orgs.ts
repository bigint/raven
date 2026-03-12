"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api, setOrgId } from "@/lib/api";

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export const orgsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Org[]>("/v1/user/orgs"),
    queryKey: ["orgs"]
  });

export const useOrgs = () => {
  const { data: orgs = [], isPending, isError } = useQuery(orgsQueryOptions());
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);

  // Set initial org when data loads
  if (orgs.length > 0 && !activeOrg) {
    const firstOrg = orgs[0];
    if (firstOrg) {
      setOrgId(firstOrg.id);
      setActiveOrg(firstOrg);
    }
  }

  const switchOrg = useCallback((org: Org) => {
    setOrgId(org.id);
    setActiveOrg(org);
    window.location.reload();
  }, []);

  return { activeOrg, isError, isPending, orgs, switchOrg };
};

export type { Org };
