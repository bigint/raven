/**
 * Mistral AI chat normalization.
 *
 * Mistral's API is OpenAI-compatible but has several quirks:
 * - Fails on $id / $schema in tool parameter schemas
 * - Only supports `name` on tool-role messages
 * - Returns extra_forbidden for null/undefined values
 * - Uses "any" instead of "required" for tool_choice
 * - Magistral models return thinking blocks in a nested content array
 */

type Message = Record<string, unknown>;

interface ContentBlock {
  readonly file?: Record<string, unknown>;
  readonly file_id?: string;
  readonly text?: string;
  readonly type?: string;
  readonly [key: string]: unknown;
}

interface ThinkingBlock {
  readonly text?: string;
  readonly type?: string;
}

interface ContentArrayItem {
  readonly text?: string;
  readonly thinking?: readonly ThinkingBlock[];
  readonly type?: string;
  readonly [key: string]: unknown;
}

interface Choice {
  readonly delta?: Record<string, unknown>;
  readonly finish_reason?: string | null;
  readonly index: number;
  readonly message?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively strip $id and $schema from JSON Schema objects (depth-limited). */
const cleanToolSchema = (
  schema: Record<string, unknown>,
  depth = 0
): Record<string, unknown> => {
  if (depth > 10) return schema;
  const cleaned = { ...schema };
  delete cleaned["$id"];
  delete cleaned["$schema"];

  for (const [key, value] of Object.entries(cleaned)) {
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        cleaned[key] = value.map((item: unknown) =>
          typeof item === "object" && item !== null
            ? cleanToolSchema(item as Record<string, unknown>, depth + 1)
            : item
        );
      } else {
        cleaned[key] = cleanToolSchema(
          value as Record<string, unknown>,
          depth + 1
        );
      }
    }
  }
  return cleaned;
};

/** Remove null and undefined values from an object (shallow). */
const stripNulls = (obj: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined)
  );
};

/**
 * Flatten text-only content arrays to a plain string.
 * Leaves arrays containing media blocks (image_url, file, image) untouched.
 */
const flattenTextContent = (content: unknown): unknown => {
  if (!Array.isArray(content)) return content;

  const blocks = content as ContentBlock[];
  const hasMedia = blocks.some(
    (block) =>
      block.type === "image_url" ||
      block.type === "file" ||
      block.type === "image"
  );

  if (hasMedia) return content;

  return blocks
    .filter((block) => block.type === "text" || typeof block === "string")
    .map((block) => (typeof block === "string" ? block : (block.text ?? "")))
    .join("");
};

/**
 * Flatten Mistral-style file content blocks.
 * `{type: "file", file: {file_id: "xxx"}}` -> `{type: "file", file_id: "xxx"}`
 */
const flattenFileBlocks = (content: unknown): unknown => {
  if (!Array.isArray(content)) return content;

  return (content as ContentBlock[]).map((block) => {
    if (
      block.type === "file" &&
      typeof block.file === "object" &&
      block.file !== null &&
      "file_id" in block.file
    ) {
      const { file: _, ...rest } = block;
      return { ...rest, file_id: block.file.file_id as string };
    }
    return block;
  });
};

/**
 * Map OpenAI tool_choice to Mistral format.
 * - "auto" / "none" pass through
 * - "required" becomes "any"
 * - Specific function selection becomes "any" (unsupported by Mistral)
 */
const mapToolChoice = (toolChoice: unknown): string | undefined => {
  if (toolChoice === "auto") return "auto";
  if (toolChoice === "none") return "none";
  if (toolChoice === "required") return "any";

  if (typeof toolChoice === "object" && toolChoice !== null) {
    const tc = toolChoice as Record<string, unknown>;
    if (tc.type === "function" && tc.function) return "any";
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// Thinking block extraction (Magistral models)
// ---------------------------------------------------------------------------

/**
 * Extract thinking and text content from a Magistral-style content array.
 * Returns `{ content, reasoningContent }`.
 */
const extractThinkingBlocks = (
  contentArray: readonly ContentArrayItem[]
): { content: string; reasoningContent: string } => {
  const textParts: string[] = [];
  const thinkingParts: string[] = [];

  for (const item of contentArray) {
    if (item.type === "thinking" && Array.isArray(item.thinking)) {
      for (const block of item.thinking) {
        if (block.type === "text" && block.text) {
          thinkingParts.push(block.text);
        }
      }
    } else if (item.type === "text" && item.text) {
      textParts.push(item.text);
    }
  }

  return {
    content: textParts.join(""),
    reasoningContent: thinkingParts.join("")
  };
};

// ---------------------------------------------------------------------------
// normalizeRequest  (OpenAI -> Mistral)
// ---------------------------------------------------------------------------

export const normalizeRequest = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  const rawMessages = body.messages as Message[] | undefined;
  if (!rawMessages) return stripNulls(body);

  // Deep-clone messages so we never mutate the caller's data
  let messages: Message[] = rawMessages.map((m) => ({ ...m }) as Message);

  // --- Tool schema cleaning ---
  let tools = body.tools as Record<string, unknown>[] | undefined;
  if (Array.isArray(tools) && tools.length > 0) {
    tools = tools.map((tool) => {
      const fn = tool.function as Record<string, unknown> | undefined;
      if (!fn?.parameters) return tool;

      return {
        ...tool,
        function: {
          ...fn,
          parameters: cleanToolSchema(fn.parameters as Record<string, unknown>)
        }
      };
    });
  }

  // --- Name field stripping ---
  for (const msg of messages) {
    if (msg.role !== "tool" && msg.name !== undefined) {
      delete msg.name;
    }
    if (
      msg.role === "tool" &&
      typeof msg.name === "string" &&
      msg.name.trim() === ""
    ) {
      delete msg.name;
    }
  }

  // --- File content flattening ---
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      msg.content = flattenFileBlocks(msg.content);
    }
  }

  // --- Content list to string ---
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      msg.content = flattenTextContent(msg.content);
    }
  }

  // --- Empty assistant message filtering ---
  messages = messages.filter((msg) => {
    if (msg.role !== "assistant") return true;
    const hasContent =
      msg.content &&
      (typeof msg.content !== "string" || msg.content.trim() !== "");
    const hasToolCalls =
      Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
    return hasContent || hasToolCalls;
  });

  // --- Build result ---
  const result: Record<string, unknown> = {
    messages,
    model: body.model,
    stream: body.stream
  };

  // Pass-through parameters
  if (body.max_tokens !== undefined) result.max_tokens = body.max_tokens;
  if (body.temperature !== undefined) result.temperature = body.temperature;
  if (body.top_p !== undefined) result.top_p = body.top_p;
  if (body.stop !== undefined) result.stop = body.stop;
  if (body.response_format !== undefined)
    result.response_format = body.response_format;
  if (body.parallel_tool_calls !== undefined)
    result.parallel_tool_calls = body.parallel_tool_calls;
  if (body.seed !== undefined) result.seed = body.seed;
  if (body.stream_options !== undefined)
    result.stream_options = body.stream_options;

  // Tools (after cleaning)
  if (Array.isArray(tools) && tools.length > 0) {
    result.tools = tools;
  }

  // Tool choice mapping
  if (body.tool_choice !== undefined) {
    const mapped = mapToolChoice(body.tool_choice);
    if (mapped !== undefined) result.tool_choice = mapped;
  }

  return stripNulls(result);
};

// ---------------------------------------------------------------------------
// normalizeResponse  (Mistral -> OpenAI)
// ---------------------------------------------------------------------------

export const normalizeResponse = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  const choices = body.choices as Choice[] | undefined;
  if (!Array.isArray(choices)) return body;

  const normalizedChoices = choices.map((choice) => {
    const message = choice.message;
    if (!message) return choice;

    // Handle Magistral content arrays with thinking blocks
    if (Array.isArray(message.content)) {
      const { content, reasoningContent } = extractThinkingBlocks(
        message.content as ContentArrayItem[]
      );

      const normalizedMessage: Record<string, unknown> = {
        ...message,
        content: content || null
      };

      if (reasoningContent) {
        normalizedMessage.reasoning_content = reasoningContent;
      }

      return { ...choice, message: normalizedMessage };
    }

    // Convert empty string content to null
    if (message.content === "") {
      return { ...choice, message: { ...message, content: null } };
    }

    return choice;
  });

  return { ...body, choices: normalizedChoices };
};

// ---------------------------------------------------------------------------
// createStreamNormalizer  (Mistral SSE -> OpenAI SSE)
// ---------------------------------------------------------------------------

/**
 * Creates a stateful stream normalizer for a single SSE stream.
 * Uses closure state to track per-stream context.
 */
export const createStreamNormalizer = (): ((line: string) => string | null) => {
  return (line: string): string | null => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return null;

    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") return line;

    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      const choices = parsed.choices as Choice[] | undefined;

      if (!Array.isArray(choices) || choices.length === 0) return line;

      let modified = false;
      const normalizedChoices = choices.map((choice) => {
        const delta = choice.delta;
        if (!delta) return choice;

        // Handle Magistral content arrays in streaming deltas
        if (Array.isArray(delta.content)) {
          const { content, reasoningContent } = extractThinkingBlocks(
            delta.content as ContentArrayItem[]
          );

          const normalizedDelta: Record<string, unknown> = { ...delta };

          if (content) {
            normalizedDelta.content = content;
          } else {
            delete normalizedDelta.content;
          }

          if (reasoningContent) {
            normalizedDelta.reasoning_content = reasoningContent;
          }

          modified = true;
          return { ...choice, delta: normalizedDelta };
        }

        return choice;
      });

      if (!modified) return line;

      return `data: ${JSON.stringify({ ...parsed, choices: normalizedChoices })}`;
    } catch {
      // Unparseable chunk — pass through as-is
      return line;
    }
  };
};
