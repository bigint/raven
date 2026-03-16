import type { Database } from "@raven/db";
import { models } from "@raven/db";
import type { Redis } from "ioredis";

export type TaskType =
  | "coding"
  | "creative"
  | "analysis"
  | "translation"
  | "qa"
  | "summarization"
  | "structured_output"
  | "general";

interface SmartRouterConfig {
  strategy: "balanced" | "cost" | "quality" | "speed";
  taskOverrides?: Record<
    TaskType,
    { preferredModels?: string[]; strategy?: string }
  >;
  constraints?: {
    maxCostPerRequest?: number;
    maxLatencyMs?: number;
  };
}

interface ModelCandidate {
  slug: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  category: string;
  capabilities: string[];
  avgLatencyMs: number;
  qualityScore: number;
}

/** Classify a task based on the user messages in the request */
export const classifyTask = (
  messages: Array<{ role: string; content: unknown }>
): TaskType => {
  const textContent = messages
    .filter((m) => m.role === "user")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n")
    .toLowerCase();

  const codingPatterns =
    /\b(code|function|class|implement|debug|fix\s+bug|refactor|api|endpoint|typescript|python|javascript|rust|golang|sql|regex|algorithm|compile|syntax|variable|import|export|async|await|promise|array|object|loop|recursion|git|commit|merge|pull\s+request)\b/i;
  if (codingPatterns.test(textContent)) return "coding";

  const translationPatterns =
    /\b(translate|translation|translat|from\s+\w+\s+to\s+\w+|in\s+(spanish|french|german|chinese|japanese|korean|arabic|portuguese|italian|russian|hindi))\b/i;
  if (translationPatterns.test(textContent)) return "translation";

  const summaryPatterns =
    /\b(summarize|summary|tldr|tl;dr|key\s+points|main\s+points|brief|condense|digest|overview|recap)\b/i;
  if (summaryPatterns.test(textContent)) return "summarization";

  const analysisPatterns =
    /\b(analyze|analysis|compare|contrast|evaluate|assess|examine|investigate|study|research|data|statistics|trend|pattern|correlation|insight)\b/i;
  if (analysisPatterns.test(textContent)) return "analysis";

  const creativePatterns =
    /\b(write|story|poem|creative|fiction|narrative|imagine|character|dialogue|scene|plot|blog\s+post|article|essay|copywriting|slogan|tagline)\b/i;
  if (creativePatterns.test(textContent)) return "creative";

  const qaPatterns =
    /\b(what\s+is|how\s+do|why\s+does|explain|define|describe|tell\s+me|can\s+you|help\s+me\s+understand)\b/i;
  if (qaPatterns.test(textContent)) return "qa";

  const structuredPatterns =
    /\b(json|xml|csv|table|structured|format|schema|parse|extract)\b/i;
  if (structuredPatterns.test(textContent)) return "structured_output";

  return "general";
};

/** Score a model candidate for a given task and strategy */
const scoreModel = (
  model: ModelCandidate,
  task: TaskType,
  strategy: string
): number => {
  let score = 0;

  // Quality component (0-40 points)
  const qualityWeight =
    strategy === "quality" ? 40 : strategy === "cost" ? 10 : 25;
  if (
    task === "coding" &&
    (model.category === "flagship" || model.category === "reasoning")
  ) {
    score += qualityWeight;
  } else if (task === "creative" && model.category === "flagship") {
    score += qualityWeight;
  } else if (
    task === "summarization" &&
    (model.category === "balanced" || model.category === "fast")
  ) {
    score += qualityWeight;
  } else if (task === "translation" && model.category === "flagship") {
    score += qualityWeight * 0.8;
  } else if (model.category === "balanced") {
    score += qualityWeight * 0.6;
  } else {
    score += qualityWeight * 0.3;
  }

  // Cost component (0-30 points, lower cost = higher score)
  const costWeight = strategy === "cost" ? 30 : strategy === "quality" ? 5 : 15;
  const avgPrice = (model.inputPrice + model.outputPrice) / 2;
  if (avgPrice === 0) score += costWeight;
  else if (avgPrice < 1) score += costWeight * 0.8;
  else if (avgPrice < 5) score += costWeight * 0.5;
  else if (avgPrice < 15) score += costWeight * 0.3;
  else score += costWeight * 0.1;

  // Speed component (0-30 points)
  const speedWeight = strategy === "speed" ? 30 : strategy === "cost" ? 10 : 15;
  if (model.category === "fast") score += speedWeight;
  else if (model.category === "balanced") score += speedWeight * 0.6;
  else score += speedWeight * 0.3;

  return score;
};

/** Intelligent model selection based on task classification and strategy */
export const smartRoute = async (
  db: Database,
  _redis: Redis,
  _orgId: string,
  messages: Array<{ role: string; content: unknown }>,
  config: SmartRouterConfig = { strategy: "balanced" }
): Promise<{
  model: string;
  provider: string;
  taskType: TaskType;
  score: number;
  reason: string;
}> => {
  const task = classifyTask(messages);

  // Check for task-specific overrides
  const taskConfig = config.taskOverrides?.[task];
  const strategy = taskConfig?.strategy ?? config.strategy;

  // Get available models from DB
  const availableModels = await db.select().from(models).limit(100);

  // Filter by preferred models if specified
  let candidates = availableModels;
  if (taskConfig?.preferredModels && taskConfig.preferredModels.length > 0) {
    const preferred = availableModels.filter((m) =>
      taskConfig.preferredModels?.includes(m.slug)
    );
    if (preferred.length > 0) candidates = preferred;
  }

  // Score each model
  const scored = candidates.map((m) => ({
    model: m,
    score: scoreModel(
      {
        avgLatencyMs: 0,
        capabilities: m.capabilities,
        category: m.category,
        contextWindow: m.contextWindow,
        inputPrice: Number(m.inputPrice),
        outputPrice: Number(m.outputPrice),
        provider: m.provider,
        qualityScore: 0,
        slug: m.slug
      },
      task,
      strategy
    )
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) {
    throw new Error("No models available for routing");
  }

  return {
    model: best.model.slug,
    provider: best.model.provider,
    reason: `task=${task}, strategy=${strategy}, score=${best.score.toFixed(1)}`,
    score: best.score,
    taskType: task
  };
};
