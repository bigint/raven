export interface ResponseAnalysis {
  hasToolCalls: boolean;
  toolCallCount: number;
  toolCallNames: string[];
}

export const analyzeResponse = (body: unknown): ResponseAnalysis => {
  const result: ResponseAnalysis = {
    hasToolCalls: false,
    toolCallCount: 0,
    toolCallNames: []
  };

  if (!body || typeof body !== "object") return result;

  const b = body as Record<string, unknown>;

  // OpenAI: choices[].message.tool_calls
  if (Array.isArray(b.choices)) {
    for (const choice of b.choices) {
      const ch = choice as Record<string, unknown>;
      const message = ch.message as Record<string, unknown> | undefined;
      if (message && Array.isArray(message.tool_calls)) {
        result.toolCallCount += message.tool_calls.length;
        for (const tc of message.tool_calls) {
          const call = tc as Record<string, unknown>;
          const fn = call.function as Record<string, unknown> | undefined;
          if (fn && typeof fn.name === "string") {
            result.toolCallNames.push(fn.name);
          }
        }
      }
    }
  }

  // Anthropic: content blocks with type: "tool_use"
  if (Array.isArray(b.content)) {
    for (const block of b.content) {
      const bl = block as Record<string, unknown>;
      if (bl.type === "tool_use") {
        result.toolCallCount++;
        if (typeof bl.name === "string") {
          result.toolCallNames.push(bl.name);
        }
      }
    }
  }

  result.hasToolCalls = result.toolCallCount > 0;

  return result;
};
