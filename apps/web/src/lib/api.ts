import ky from "ky";
import { useOrgStore } from "@/stores/org";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const unwrapEnvelope = (body: unknown): unknown => {
  if (
    body !== null &&
    typeof body === "object" &&
    "data" in body &&
    Object.keys(body).length === 1
  ) {
    return (body as Record<string, unknown>).data;
  }
  return body;
};

const client = ky.create({
  prefixUrl: API_URL,
  credentials: "include",
  hooks: {
    beforeRequest: [
      (request) => {
        const orgId = useOrgStore.getState().activeOrg?.id;
        if (orgId) {
          request.headers.set("X-Org-Id", orgId);
        }
      }
    ],
    beforeError: [
      async (error) => {
        const body = await error.response
          .json()
          .catch(() => ({}) as Record<string, unknown>);
        const parsed = body as Record<string, unknown>;
        const nested = parsed?.error as Record<string, unknown> | undefined;
        error.message =
          (nested?.message as string) ??
          (parsed?.message as string) ??
          "Request failed";
        return error;
      }
    ]
  }
});

const request = async <T>(
  method: "get" | "post" | "put" | "delete",
  path: string,
  body?: unknown
): Promise<T> => {
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path;
  const options = body ? { json: body } : {};
  const json = await client[method](trimmedPath, options).json();
  return unwrapEnvelope(json) as T;
};

export const api = {
  get: <T>(path: string) => request<T>("get", path),
  post: <T>(path: string, body?: unknown) => request<T>("post", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("put", path, body),
  delete: <T>(path: string) => request<T>("delete", path)
};
