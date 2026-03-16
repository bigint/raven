// Reuse PII patterns from existing guardrails
const PII_PATTERNS: Record<string, RegExp> = {
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
  phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/
};

interface EvaluationContext {
  organizationId: string;
  model?: string;
  provider?: string;
  estimatedCost?: number;
  requestBody: Record<string, unknown>;
}

interface ConditionResult {
  matched: boolean;
  evidence?: Record<string, unknown>;
}

const evaluateRegexCondition = (
  contents: string[],
  params: Record<string, unknown>
): ConditionResult => {
  const pattern = params.pattern as string | undefined;
  if (!pattern || pattern.length > 500) {
    return { matched: false };
  }

  try {
    const regex = new RegExp(pattern);
    for (const content of contents) {
      const truncated =
        content.length > 10_000 ? content.slice(0, 10_000) : content;
      const match = regex.exec(truncated);
      if (match) {
        return {
          evidence: { matchedText: match[0], pattern },
          matched: true
        };
      }
    }
  } catch {
    return { matched: false };
  }
  return { matched: false };
};

const evaluatePiiCondition = (
  contents: string[],
  params: Record<string, unknown>
): ConditionResult => {
  const enabledTypes =
    (params.piiTypes as string[] | undefined) ?? Object.keys(PII_PATTERNS);

  for (const content of contents) {
    for (const piiType of enabledTypes) {
      const pattern = PII_PATTERNS[piiType];
      if (pattern?.test(content)) {
        return {
          evidence: { detectedType: piiType },
          matched: true
        };
      }
    }
  }
  return { matched: false };
};

const evaluateKeywordCondition = (
  contents: string[],
  params: Record<string, unknown>
): ConditionResult => {
  const keywords = params.keywords as string[] | undefined;
  if (!keywords?.length) return { matched: false };

  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const content of contents) {
    const lower = content.toLowerCase();
    for (let i = 0; i < lowerKeywords.length; i++) {
      if (lower.includes(lowerKeywords[i] as string)) {
        return {
          evidence: { matchedKeyword: keywords[i] },
          matched: true
        };
      }
    }
  }
  return { matched: false };
};

const evaluateModelAllowlist = (
  model: string | undefined,
  params: Record<string, unknown>
): ConditionResult => {
  const allowedModels = params.models as string[] | undefined;
  if (!allowedModels?.length || !model) return { matched: false };

  const isAllowed = allowedModels.some(
    (m) => m.toLowerCase() === model.toLowerCase()
  );

  if (!isAllowed) {
    return {
      evidence: { allowedModels, requestedModel: model },
      matched: true
    };
  }
  return { matched: false };
};

const evaluateModelDenylist = (
  model: string | undefined,
  params: Record<string, unknown>
): ConditionResult => {
  const deniedModels = params.models as string[] | undefined;
  if (!deniedModels?.length || !model) return { matched: false };

  const isDenied = deniedModels.some(
    (m) => m.toLowerCase() === model.toLowerCase()
  );

  if (isDenied) {
    return {
      evidence: { deniedModels, requestedModel: model },
      matched: true
    };
  }
  return { matched: false };
};

const evaluateProviderRegion = (
  provider: string | undefined,
  params: Record<string, unknown>
): ConditionResult => {
  const allowedRegions = params.regions as string[] | undefined;
  const providerRegion = params.providerRegion as string | undefined;
  if (!allowedRegions?.length || !provider) return { matched: false };

  if (providerRegion && !allowedRegions.includes(providerRegion)) {
    return {
      evidence: { allowedRegions, currentRegion: providerRegion, provider },
      matched: true
    };
  }
  return { matched: false };
};

const evaluateCostThreshold = (
  estimatedCost: number | undefined,
  params: Record<string, unknown>
): ConditionResult => {
  const maxCost = params.maxCost as number | undefined;
  if (maxCost === undefined || estimatedCost === undefined) {
    return { matched: false };
  }

  if (estimatedCost > maxCost) {
    return {
      evidence: { estimatedCost, maxCost },
      matched: true
    };
  }
  return { matched: false };
};

const evaluateTokenThreshold = (
  body: Record<string, unknown>,
  params: Record<string, unknown>
): ConditionResult => {
  const maxTokens = params.maxTokens as number | undefined;
  if (maxTokens === undefined) return { matched: false };

  const requestedMaxTokens = (body.max_tokens ?? body.max_completion_tokens) as
    | number
    | undefined;

  if (requestedMaxTokens !== undefined && requestedMaxTokens > maxTokens) {
    return {
      evidence: { maxAllowed: maxTokens, requested: requestedMaxTokens },
      matched: true
    };
  }
  return { matched: false };
};

export const evaluateCondition = (
  conditions: Record<string, unknown>,
  context: EvaluationContext,
  contents: string[]
): ConditionResult => {
  const type = conditions.type as string;
  const params = (conditions.params as Record<string, unknown>) ?? {};

  switch (type) {
    case "regex":
      return evaluateRegexCondition(contents, params);
    case "pii":
      return evaluatePiiCondition(contents, params);
    case "keyword":
      return evaluateKeywordCondition(contents, params);
    case "model_allowlist":
      return evaluateModelAllowlist(context.model, params);
    case "model_denylist":
      return evaluateModelDenylist(context.model, params);
    case "provider_region":
      return evaluateProviderRegion(context.provider, params);
    case "cost_threshold":
      return evaluateCostThreshold(context.estimatedCost, params);
    case "token_threshold":
      return evaluateTokenThreshold(context.requestBody, params);
    case "composite": {
      const operator = (conditions.operator as string) ?? "AND";
      const subConditions = params.conditions as
        | Record<string, unknown>[]
        | undefined;
      if (!subConditions?.length) return { matched: false };

      const results = subConditions.map((sub) =>
        evaluateCondition(sub, context, contents)
      );

      if (operator === "OR") {
        const matchedResult = results.find((r) => r.matched);
        return matchedResult ?? { matched: false };
      }

      // AND: all must match
      const allMatched = results.every((r) => r.matched);
      if (allMatched) {
        return {
          evidence: { compositeResults: results.map((r) => r.evidence) },
          matched: true
        };
      }
      return { matched: false };
    }
    default:
      return { matched: false };
  }
};
