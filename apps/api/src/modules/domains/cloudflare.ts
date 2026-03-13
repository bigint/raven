import type { Env } from "@raven/config";

interface CloudflareHostnameResponse {
  result: {
    id: string;
    hostname: string;
    status: string;
  };
  success: boolean;
}

const cfFetch = async (
  env: Env,
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = env.CLOUDFLARE_API_TOKEN;
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
    throw new Error("Cloudflare API token or zone ID not configured");
  }
  return fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
};

export const createCustomHostname = async (
  env: Env,
  hostname: string
): Promise<string> => {
  const res = await cfFetch(env, "/custom_hostnames", {
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http",
        settings: {
          min_tls_version: "1.2"
        },
        type: "dv"
      }
    }),
    method: "POST"
  });
  const data = (await res.json()) as CloudflareHostnameResponse;
  if (!data.success) {
    throw new Error(
      `Failed to create custom hostname: ${JSON.stringify(data)}`
    );
  }
  return data.result.id;
};

export const deleteCustomHostname = async (
  env: Env,
  hostnameId: string
): Promise<void> => {
  const res = await cfFetch(env, `/custom_hostnames/${hostnameId}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    console.error("Failed to delete Cloudflare custom hostname:", hostnameId);
  }
};
