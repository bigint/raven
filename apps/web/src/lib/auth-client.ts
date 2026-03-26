import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const authFetch = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.error ?? body?.message ?? body?.code ?? "Request failed"
    );
  }

  return res.json();
};

export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    return authFetch<{ user: SessionUser }>("/api/auth/sign-in/email", {
      body: JSON.stringify({ email, password }),
      method: "POST"
    });
  }
};

export const signUp = {
  email: async ({
    email,
    name,
    password
  }: {
    email: string;
    name: string;
    password: string;
  }) => {
    return authFetch<{ user: SessionUser }>("/api/auth/sign-up/email", {
      body: JSON.stringify({ email, name, password }),
      method: "POST"
    });
  }
};

export const signOut = async () => {
  await authFetch("/api/auth/sign-out", { method: "POST" });
};

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string | null;
}

interface SessionData {
  user: SessionUser;
}

export const getSession = async (): Promise<SessionData | null> => {
  try {
    return await authFetch<SessionData>("/api/auth/session");
  } catch {
    return null;
  }
};

export const useSession = () => {
  const query = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    retry: false,
    staleTime: 60_000
  });

  return {
    data: query.data ?? null,
    error: query.error ?? null,
    isPending: query.isLoading
  };
};

export const forgetPassword = async ({
  email,
  redirectTo
}: {
  email: string;
  redirectTo: string;
}) => {
  return authFetch("/api/auth/forget-password", {
    body: JSON.stringify({ email, redirectTo }),
    method: "POST"
  });
};

export const resetPassword = async ({
  newPassword,
  token
}: {
  newPassword: string;
  token: string;
}) => {
  return authFetch("/api/auth/reset-password", {
    body: JSON.stringify({ password: newPassword, token }),
    method: "POST"
  });
};
