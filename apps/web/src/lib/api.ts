import ky from "ky";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  credentials: "include",
  hooks: {
    beforeError: [
      async (error) => {
        const body = await error.response
          .json()
          .catch(() => ({}) as Record<string, unknown>);
        const parsed = body as Record<string, unknown>;
        const detail =
          typeof parsed?.detail === "string" ? parsed.detail : undefined;
        const nested = parsed?.error as Record<string, unknown> | undefined;
        error.message =
          detail ??
          (typeof nested?.message === "string" ? nested.message : undefined) ??
          (typeof parsed?.message === "string" ? parsed.message : undefined) ??
          "Request failed";
        return error;
      }
    ],
    beforeRequest: []
  },
  prefixUrl: API_URL
});

const request = async <T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  body?: unknown
): Promise<T> => {
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path;
  const options = body ? { json: body } : {};
  const json = await client[method](trimmedPath, options).json();
  return unwrapEnvelope(json) as T;
};

export const api = {
  delete: <T>(path: string) => request<T>("delete", path),
  get: <T>(path: string) => request<T>("get", path),
  patch: <T>(path: string, body?: unknown) => request<T>("patch", path, body),
  post: <T>(path: string, body?: unknown) => request<T>("post", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("put", path, body)
};
