"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface CustomDomain {
  id: string;
  organizationId: string;
  domain: string;
  verificationToken: string;
  status: "pending_verification" | "verified" | "active" | "failed";
  cloudflareHostnameId: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

export const customDomainsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<CustomDomain[]>("/v1/domains"),
    queryKey: ["custom-domains"]
  });

export const useCustomDomains = () => {
  const queryClient = useQueryClient();

  const {
    data: domains = [],
    isPending: isLoading,
    error: queryError
  } = useQuery(customDomainsQueryOptions());

  const addMutation = useMutation({
    mutationFn: (domain: string) =>
      api.post<CustomDomain>("/v1/domains", { domain }),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add domain");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Domain added — follow the verification steps below");
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<CustomDomain>(`/v1/domains/${id}/verify`),
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "DNS verification failed"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Domain verified and activated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/domains/${id}`),
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove domain"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Domain removed");
    }
  });

  return {
    addDomain: addMutation.mutate,
    adding: addMutation.isPending,
    deleteDomain: deleteMutation.mutate,
    deleting: deleteMutation.isPending,
    domains,
    error: queryError?.message ?? null,
    isLoading,
    verifyDomain: verifyMutation.mutate,
    verifying: verifyMutation.isPending
  };
};
