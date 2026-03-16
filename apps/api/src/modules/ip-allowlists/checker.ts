import type { Database } from "@raven/db";
import { ipAllowlists } from "@raven/db";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";

const ipToNumber = (ip: string): number | null => {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (Number.isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) | num;
  }
  return result >>> 0;
};

const parseCidr = (cidr: string): { ip: number; mask: number } | null => {
  const parts = cidr.split("/");
  if (parts.length !== 2) {
    // Single IP address
    const ip = ipToNumber(cidr);
    return ip === null ? null : { ip, mask: 0xffffffff };
  }

  const ipPart = parts[0] ?? "";
  const prefixPart = parts[1] ?? "";
  const ip = ipToNumber(ipPart);
  const prefix = parseInt(prefixPart, 10);
  if (ip === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32)
    return null;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return { ip: (ip & mask) >>> 0, mask };
};

const isIpInCidr = (ip: string, cidr: string): boolean => {
  const ipNum = ipToNumber(ip);
  const cidrParsed = parseCidr(cidr);
  if (ipNum === null || cidrParsed === null) return false;
  return (ipNum & cidrParsed.mask) >>> 0 === cidrParsed.ip;
};

export const checkIpAllowlist = async (
  db: Database,
  redis: Redis,
  orgId: string,
  clientIp: string
): Promise<{ allowed: boolean; reason?: string }> => {
  const cacheKey = `ip-allowlist:${orgId}`;
  const cached = await redis.get(cacheKey);

  let rules: Array<{ cidr: string; isEnabled: boolean }>;

  if (cached) {
    rules = JSON.parse(cached);
  } else {
    rules = await db
      .select({
        cidr: ipAllowlists.cidr,
        isEnabled: ipAllowlists.isEnabled
      })
      .from(ipAllowlists)
      .where(eq(ipAllowlists.organizationId, orgId));

    await redis.set(cacheKey, JSON.stringify(rules), "EX", 60);
  }

  const enabledRules = rules.filter((r) => r.isEnabled);

  // If no rules defined, allow all
  if (enabledRules.length === 0) return { allowed: true };

  // Check if IP matches any rule
  for (const rule of enabledRules) {
    if (isIpInCidr(clientIp, rule.cidr)) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: `IP ${clientIp} not in allowlist` };
};
