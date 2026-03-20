import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

// --- Types ---

interface AdminStats {
  readonly totalUsers: number;
  readonly totalRequests: number;
  readonly totalCost: string;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalReasoningTokens: number;
  readonly totalCachedTokens: number;
}

interface AdminUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly createdAt: string;
}

interface AuditLog {
  readonly id: string;
  readonly action: string;
  readonly resourceType: string;
  readonly actorName: string | null;
  readonly actorEmail: string | null;
  readonly createdAt: string;
}

interface AdminProvider {
  readonly slug: string;
  readonly name: string;
  readonly modelCount: number;
}

interface AdminSettings {
  readonly instance_name: string;
  readonly analytics_retention_days: string;
}

// --- Query Options ---

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

export const adminAuditLogsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AuditLog[]>("/v1/admin/audit-logs"),
    queryKey: ["admin", "audit-logs"]
  });

export const adminProvidersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminProvider[]>("/v1/admin/providers"),
    queryKey: ["admin", "providers"]
  });

export const adminSettingsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminSettings>("/v1/admin/settings"),
    queryKey: ["admin", "settings"]
  });

// --- Query Hooks ---

export const useAdminStats = () => useQuery(adminStatsQueryOptions());

export const useAdminUsers = () => useQuery(adminUsersQueryOptions());

export const useAdminAuditLogs = () => useQuery(adminAuditLogsQueryOptions());

export const useAdminProviders = () => useQuery(adminProvidersQueryOptions());

export const useAdminSettings = () => useQuery(adminSettingsQueryOptions());

// --- Mutations ---

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, string>) =>
      api.put("/v1/admin/settings", input),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    }
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch<AdminUser>(`/v1/admin/users/${id}`, { role }),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success("User role updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/v1/admin/users/${id}`),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });
};

export const useSyncModels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post("/v1/admin/models/sync"),
    onError: (err) => {
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success("Models synced successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });
};

export type {
  AdminProvider,
  AdminSettings,
  AdminStats,
  AdminUser,
  AuditLog
};
