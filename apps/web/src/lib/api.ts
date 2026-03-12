export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let currentOrgId: string | null = null;

export const setOrgId = (orgId: string | null) => {
  currentOrgId = orgId;
};

export const getOrgId = () => currentOrgId;

export const api = {
  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: {
        ...(currentOrgId ? { "X-Org-Id": currentOrgId } : {})
      },
      method: "DELETE"
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message);
    }
    return res.json();
  },
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: {
        ...(currentOrgId ? { "X-Org-Id": currentOrgId } : {})
      }
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message);
    }
    return res.json();
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(currentOrgId ? { "X-Org-Id": currentOrgId } : {})
      },
      method: "POST"
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message);
    }
    return res.json();
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(currentOrgId ? { "X-Org-Id": currentOrgId } : {})
      },
      method: "PUT"
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message);
    }
    return res.json();
  }
};
