import { createId } from "@paralleldrive/cuid2";

export interface ContentAnalysis {
  readonly hasImages: boolean;
  readonly imageCount: number;
  readonly hasToolUse: boolean;
  readonly toolCount: number;
  readonly toolNames: readonly string[];
  readonly sessionId: string | null;
}

const countImages = (messages: unknown[]): number => {
  let count = 0;

  for (const message of messages) {
    const msg = message as Record<string, unknown>;
    const content = msg.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      const b = block as Record<string, unknown>;
      // OpenAI: type: "image_url"
      if (b.type === "image_url") count++;
      // Anthropic: type: "image"
      if (b.type === "image") count++;
    }
  }

  return count;
};

const extractToolNames = (tools: unknown[]): readonly string[] =>
  tools.flatMap((tool) => {
    const t = tool as Record<string, unknown>;
    // OpenAI: tools[].function.name
    const fn = t.function as Record<string, unknown> | undefined;
    if (fn && typeof fn.name === "string") return [fn.name];
    // Anthropic: tools[].name
    if (typeof t.name === "string") return [t.name];
    return [];
  });

const extractFunctionNames = (functions: unknown[]): readonly string[] =>
  functions.flatMap((fn) => {
    const f = fn as Record<string, unknown>;
    return typeof f.name === "string" ? [f.name] : [];
  });

export const analyzeContent = (
  body: unknown,
  sessionHeader?: string | null
): ContentAnalysis => {
  const empty: ContentAnalysis = {
    hasImages: false,
    hasToolUse: false,
    imageCount: 0,
    sessionId: null,
    toolCount: 0,
    toolNames: []
  };

  if (!body || typeof body !== "object") return empty;

  const b = body as Record<string, unknown>;

  // Count images in messages
  const imageCount = Array.isArray(b.messages) ? countImages(b.messages) : 0;

  // Detect tool use: OpenAI uses "tools" or "functions", Anthropic uses "tools"
  const toolInfo = Array.isArray(b.tools)
    ? {
        hasToolUse: true,
        toolCount: b.tools.length,
        toolNames: extractToolNames(b.tools)
      }
    : Array.isArray(b.functions)
      ? {
          hasToolUse: true,
          toolCount: b.functions.length,
          toolNames: extractFunctionNames(b.functions)
        }
      : { hasToolUse: false, toolCount: 0, toolNames: [] as readonly string[] };

  // Extract session ID from header or body metadata
  const sessionId = (() => {
    if (sessionHeader) return sessionHeader;
    const metadata = b.metadata as Record<string, unknown> | undefined;
    if (metadata && typeof metadata.session_id === "string") {
      return metadata.session_id;
    }
    return createId();
  })();

  return {
    hasImages: imageCount > 0,
    ...toolInfo,
    imageCount,
    sessionId
  };
};
