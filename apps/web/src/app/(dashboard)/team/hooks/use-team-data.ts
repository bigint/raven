"use client";

import { useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
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

export interface Team {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export const membersQueryOptions = () =>
  queryOptions({
    queryKey: ["teams", "members"],
    queryFn: () => api.get<Member[]>("/v1/teams/members"),
  });

export const invitationsQueryOptions = () =>
  queryOptions({
    queryKey: ["teams", "invitations"],
    queryFn: () => api.get<Invitation[]>("/v1/teams/invitations"),
  });

export const teamsQueryOptions = () =>
  queryOptions({
    queryKey: ["teams", "teams"],
    queryFn: () => api.get<Team[]>("/v1/teams/teams"),
  });

export const useInviteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post("/v1/teams/invitations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "invitations"] });
    },
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post("/v1/teams/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "teams"] });
    },
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/teams/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "members"] });
    },
  });
};

export const useDeleteInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/teams/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "invitations"] });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/teams/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "teams"] });
    },
  });
};
