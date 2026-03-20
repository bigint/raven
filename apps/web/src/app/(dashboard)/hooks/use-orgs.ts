"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { type Org, useOrgStore } from "@/stores/org";

export const orgsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Org[]>("/v1/user/orgs"),
    queryKey: ["orgs"]
  });

export const useOrgs = () => {
  const { data: orgs = [], isPending, isError } = useQuery(orgsQueryOptions());
  const { activeOrg, setActiveOrg } = useOrgStore();
  const queryClient = useQueryClient();
  const router = useRouter();

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
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key !== "session" && key !== "auth";
        }
      });
      router.push("/overview");
    },
    [setActiveOrg, queryClient, router]
  );

  return { activeOrg, isError, isPending, orgs, switchOrg };
};
