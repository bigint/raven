"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface Member {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly joinedAt: string;
}

export interface Invitation {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly status: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export const membersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Member[]>("/v1/teams/members"),
    queryKey: ["teams", "members"]
  });

export const invitationsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Invitation[]>("/v1/teams/invitations"),
    queryKey: ["teams", "invitations"]
  });

export const useInviteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post("/v1/teams/invitations", data),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "invitations"] });
    }
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/teams/members/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "members"] });
    }
  });
};

export const useDeleteInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/teams/invitations/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "invitations"] });
    }
  });
};
