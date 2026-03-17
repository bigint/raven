"use client";

import {
  queryOptions,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "invitations"] });
    }
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/teams/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "members"] });
    }
  });
};

export const useDeleteInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/teams/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "invitations"] });
    }
  });
};
