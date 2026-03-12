export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let currentOrgId: string | null =
  typeof window !== "undefined" ? localStorage.getItem("orgId") : null;

export const setOrgId = (orgId: string | null) => {
  currentOrgId = orgId;
  if (typeof window !== "undefined") {
    if (orgId) {
      localStorage.setItem("orgId", orgId);
    } else {
      localStorage.removeItem("orgId");
    }
  }
};

export const getOrgId = () => currentOrgId;

const headers = (extra?: Record<string, string>): Record<string, string> => ({
  ...(currentOrgId ? { "X-Org-Id": currentOrgId } : {}),
  ...extra
});

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message ?? body?.message ?? "Request failed";
    throw new Error(message);
  }
  const body = await res.json();
  return (body?.data !== undefined ? body.data : body) as T;
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
