import type {
  AssistantModelMessage,
  ImagePart,
  ModelMessage,
  TextPart,
  ToolCallPart,
  ToolModelMessage,
  ToolResultPart,
  UserModelMessage
} from "ai";

// ProviderOptions = Record<string, Record<string, JSONValue>>
type ProviderOptions = Record<string, Record<string, unknown>>;

export interface ParsedRequest {
  messages: ModelMessage[];
  system?: string;
  tools?: Record<
    string,
    { description?: string; parameters: Record<string, unknown> }
  >;
  toolChoice?: "auto" | "none" | "required" | { toolName: string };
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
  providerOptions?: ProviderOptions;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  isStreaming: boolean;
  includeUsage: boolean;
  /** True when the request uses n > 1 and cannot be served by AI SDK */
  requiresRawProxy: boolean;
}

// ---------------------------------------------------------------------------
// JSON Schema cleaning
// ---------------------------------------------------------------------------

/**
 * Strip $id and $schema from JSON Schema objects.
 * Mistral rejects these; they're non-standard in tool parameter schemas.
 * Applied for all providers since they serve no purpose in tool definitions.
 */
const cleanJsonSchema = (schema: unknown): Record<string, unknown> => {
  if (!schema || typeof schema !== "object") {
    return { properties: {}, type: "object" };
  }

  const s = { ...(schema as Record<string, unknown>) };
  delete s.$id;
  delete s.$schema;

  // Anthropic requires `type` on every schema object — ensure it's present
  if (!s.type) {
    s.type = "object";
  }

  if (s.properties && typeof s.properties === "object") {
    const props = { ...(s.properties as Record<string, unknown>) };
    for (const key of Object.keys(props)) {
      props[key] = cleanJsonSchema(props[key]);
    }
    s.properties = props;
  }

  if (s.items) {
    s.items = cleanJsonSchema(s.items);
  }

  return s;
};

// ---------------------------------------------------------------------------
// Content part parsing
// ---------------------------------------------------------------------------

const parseUserContentParts = (content: unknown): (TextPart | ImagePart)[] => {
  if (typeof content === "string") {
    return [{ text: content, type: "text" }];
  }

  if (!Array.isArray(content)) {
    return [{ text: String(content ?? ""), type: "text" }];
  }

  const parts: (TextPart | ImagePart)[] = [];

  for (const block of content) {
    const b = block as Record<string, unknown>;

    if (b.type === "text") {
      const part: TextPart = { text: b.text as string, type: "text" };
      // Preserve client-specified cache control for Anthropic
      if (b.cache_control) {
        (part as unknown as Record<string, unknown>).providerOptions = {
          anthropic: {
            cacheControl: b.cache_control
          }
        };
      }
      parts.push(part);
    } else if (b.type === "image_url") {
      const imageUrl = b.image_url as Record<string, unknown> | undefined;
      const url = imageUrl?.url as string | undefined;
      if (url) {
        parts.push({ image: url, type: "image" } as ImagePart);
      }
    } else if (b.type === "image") {
      // Anthropic-native image format — convert to data URI
      const source = b.source as Record<string, unknown> | undefined;
      if (source?.type === "base64") {
        parts.push({
          image: `data:${source.media_type as string};base64,${source.data as string}`,
          type: "image"
        } as ImagePart);
      } else if (source?.type === "url") {
        parts.push({
          image: source.url as string,
          type: "image"
        } as ImagePart);
      }
    }
  }

  return parts;
};

// ---------------------------------------------------------------------------
// Message parsing
// ---------------------------------------------------------------------------

const parseMessages = (
  rawMessages: unknown[]
): { messages: ModelMessage[]; system?: string } => {
  const messages: ModelMessage[] = [];
  const systemParts: string[] = [];

  for (const raw of rawMessages) {
    const msg = raw as Record<string, unknown>;
    const role = msg.role as string;

    switch (role) {
      case "system": {
        if (typeof msg.content === "string") {
          systemParts.push(msg.content);
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            const b = block as Record<string, unknown>;
            if (b.type === "text") systemParts.push(b.text as string);
          }
        }
        break;
      }

      case "user": {
        messages.push({
          content: parseUserContentParts(msg.content),
          role: "user"
        } as UserModelMessage);
        break;
      }

      case "assistant": {
        const parts: (TextPart | ToolCallPart)[] = [];

        if (typeof msg.content === "string" && msg.content) {
          parts.push({ text: msg.content, type: "text" });
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            const b = block as Record<string, unknown>;
            if (b.type === "text" && b.text) {
              parts.push({ text: b.text as string, type: "text" });
            }
          }
        }

        if (Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            const call = tc as Record<string, unknown>;
            const fn = call.function as Record<string, unknown>;
            parts.push({
              input:
                typeof fn.arguments === "string"
                  ? JSON.parse(fn.arguments)
                  : fn.arguments,
              toolCallId: call.id as string,
              toolName: fn.name as string,
              type: "tool-call"
            } satisfies ToolCallPart);
          }
        }

        messages.push({
          content:
            parts.length === 1 && parts[0]!.type === "text"
              ? parts[0]!.text
              : parts,
          role: "assistant"
        } as AssistantModelMessage);
        break;
      }

      case "tool": {
        messages.push({
          content: [
            {
              output: {
                type: "text",
                value:
                  typeof msg.content === "string"
                    ? msg.content
                    : JSON.stringify(msg.content)
              },
              toolCallId: msg.tool_call_id as string,
              toolName: "",
              type: "tool-result"
            } satisfies ToolResultPart
          ],
          role: "tool"
        } satisfies ToolModelMessage);
        break;
      }

      default:
        // Skip unknown roles
        break;
    }
  }

  return {
    messages,
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined
  };
};

// ---------------------------------------------------------------------------
// Tool parsing
// ---------------------------------------------------------------------------

const parseTools = (
  rawTools: unknown[] | undefined
):
  | Record<
      string,
      { description?: string; parameters: Record<string, unknown> }
    >
  | undefined => {
  if (!rawTools?.length) return undefined;

  const tools: Record<
    string,
    { description?: string; parameters: Record<string, unknown> }
  > = {};

  for (const raw of rawTools) {
    const t = raw as Record<string, unknown>;
    if (t.type !== "function") continue;

    const fn = t.function as Record<string, unknown>;
    const name = fn.name as string;
    tools[name] = {
      description: fn.description as string | undefined,
      parameters: cleanJsonSchema(fn.parameters)
    };
  }

  return Object.keys(tools).length > 0 ? tools : undefined;
};

const parseToolChoice = (
  toolChoice: unknown
): "auto" | "none" | "required" | { toolName: string } | undefined => {
  if (toolChoice === "auto") return "auto";
  if (toolChoice === "none") return "none";
  if (toolChoice === "required") return "required";

  if (typeof toolChoice === "object" && toolChoice !== null) {
    const tc = toolChoice as Record<string, unknown>;
    if (tc.type === "function") {
      const fn = tc.function as Record<string, unknown>;
      return { toolName: fn.name as string };
    }
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// Provider options
// ---------------------------------------------------------------------------

const buildProviderOptions = (
  body: Record<string, unknown>,
  provider: string,
  hasTools: boolean
): ProviderOptions | undefined => {
  const opts: Record<string, Record<string, unknown>> = {};

  // OpenAI reasoning effort — must be stripped when tools are present
  if (body.reasoning_effort && provider === "openai" && !hasTools) {
    opts.openai = {
      ...opts.openai,
      reasoningEffort: body.reasoning_effort as string
    };
  }

  // Anthropic: auto-inject ephemeral cache control on system prompt.
  // This is Raven's value-add — customers get prompt caching for free.
  if (provider === "anthropic") {
    opts.anthropic = {
      ...opts.anthropic,
      cacheControl: { type: "ephemeral" }
    };
  }

  return Object.keys(opts).length > 0 ? opts : undefined;
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const parseIncomingRequest = (
  body: Record<string, unknown>,
  provider: string
): ParsedRequest => {
  const rawMessages = (body.messages as unknown[]) ?? [];
  const { messages, system } = parseMessages(rawMessages);
  const tools = parseTools(body.tools as unknown[] | undefined);
  const hasTools = tools !== undefined && Object.keys(tools).length > 0;
  const toolChoice = parseToolChoice(body.tool_choice);
  const providerOptions = buildProviderOptions(body, provider, hasTools);

  const streamOpts = body.stream_options as Record<string, unknown> | undefined;

  let stopSequences: string[] | undefined;
  if (typeof body.stop === "string") {
    stopSequences = [body.stop];
  } else if (Array.isArray(body.stop)) {
    stopSequences = body.stop as string[];
  }

  return {
    frequencyPenalty: body.frequency_penalty as number | undefined,
    includeUsage: streamOpts?.include_usage === true,
    isStreaming: body.stream === true,
    maxTokens:
      (body.max_tokens as number) ??
      (body.max_completion_tokens as number) ??
      undefined,
    messages,
    presencePenalty: body.presence_penalty as number | undefined,
    providerOptions,
    requiresRawProxy: typeof body.n === "number" && body.n > 1,
    seed: body.seed as number | undefined,
    stopSequences,
    system,
    temperature: body.temperature as number | undefined,
    toolChoice,
    tools,
    topP: body.top_p as number | undefined
  };
};
