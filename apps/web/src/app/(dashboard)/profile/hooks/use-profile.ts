"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Org } from "../components/org-list";

export const orgsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Org[]>("/v1/user/orgs"),
    queryKey: ["orgs"]
  });

export interface ProfileInvitation {
  readonly id: string;
  readonly orgName: string;
  readonly role: string;
  readonly expiresAt: string;
}

export const profileInvitationsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ProfileInvitation[]>("/v1/user/invitations"),
    queryKey: ["user", "invitations"]
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.put("/v1/user/profile", data),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post(`/v1/user/invitations/${invitationId}/accept`),
    onError: (err) => {
      toast.error(err.message);
    },
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
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "invitations"] });
    }
  });
};
