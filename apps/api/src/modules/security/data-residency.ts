export const PROVIDER_REGIONS: Record<string, string[]> = {
  anthropic: ["us"],
  "azure-openai": ["us", "eu", "ap", "me"],
  bedrock: ["us", "eu", "ap"],
  cerebras: ["us"],
  cohere: ["us", "ca"],
  deepseek: ["cn"],
  fireworks: ["us"],
  google: ["us", "eu"],
  groq: ["us"],
  mistralai: ["eu"],
  nvidia: ["us"],
  ollama: ["local"],
  openai: ["us"],
  sambanova: ["us"],
  together: ["us"]
};

export type DataRegion =
  | "any"
  | "ap"
  | "ca"
  | "cn"
  | "eu"
  | "local"
  | "me"
  | "us";

export interface DataResidencyConfig {
  allowedRegions: DataRegion[];
  enforceStrictly: boolean;
}

export const checkDataResidency = (
  provider: string,
  config: DataResidencyConfig
): { allowed: boolean; providerRegions: string[]; reason?: string } => {
  if (config.allowedRegions.includes("any")) {
    return {
      allowed: true,
      providerRegions: PROVIDER_REGIONS[provider] ?? ["unknown"]
    };
  }

  const providerRegions = PROVIDER_REGIONS[provider] ?? [];

  if (providerRegions.length === 0) {
    return {
      allowed: !config.enforceStrictly,
      providerRegions: ["unknown"],
      reason: config.enforceStrictly
        ? `Unknown region for provider ${provider}`
        : undefined
    };
  }

  const hasAllowedRegion = providerRegions.some((r) =>
    config.allowedRegions.includes(r as DataRegion)
  );

  return {
    allowed: hasAllowedRegion,
    providerRegions,
    reason: hasAllowedRegion
      ? undefined
      : `Provider ${provider} operates in ${providerRegions.join(", ")} but only ${config.allowedRegions.join(", ")} allowed`
  };
};

export const filterProvidersByRegion = (
  providers: string[],
  allowedRegions: DataRegion[]
): string[] => {
  if (allowedRegions.includes("any")) return providers;

  return providers.filter((provider) => {
    const regions = PROVIDER_REGIONS[provider] ?? [];
    return regions.some((r) => allowedRegions.includes(r as DataRegion));
  });
};
