import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { getProviderConfig } from "@/lib/providers";

export const createProviderSchema = z.object({
  apiKey: z.string().min(1),
  isEnabled: z.boolean().default(true),
  name: z.string().min(1).optional(),
  provider: z.string().min(1)
});

export const updateProviderSchema = z.object({
  apiKey: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
  name: z.string().optional()
});

export const maskApiKey = (encryptedKey: string): string => {
  const suffix = encryptedKey.slice(-4);
  return `****${suffix}`;
};

export const validateApiKey = async (
  provider: string,
  apiKey: string
): Promise<void> => {
  const config = getProviderConfig(provider);
  if (!config) return;

  const url = `${config.baseUrl}${config.validationPath}`;

  try {
    const res = await fetch(url, {
      headers: config.authHeaders(apiKey),
      method: config.validationMethod ?? "GET",
      ...(config.validationBody ? { body: config.validationBody } : {}),
      signal: AbortSignal.timeout(10000)
    });

    if (res.status === 401 || res.status === 403) {
      throw new ValidationError(`Invalid API key for ${config.label}`);
    }

    // 429 means rate limited but key is still valid
    if (res.ok || res.status === 429) return;

    throw new ValidationError(
      `API key validation failed for ${config.label} (status ${res.status})`
    );
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(
      `Could not validate API key for ${config.label}: ${err instanceof Error ? err.message : "connection failed"}`
    );
  }
};
