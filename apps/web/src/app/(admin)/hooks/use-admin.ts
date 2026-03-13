"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AdminStats {
  totalUsers: number;
  totalOrgs: number;
  planDistribution: Record<string, number>;
  totalRequests: number;
  totalCost: string;
  totalDomains: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalReasoningTokens: number;
  totalCachedTokens: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  orgCount: number;
}

export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  plan: string | null;
  memberCount: number;
}

export interface AdminDomain {
  id: string;
  domain: string;
  status: string;
  createdAt: string;
  verifiedAt: string | null;
  orgName: string;
  orgSlug: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string;
  actorEmail: string;
  orgName: string;
}

export const adminStatsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminStats>("/v1/admin/stats"),
    queryKey: ["admin", "stats"]
  });

export const adminUsersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminUser[]>("/v1/admin/users"),
    queryKey: ["admin", "users"]
  });

export const adminOrgsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminOrg[]>("/v1/admin/organizations"),
    queryKey: ["admin", "organizations"]
  });

export const adminDomainsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminDomain[]>("/v1/admin/domains"),
    queryKey: ["admin", "domains"]
  });

export const adminAuditLogsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminAuditLog[]>("/v1/admin/audit-logs"),
    queryKey: ["admin", "audit-logs"]
  });

export const useAdminStats = () => useQuery(adminStatsQueryOptions());
export const useAdminUsers = () => useQuery(adminUsersQueryOptions());
export const useAdminOrgs = () => useQuery(adminOrgsQueryOptions());
export const useAdminDomains = () => useQuery(adminDomainsQueryOptions());
export const useAdminAuditLogs = () => useQuery(adminAuditLogsQueryOptions());
