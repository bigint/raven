import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";
import { encodingForModel } from "js-tiktoken";

// In-memory cache for routing rules (avoids DB hit on every request)
const rulesCache = new Map<
  string,
  { rules: (typeof routingRules.$inferSelect)[]; expiresAt: number }
>();
const RULES_CACHE_TTL = 30_000; // 30 seconds

interface Message {
  content?: string;
  role?: string;
}

const encoder = encodingForModel("gpt-4o");

const estimateTokens = (text: string): number => encoder.encode(text).length;

const extractMessagesText = (body: Record<string, unknown>): string => {
  const messages = body.messages;

  if (!Array.isArray(messages)) {
    return "";
  }

  return (messages as Message[])
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ");
};

const getMessageCount = (body: Record<string, unknown>): number => {
  const messages = body.messages;
  return Array.isArray(messages) ? messages.length : 0;
};

export const evaluateRoutingRules = async (
  db: Database,
  orgId: string,
  model: string,
  body: Record<string, unknown>
): Promise<{ model: string; ruleApplied: string | null }> => {
  const cacheKey = `${orgId}:${model}`;
  const cached = rulesCache.get(cacheKey);
  let rules: (typeof routingRules.$inferSelect)[];

  if (cached && cached.expiresAt > Date.now()) {
    rules = cached.rules;
  } else {
    rules = await db
      .select()
      .from(routingRules)
      .where(
        and(
          eq(routingRules.organizationId, orgId),
          eq(routingRules.sourceModel, model),
          eq(routingRules.isEnabled, true)
        )
      )
      .orderBy(asc(routingRules.priority));
    rulesCache.set(cacheKey, {
      expiresAt: Date.now() + RULES_CACHE_TTL,
      rules
    });
  }

  if (rules.length === 0) {
    return { model, ruleApplied: null };
  }

  // Pre-parse condition values once after fetching rules
  const parsedRules = rules.map((rule) => {
    let parsedKeywords: string[] | null = null;
    if (rule.condition === "keyword_match") {
      try {
        parsedKeywords = JSON.parse(rule.conditionValue) as string[];
      } catch {
        parsedKeywords = null;
      }
    }
    return { ...rule, parsedKeywords };
  });

  const needsTokenCount = parsedRules.some(
    (r) =>
      r.condition === "token_count_below" ||
      r.condition === "token_count_above"
  );
  const messagesText = extractMessagesText(body);
  const tokenCount = needsTokenCount ? estimateTokens(messagesText) : 0;
  const messageCount = getMessageCount(body);

  const lowerMessagesText = messagesText.toLowerCase();

  for (const rule of parsedRules) {
    let matches = false;

    switch (rule.condition) {
      case "token_count_below": {
        const threshold = Number.parseInt(rule.conditionValue, 10);
        matches = tokenCount < threshold;
        break;
      }
      case "token_count_above": {
        const threshold = Number.parseInt(rule.conditionValue, 10);
        matches = tokenCount > threshold;
        break;
      }
      case "message_count_below": {
        const threshold = Number.parseInt(rule.conditionValue, 10);
        matches = messageCount < threshold;
        break;
      }
      case "keyword_match": {
        if (rule.parsedKeywords) {
          matches = rule.parsedKeywords.some((kw) =>
            lowerMessagesText.includes(kw.toLowerCase())
          );
        }
        break;
      }
    }

    if (matches) {
      return { model: rule.targetModel, ruleApplied: rule.id };
    }
  }

  return { model, ruleApplied: null };
};
