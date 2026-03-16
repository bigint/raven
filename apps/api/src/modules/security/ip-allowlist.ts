import { isIP } from "node:net";
import type { Database } from "@raven/db";
import type { Context, Next } from "hono";
import type { Redis } from "ioredis";
import { ForbiddenError } from "@/lib/errors";

interface AllowlistRule {
  cidr: string;
  ip: number[];
  prefixLength: number;
  version: 4 | 6;
}

const CACHE_TTL_SECONDS = 60;

const cacheKey = (orgId: string): string => `ip-allowlist:${orgId}`;

const ipToBytes = (ip: string, version: 4 | 6): number[] => {
  if (version === 4) {
    return ip.split(".").map((octet) => Number.parseInt(octet, 10));
  }

  // Expand IPv6 shorthand
  const parts = ip.split(":");
  const expanded: string[] = [];

  for (const part of parts) {
    if (part === "") {
      // Fill in missing groups
      const missing = 8 - parts.filter((p) => p !== "").length;
      for (let i = 0; i <= missing; i++) {
        expanded.push("0000");
      }
    } else {
      expanded.push(part.padStart(4, "0"));
    }
  }

  const bytes: number[] = [];
  for (const group of expanded.slice(0, 8)) {
    const val = Number.parseInt(group, 16);
    bytes.push((val >> 8) & 0xff);
    bytes.push(val & 0xff);
  }

  return bytes;
};

const parseCidr = (cidr: string): AllowlistRule | null => {
  const [ip, prefix] = cidr.split("/");
  if (!ip) return null;

  const version = isIP(ip);
  if (version === 0) return null;

  const maxPrefix = version === 4 ? 32 : 128;
  const prefixLength = prefix ? Number.parseInt(prefix, 10) : maxPrefix;

  if (
    Number.isNaN(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > maxPrefix
  ) {
    return null;
  }

  return {
    cidr,
    ip: ipToBytes(ip, version as 4 | 6),
    prefixLength,
    version: version as 4 | 6
  };
};

const matchesCidr = (clientIp: string, rule: AllowlistRule): boolean => {
  const clientVersion = isIP(clientIp);
  if (clientVersion !== rule.version) return false;

  const clientBytes = ipToBytes(clientIp, rule.version);
  const ruleBytes = rule.ip;

  const fullBytes = Math.floor(rule.prefixLength / 8);
  const remainingBits = rule.prefixLength % 8;

  // Compare full bytes
  for (let i = 0; i < fullBytes; i++) {
    if (clientBytes[i] !== ruleBytes[i]) return false;
  }

  // Compare remaining bits
  if (remainingBits > 0 && fullBytes < clientBytes.length) {
    const mask = 0xff << (8 - remainingBits);
    if (
      ((clientBytes[fullBytes] as number) & mask) !==
      ((ruleBytes[fullBytes] as number) & mask)
    ) {
      return false;
    }
  }

  return true;
};

const getOrgAllowlist = async (
  db: Database,
  redis: Redis,
  orgId: string
): Promise<string[]> => {
  const key = cacheKey(orgId);
  const cached = await redis.get(key);

  if (cached !== null) {
    return JSON.parse(cached) as string[];
  }

  // Query the organization settings for IP allowlist
  // Using raw SQL to query the organization_settings or a dedicated table
  const result = await db.execute<{ ip_allowlist: string[] }>(
    `SELECT ip_allowlist FROM organizations WHERE id = '${orgId}' AND ip_allowlist IS NOT NULL LIMIT 1`
  );

  const rows = result as unknown as Array<{ ip_allowlist: string[] }>;
  const allowlist = rows[0]?.ip_allowlist ?? [];

  await redis.set(key, JSON.stringify(allowlist), "EX", CACHE_TTL_SECONDS);
  return allowlist;
};

export const createIpAllowlistMiddleware = (db: Database, redis: Redis) => {
  return async (c: Context, next: Next): Promise<undefined | Response> => {
    const orgId = c.get("organizationId") as string | undefined;
    if (!orgId) {
      return next();
    }

    const allowlist = await getOrgAllowlist(db, redis, orgId);
    if (allowlist.length === 0) {
      return next();
    }

    // Extract client IP from standard headers
    const clientIp =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      c.req.header("cf-connecting-ip") ??
      "";

    if (!clientIp || isIP(clientIp) === 0) {
      throw new ForbiddenError("Unable to determine client IP address");
    }

    const rules = allowlist
      .map((cidr) => parseCidr(cidr))
      .filter((r): r is AllowlistRule => r !== null);

    const allowed = rules.some((rule) => matchesCidr(clientIp, rule));

    if (!allowed) {
      throw new ForbiddenError("Request denied: IP address not in allowlist");
    }

    return next();
  };
};
