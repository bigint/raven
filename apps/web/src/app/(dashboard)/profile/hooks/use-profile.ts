"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOrgStore } from "@/stores/org";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface ProfileInvitation {
  id: string;
  orgName: string;
  role: string;
  expiresAt: string;
}

export const orgsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Organization[]>("/v1/user/orgs"),
    queryKey: ["user", "orgs"]
  });

export const profileInvitationsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ProfileInvitation[]>("/v1/user/invitations"),
    queryKey: ["user", "invitations"]
  });

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (data: { name: string }) => api.put("/v1/user/profile", data)
  });

export const useCreateOrg = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post<Organization>("/v1/user/orgs", data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["user", "orgs"] });
      useOrgStore.getState().setActiveOrg({
        id: created.id,
        name: created.name,
        role: "owner",
        slug: created.slug
      });
      window.location.reload();
    }
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post(`/v1/user/invitations/${invitationId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    }
  });
};

export const useDeclineInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post(`/v1/user/invitations/${invitationId}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "invitations"] });
    }
  });
};
