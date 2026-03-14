"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { useOrgStore } from "@/stores/org";

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
}

export const orgsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Org[]>("/v1/user/orgs"),
    queryKey: ["orgs"]
  });

export const useOrgs = () => {
  const { data: orgs = [], isPending, isError } = useQuery(orgsQueryOptions());
  const { activeOrg, setActiveOrg } = useOrgStore();

  // Restore saved org or fall back to first
  useEffect(() => {
    if (orgs.length > 0 && !activeOrg) {
      const org = orgs[0];
      if (org) {
        setActiveOrg(org);
      }
    }
  }, [orgs, activeOrg, setActiveOrg]);

  const switchOrg = useCallback(
    (org: Org) => {
      setActiveOrg(org);
      window.location.reload();
    },
    [setActiveOrg]
  );

  return { activeOrg, isError, isPending, orgs, switchOrg };
};

export type { Org };
