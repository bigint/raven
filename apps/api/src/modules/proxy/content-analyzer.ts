export interface ContentAnalysis {
  hasImages: boolean;
  imageCount: number;
  hasToolUse: boolean;
  toolCount: number;
  sessionId: string | null;
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

export const analyzeContent = (
  body: unknown,
  sessionHeader?: string | null
): ContentAnalysis => {
  const result: ContentAnalysis = {
    hasImages: false,
    hasToolUse: false,
    imageCount: 0,
    sessionId: null,
    toolCount: 0
  };

  if (!body || typeof body !== "object") return result;

  const b = body as Record<string, unknown>;

  // Count images in messages
  if (Array.isArray(b.messages)) {
    result.imageCount = countImages(b.messages);
    result.hasImages = result.imageCount > 0;
  }

  // Detect tool use: OpenAI uses "tools" or "functions", Anthropic uses "tools"
  if (Array.isArray(b.tools)) {
    result.hasToolUse = true;
    result.toolCount = b.tools.length;
  } else if (Array.isArray(b.functions)) {
    result.hasToolUse = true;
    result.toolCount = b.functions.length;
  }

  // Extract session ID from header or body metadata
  if (sessionHeader) {
    result.sessionId = sessionHeader;
  } else {
    const metadata = b.metadata as Record<string, unknown> | undefined;
    if (metadata && typeof metadata.session_id === "string") {
      result.sessionId = metadata.session_id;
    }
  }

  return result;
};
