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

interface AdminSettings {
  readonly analytics_retention_days: string;
  readonly resend_api_key: string;
  readonly resend_from_email: string;
}

interface Invitation {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly invitedBy: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

interface CreateInvitationResponse {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly expiresAt: string;
  readonly inviteUrl: string;
}

// --- Query Options ---

export const adminUsersQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminUser[]>("/v1/admin/users"),
    queryKey: ["admin", "users"]
  });

export const adminSettingsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<AdminSettings>("/v1/admin/settings"),
    queryKey: ["admin", "settings"]
  });

export const adminInvitationsQueryOptions = () =>
  queryOptions({
    queryFn: () => api.get<Invitation[]>("/v1/admin/invitations"),
    queryKey: ["admin", "invitations"]
  });

// --- Query Hooks ---

export const useAdminUsers = () => useQuery(adminUsersQueryOptions());

export const useAdminSettings = () => useQuery(adminSettingsQueryOptions());

export const useAdminInvitations = () =>
  useQuery(adminInvitationsQueryOptions());

// --- Mutations ---

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, string>) => {
      const promise = api.put("/v1/admin/settings", input);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating settings...",
        success: "Settings updated"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    }
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => {
      const promise = api.patch<AdminUser>(`/v1/admin/users/${id}`, { role });
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating role...",
        success: "User role updated"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.delete(`/v1/admin/users/${id}`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Deleting user...",
        success: "User deleted"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });
};

export const useCreateInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; role: string }) => {
      const promise = api.post<CreateInvitationResponse>(
        "/v1/admin/invitations",
        input
      );
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Sending invitation...",
        success: "Invitation sent"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "invitations"] });
    }
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const promise = api.delete(`/v1/admin/invitations/${id}`);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Revoking invitation...",
        success: "Invitation revoked"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "invitations"] });
    }
  });
};

export type { AdminSettings, AdminUser, CreateInvitationResponse, Invitation };
