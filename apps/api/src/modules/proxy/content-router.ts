import type { Database } from "@raven/db";
import { routingRules } from "@raven/db";
import { and, asc, eq } from "drizzle-orm";

interface Message {
  content?: string;
  role?: string;
}

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

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
  const rules = await db
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

  if (rules.length === 0) {
    return { model, ruleApplied: null };
  }

  const messagesText = extractMessagesText(body);
  const tokenCount = estimateTokens(messagesText);
  const messageCount = getMessageCount(body);

  for (const rule of rules) {
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
        const keywords: string[] = JSON.parse(rule.conditionValue);
        const lowerText = messagesText.toLowerCase();
        matches = keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
        break;
      }
    }

    if (matches) {
      return { model: rule.targetModel, ruleApplied: rule.id };
    }
  }

  return { model, ruleApplied: null };
};
