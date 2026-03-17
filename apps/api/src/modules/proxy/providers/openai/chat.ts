/**
 * OpenAI chat normalization — lightweight passthrough since OpenAI IS the
 * canonical format. Only strips Anthropic-specific fields that may leak
 * through from upstream callers.
 */

interface MessageContent {
  readonly cache_control?: unknown;
  readonly type?: string;
  readonly [key: string]: unknown;
}

type Message = Record<string, unknown>;
type Tool = Record<string, unknown>;

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
 * Normalize an OpenAI-format request by stripping Anthropic-specific fields.
 * Returns the body as-is when no Anthropic fields are present.
 */
export const normalizeRequest = (
  body: Record<string, unknown>
): Record<string, unknown> => {
  let modified = false;
  let result = body;

  // Strip cache_control from messages
  const messages = body.messages as Message[] | undefined;
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
  const tools = body.tools as Tool[] | undefined;
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
