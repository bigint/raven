import { z } from "zod";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "169.254.170.2",
  "[::1]"
]);

const isPrivateHost = (hostname: string): boolean => {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal"))
    return true;

  // Strip brackets from IPv6
  const cleaned =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  const lower = cleaned.toLowerCase();

  // IPv6 loopback
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;

  // IPv6 link-local (fe80::/10)
  if (lower.startsWith("fe80:")) return true;

  // IPv6 unique local (fc00::/7)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const mappedMatch = lower.match(/^::ffff:(\d+)\.(\d+)\.\d+\.\d+$/);
  if (mappedMatch) {
    const a = Number.parseInt(mappedMatch[1] as string, 10);
    const b = Number.parseInt(mappedMatch[2] as string, 10);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
  }

  // Block private IPv4 ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (ipv4Match) {
    const [, first, second] = ipv4Match;
    if (first === "10") return true;
    if (first === "172" && Number(second) >= 16 && Number(second) <= 31)
      return true;
    if (first === "192" && second === "168") return true;
  }

  return false;
};

const safeUrl = z
  .string()
  .url()
  .refine(
    (val) => {
      try {
        const { hostname, protocol } = new URL(val);
        if (protocol !== "https:" && protocol !== "http:") return false;
        return !isPrivateHost(hostname);
      } catch {
        return false;
      }
    },
    { message: "URL must be a public HTTP(S) endpoint" }
  );

export const createWebhookSchema = z.object({
  events: z.array(z.string().min(1)).min(1),
  isEnabled: z.boolean().default(true),
  url: safeUrl
});

export const updateWebhookSchema = z.object({
  events: z.array(z.string().min(1)).min(1).optional(),
  isEnabled: z.boolean().optional(),
  url: safeUrl.optional()
});

export const testWebhookSchema = z.object({
  url: safeUrl
});
