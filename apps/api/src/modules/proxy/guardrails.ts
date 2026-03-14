import type { Database } from "@raven/db";
import { guardrailRules } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";
import { GuardrailError } from "@/lib/errors";

export interface GuardrailMatch {
  ruleName: string;
  ruleType: string;
  action: string;
  matchedContent: string;
}

export interface GuardrailResult {
  blocked: boolean;
  warnings: string[];
  matches: GuardrailMatch[];
}

interface Message {
  role?: string;
  content?: string;
}

const PII_PATTERNS: Record<string, RegExp> = {
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/
};

const extractTextContent = (messages: Message[]): string[] => {
  return messages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .filter(Boolean);
};

const evaluateBlockTopics = (
  contents: string[],
  config: Record<string, unknown>
): string | null => {
  const topics = config.topics as string[] | undefined;
  if (!topics?.length) return null;

  const lowerTopics = topics.map((t) => t.toLowerCase());

  for (const content of contents) {
    const lower = content.toLowerCase();
    for (let i = 0; i < lowerTopics.length; i++) {
      if (lower.includes(lowerTopics[i] as string)) {
        return topics[i] as string;
      }
    }
  }
  return null;
};

const evaluatePiiDetection = (contents: string[]): string | null => {
  for (const content of contents) {
    for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(content)) {
        return piiType;
      }
    }
  }
  return null;
};

const evaluateContentFilter = (
  contents: string[],
  config: Record<string, unknown>
): string | null => {
  const categories = config.categories as string[] | undefined;
  if (!categories?.length) return null;

  const lowerCategories = categories.map((c) => c.toLowerCase());

  for (const content of contents) {
    const lower = content.toLowerCase();
    for (let i = 0; i < lowerCategories.length; i++) {
      if (lower.includes(lowerCategories[i] as string)) {
        return categories[i] as string;
      }
    }
  }
  return null;
};

const evaluateCustomRegex = (
  contents: string[],
  config: Record<string, unknown>
): string | null => {
  const pattern = config.pattern as string | undefined;
  if (!pattern) return null;

  try {
    const regex = new RegExp(pattern);
    for (const content of contents) {
      const match = regex.exec(content);
      if (match) {
        return match[0];
      }
    }
  } catch {
    return null;
  }
  return null;
};

export const evaluateGuardrails = async (
  db: Database,
  organizationId: string,
  messages: Message[]
): Promise<GuardrailResult> => {
  const rules = await db
    .select()
    .from(guardrailRules)
    .where(
      and(
        eq(guardrailRules.organizationId, organizationId),
        eq(guardrailRules.isEnabled, true)
      )
    )
    .orderBy(asc(guardrailRules.priority));

  if (!rules.length) {
    return { blocked: false, matches: [], warnings: [] };
  }

  const contents = extractTextContent(messages);
  if (!contents.length) {
    return { blocked: false, matches: [], warnings: [] };
  }

  const warnings: string[] = [];
  const matches: GuardrailMatch[] = [];

  for (const rule of rules) {
    let matchedContent: string | null = null;

    switch (rule.type) {
      case "block_topics":
        matchedContent = evaluateBlockTopics(contents, rule.config);
        break;
      case "pii_detection":
        matchedContent = evaluatePiiDetection(contents);
        break;
      case "content_filter":
        matchedContent = evaluateContentFilter(contents, rule.config);
        break;
      case "custom_regex":
        matchedContent = evaluateCustomRegex(contents, rule.config);
        break;
    }

    if (!matchedContent) continue;

    const match: GuardrailMatch = {
      action: rule.action,
      matchedContent,
      ruleName: rule.name,
      ruleType: rule.type
    };
    matches.push(match);

    if (rule.action === "block") {
      throw new GuardrailError(`Request blocked by guardrail: ${rule.name}`, {
        matchedContent,
        rule: rule.name,
        type: rule.type
      });
    }

    if (rule.action === "warn") {
      warnings.push(
        `Guardrail warning [${rule.name}]: matched ${matchedContent}`
      );
    }
  }

  return { blocked: false, matches, warnings };
};
