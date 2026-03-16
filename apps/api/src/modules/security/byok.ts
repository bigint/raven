import type { Context } from "hono";

/**
 * Extracts a user-provided API key from the `X-Provider-Key` header.
 * When present, this key is used instead of the org's stored provider key,
 * while all gateway features (logging, guardrails, rate limiting, etc.) still apply.
 */
export const extractProviderKey = (c: Context): string | null => {
  const header = c.req.header("X-Provider-Key");
  if (!header || header.trim().length === 0) return null;
  return header.trim();
};

/**
 * Returns the effective API key to use for the upstream provider request.
 * If the user provided their own key via `X-Provider-Key`, use that.
 * Otherwise, fall back to the org's stored (decrypted) key.
 */
export const resolveProviderKey = (
  decryptedOrgKey: string,
  byokKey: string | null
): string => {
  return byokKey ?? decryptedOrgKey;
};
