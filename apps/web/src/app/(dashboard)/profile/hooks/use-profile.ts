"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { orgsQueryOptions } from "@/app/(dashboard)/hooks/use-orgs";
import { api } from "@/lib/api";

export { orgsQueryOptions };

export interface ProfileInvitation {
  id: string;
  orgName: string;
  role: string;
  expiresAt: string;
}

export const profileInvitationsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<ProfileInvitation[]>("/v1/user/invitations"),
    queryKey: ["user", "invitations"]
  });

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (data: { name: string }) => api.put("/v1/user/profile", data),
    onError: (err) => {
      toast.error(err.message);
    }
  });

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
