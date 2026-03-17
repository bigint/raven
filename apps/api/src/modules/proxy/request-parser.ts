import type { ModelMessage } from "ai";

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
  requiresRawProxy: boolean;
}

// Messages — convert OpenAI format to AI SDK ModelMessage[]
// Only the differences need conversion: tool_calls, tool results, image_url

type Msg = Record<string, unknown>;

/**
 * Convert a base64 string to Uint8Array.
 */
const base64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

/**
 * Build an AI SDK image part. Data URIs are decoded to inline bytes
 * because AI SDK v6 rejects data: schemes (tries to fetch them).
 */
const toImagePart = (url: string): Msg => {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (match) {
    return {
      image: base64ToBytes(match[2]!),
      mimeType: match[1]!,
      type: "image"
    };
  }
  return { image: url, type: "image" };
};

const convertContent = (content: unknown): unknown => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");

  return content.map((block: Msg) => {
    if (block.type === "image_url") {
      return toImagePart((block.image_url as Msg)?.url as string);
    }
    if (block.type === "image") {
      const src = block.source as Msg | undefined;
      if (src?.type === "base64") {
        return {
          image: base64ToBytes(src.data as string),
          mimeType: src.media_type as string,
          type: "image"
        };
      }
      if (src?.type === "url") return toImagePart(src.url as string);
    }
    return block;
  });
};

const convertMessage = (msg: Msg): ModelMessage | null => {
  const role = msg.role as string;

  switch (role) {
    case "user":
      return {
        content: convertContent(msg.content),
        role: "user"
      } as ModelMessage;

    case "assistant": {
      const parts: unknown[] = [];

      // Text content
      if (typeof msg.content === "string" && msg.content) {
        parts.push({ text: msg.content, type: "text" });
      } else if (Array.isArray(msg.content)) {
        for (const b of msg.content as Msg[]) {
          if (b.type === "text" && b.text) parts.push(b);
        }
      }

      // tool_calls → tool-call parts
      if (Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls as Msg[]) {
          const fn = tc.function as Msg;
          parts.push({
            input:
              typeof fn.arguments === "string"
                ? JSON.parse(fn.arguments as string)
                : fn.arguments,
            toolCallId: tc.id,
            toolName: fn.name,
            type: "tool-call"
          });
        }
      }

      return {
        content:
          parts.length === 1 && (parts[0] as Msg).type === "text"
            ? (parts[0] as Msg).text
            : parts,
        role: "assistant"
      } as ModelMessage;
    }

    case "tool":
      return {
        content: [
          {
            output: {
              type: "text",
              value:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content)
            },
            toolCallId: msg.tool_call_id,
            toolName: "",
            type: "tool-result"
          }
        ],
        role: "tool"
      } as ModelMessage;

    default:
      return null;
  }
};

// Tools

const ensureToolSchema = (schema: unknown): Record<string, unknown> => {
  if (!schema || typeof schema !== "object") {
    return { properties: {}, type: "object" };
  }
  const s = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
  delete s.$id;
  delete s.$schema;
  if (!s.type) s.type = "object";
  return s;
};

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
    const t = raw as Msg;
    if (t.type !== "function") continue;
    const fn = t.function as Msg;
    tools[fn.name as string] = {
      description: fn.description as string | undefined,
      parameters: ensureToolSchema(fn.parameters)
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
    const tc = toolChoice as Msg;
    if (tc.type === "function") {
      return { toolName: (tc.function as Msg).name as string };
    }
  }
  return undefined;
};

// Provider options

const buildProviderOptions = (
  body: Msg,
  provider: string,
  hasTools: boolean
): ProviderOptions | undefined => {
  const opts: Record<string, Record<string, unknown>> = {};

  if (body.reasoning_effort && provider === "openai" && !hasTools) {
    opts.openai = { reasoningEffort: body.reasoning_effort as string };
  }

  if (provider === "anthropic") {
    opts.anthropic = { cacheControl: { type: "ephemeral" } };
  }

  return Object.keys(opts).length > 0 ? opts : undefined;
};

// Main

export const parseIncomingRequest = (
  body: Msg,
  provider: string
): ParsedRequest => {
  const rawMessages = (body.messages as Msg[]) ?? [];

  const messages: ModelMessage[] = [];
  const systemParts: string[] = [];

  for (const msg of rawMessages) {
    if (msg.role === "system") {
      systemParts.push(
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content)
      );
    } else {
      const converted = convertMessage(msg);
      if (converted) messages.push(converted);
    }
  }

  const tools = parseTools(body.tools as unknown[] | undefined);
  const hasTools = tools !== undefined && Object.keys(tools).length > 0;

  const streamOpts = body.stream_options as Msg | undefined;

  let stopSequences: string[] | undefined;
  if (typeof body.stop === "string") stopSequences = [body.stop];
  else if (Array.isArray(body.stop)) stopSequences = body.stop as string[];

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
    providerOptions: buildProviderOptions(body, provider, hasTools),
    requiresRawProxy: typeof body.n === "number" && body.n > 1,
    seed: body.seed as number | undefined,
    stopSequences,
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    temperature: body.temperature as number | undefined,
    toolChoice: parseToolChoice(body.tool_choice),
    tools,
    topP: body.top_p as number | undefined
  };
};
