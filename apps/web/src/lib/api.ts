import { useOrgStore } from "@/stores/org";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const getOrgId = () => useOrgStore.getState().activeOrg?.id ?? null;

const headers = (extra?: Record<string, string>): Record<string, string> => {
  const orgId = getOrgId();
  return {
    ...(orgId ? { "X-Org-Id": orgId } : {}),
    ...extra
  };
};

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message ?? body?.message ?? "Request failed";
    throw new Error(message);
  }
  const body = await res.json();
  // Unwrap { data: T } envelope only when data is the sole key
  if (
    body?.data !== undefined &&
    Object.keys(body).length === 1
  ) {
    return body.data as T;
  }
  return body as T;
};

export const api = {
  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: headers(),
      method: "DELETE"
    });
    return handleResponse<T>(res);
  },

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: headers()
    });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: headers({ "Content-Type": "application/json" }),
      method: "POST"
    });
    return handleResponse<T>(res);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: headers({ "Content-Type": "application/json" }),
      method: "PUT"
    });
    return handleResponse<T>(res);
  }
};
