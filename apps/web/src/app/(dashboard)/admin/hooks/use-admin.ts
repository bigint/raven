import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

// --- Types ---

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

interface AdminSettings {
  readonly instance_name: string;
  readonly analytics_retention_days: string;
}

// --- Query Options ---

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

export const adminSettingsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminSettings>("/v1/admin/settings"),
    queryKey: ["admin", "settings"]
  });

// --- Query Hooks ---

export const useAdminUsers = () => useQuery(adminUsersQueryOptions());

export const useAdminAuditLogs = () => useQuery(adminAuditLogsQueryOptions());

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

export type {
  AdminSettings,
  AdminUser,
  AuditLog
};
