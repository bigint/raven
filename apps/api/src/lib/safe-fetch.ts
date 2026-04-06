import dns from "node:dns/promises";

const PRIVATE_IPV4_RANGES = [
  { mask: 0xff000000, prefix: 0x0a000000 }, // 10.0.0.0/8
  { mask: 0xfff00000, prefix: 0xac100000 }, // 172.16.0.0/12
  { mask: 0xffff0000, prefix: 0xc0a80000 }, // 192.168.0.0/16
  { mask: 0xff000000, prefix: 0x7f000000 }, // 127.0.0.0/8
  { mask: 0xffff0000, prefix: 0xa9fe0000 }, // 169.254.0.0/16
  { mask: 0xffffffff, prefix: 0x00000000 } // 0.0.0.0
];

const parseIPv4 = (ip: string): number | null => {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = Number(part);
    if (Number.isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) | num;
  }

  return result >>> 0;
};

const isPrivateIPv4 = (ip: string): boolean => {
  const num = parseIPv4(ip);
  if (num === null) return false;
  return PRIVATE_IPV4_RANGES.some(({ mask, prefix }) => (num & mask) === prefix);
};

const isPrivateIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (v4.includes(".")) return isPrivateIPv4(v4);
  }
  return false;
};

const isPrivateIP = (ip: string): boolean =>
  isPrivateIPv4(ip) || isPrivateIPv6(ip);

/**
 * Resolves a URL's hostname and validates the resolved IPs are not private.
 * Prevents DNS rebinding attacks by checking at fetch time, not just registration.
 */
export const assertPublicURL = async (url: string): Promise<void> => {
  const { hostname } = new URL(url);

  // Direct IP address check
  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    throw new Error(`Webhook URL resolves to a private address`);
  }

  // DNS resolution check — resolve the hostname and validate all IPs
  try {
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const all = [...addresses, ...addresses6];

    if (all.length === 0) {
      throw new Error(`Could not resolve hostname: ${hostname}`);
    }

    for (const addr of all) {
      if (isPrivateIP(addr)) {
        throw new Error(`Webhook URL resolves to a private address`);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Webhook URL")) {
      throw err;
    }
    if (
      err instanceof Error &&
      err.message.startsWith("Could not resolve hostname")
    ) {
      throw err;
    }
    throw new Error(`Failed to resolve webhook URL: ${hostname}`);
  }
};
