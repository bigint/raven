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
