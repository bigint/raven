/**
 * OpenAI chat normalization — strips non-standard parameters that OpenAI
 * rejects and removes Anthropic-specific fields that may leak through.
 */

interface MessageContent {
  readonly cache_control?: unknown;
  readonly type?: string;
  readonly [key: string]: unknown;
}

type Message = Record<string, unknown>;
type Tool = Record<string, unknown>;

/**
 * Known OpenAI chat completion parameters. Anything not in this set
 * is stripped to prevent "Unknown parameter" errors from the API.
 */
const OPENAI_PARAMS = new Set([
  "audio",
  "frequency_penalty",
  "function_call",
  "functions",
  "logit_bias",
  "logprobs",
  "max_completion_tokens",
  "max_tokens",
  "messages",
  "metadata",
  "model",
  "modalities",
  "n",
  "parallel_tool_calls",
  "prediction",
  "presence_penalty",
  "reasoning_effort",
  "response_format",
  "seed",
  "service_tier",
  "stop",
  "store",
  "stream",
  "stream_options",
  "temperature",
  "tool_choice",
  "tools",
  "top_logprobs",
  "top_p",
  "user",
  "web_search_options"
]);

/** Remove `cache_control` from a single content block. */
const stripCacheControl = (block: MessageContent): Record<string, unknown> => {
  const { cache_control: _, ...rest } = block;
  return rest;
};

/** Strip `cache_control` from message content (string or array of blocks). */
const cleanMessageContent = (content: unknown): unknown => {
  if (Array.isArray(content)) {
    return content.map((block: MessageContent) =>
      block.cache_control === undefined ? block : stripCacheControl(block)
    );
  }
  return content;
};

/** Strip `cache_control` from a single message. */
const cleanMessage = (msg: Message): Message => {
  const { cache_control: _, ...rest } = msg;

  if (rest.content !== undefined) {
    return { ...rest, content: cleanMessageContent(rest.content) };
  }

  return rest;
};

/** Strip `cache_control` from a tool definition. */
const cleanTool = (tool: Tool): Tool => {
  const { cache_control: _, ...rest } = tool;

  if (
    rest.function !== undefined &&
    typeof rest.function === "object" &&
    rest.function !== null
  ) {
    const { cache_control: __, ...fnRest } = rest.function as Record<
      string,
      unknown
    >;
    return { ...rest, function: fnRest };
  }

  return rest;
};

/**
 * Normalize an OpenAI-format request by stripping unknown parameters
 * and Anthropic-specific fields. Returns the body as-is when clean.
 */
export const normalizeRequest = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  let modified = false;
  let result = body;

  // Strip unknown top-level parameters
  const unknownKeys = Object.keys(body).filter((k) => !OPENAI_PARAMS.has(k));
  if (unknownKeys.length > 0) {
    result = Object.fromEntries(
      Object.entries(body).filter(([k]) => OPENAI_PARAMS.has(k))
    );
    modified = true;
  }

  // Newer OpenAI models require max_completion_tokens instead of max_tokens.
  // If both are absent or max_completion_tokens is already set, do nothing.
  if (
    result.max_tokens !== undefined &&
    result.max_completion_tokens === undefined
  ) {
    result = {
      ...result,
      max_completion_tokens: result.max_tokens
    };
    delete result.max_tokens;
    modified = true;
  }

  // Strip cache_control from messages
  const messages = result.messages as Message[] | undefined;
  if (Array.isArray(messages)) {
    const hasCacheControl = messages.some(
      (msg) =>
        msg.cache_control !== undefined ||
        (Array.isArray(msg.content) &&
          (msg.content as MessageContent[]).some(
            (block) => block.cache_control !== undefined
          ))
    );

    if (hasCacheControl) {
      result = { ...result, messages: messages.map(cleanMessage) };
      modified = true;
    }
  }

  // Strip cache_control from tools
  const tools = result.tools as Tool[] | undefined;
  if (Array.isArray(tools)) {
    const hasCacheControl = tools.some((tool) => {
      if (tool.cache_control !== undefined) return true;
      const fn = tool.function as Record<string, unknown> | undefined;
      return fn?.cache_control !== undefined;
    });

    if (hasCacheControl) {
      result = { ...result, tools: tools.map(cleanTool) };
      modified = true;
    }
  }

  return modified ? result : body;
};
