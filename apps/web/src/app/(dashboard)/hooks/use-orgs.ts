"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api, getOrgId, setOrgId } from "@/lib/api";

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

  // Restore saved org or fall back to first
  if (orgs.length > 0 && !activeOrg) {
    const savedId = getOrgId();
    const saved = savedId ? orgs.find((o) => o.id === savedId) : null;
    const org = saved ?? orgs[0];
    if (org) {
      setOrgId(org.id);
      setActiveOrg(org);
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
