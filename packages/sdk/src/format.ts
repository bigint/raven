import type {
  GenerateParams,
  Message,
  TextResult,
  ToolCall,
  Usage
} from "./types";

const ANTHROPIC_PROVIDERS = new Set(["anthropic"]);

export const isAnthropicProvider = (provider: string): boolean =>
  ANTHROPIC_PROVIDERS.has(provider);

export const getProxyPath = (provider: string): string =>
  isAnthropicProvider(provider)
    ? `/v1/proxy/${provider}/messages`
    : `/v1/proxy/${provider}/chat/completions`;

const toOpenAIMessages = (
  messages: Message[],
  system?: string
): Record<string, unknown>[] => {
  const result: Record<string, unknown>[] = [];
  if (system) {
    result.push({ content: system, role: "system" });
  }
  for (const msg of messages) {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : msg.content.map((p) => {
            if (p.type === "text") return { text: p.text, type: "text" };
            return {
              image_url: { url: p.image },
              type: "image_url"
            };
          });

    const entry: Record<string, unknown> = { content, role: msg.role };
    if (msg.toolCallId) entry.tool_call_id = msg.toolCallId;
    result.push(entry);
  }
  return result;
};

const toAnthropicMessages = (
  messages: Message[]
): Record<string, unknown>[] => {
  const result: Record<string, unknown>[] = [];
  for (const msg of messages) {
    if (msg.role === "system") continue;
    const content =
      typeof msg.content === "string"
        ? msg.content
        : msg.content.map((p) => {
            if (p.type === "text") return { text: p.text, type: "text" };
            return {
              source: {
                data: p.image,
                media_type: "image/png",
                type: "base64"
              },
              type: "image"
            };
          });
    result.push({ content, role: msg.role });
  }
  return result;
};

export const formatRequest = (
  params: GenerateParams,
  stream: boolean
): Record<string, unknown> => {
  if (isAnthropicProvider(params.provider)) {
    const systemMessages = params.messages.filter((m) => m.role === "system");
    const systemText = params.system
      ? params.system
      : systemMessages.length > 0
        ? systemMessages
            .map((m) =>
              typeof m.content === "string"
                ? m.content
                : m.content
                    .filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("\n")
            )
            .join("\n\n")
        : undefined;

    const body: Record<string, unknown> = {
      max_tokens: params.maxTokens ?? 4096,
      messages: toAnthropicMessages(params.messages),
      model: params.model,
      stream
    };

    if (systemText) body.system = systemText;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stop) body.stop_sequences = params.stop;
    if (params.tools) {
      body.tools = params.tools.map((t) => ({
        description: t.function.description,
        input_schema: t.function.parameters,
        name: t.function.name
      }));
    }
    if (params.toolChoice) {
      if (params.toolChoice === "auto") body.tool_choice = { type: "auto" };
      else if (params.toolChoice === "required")
        body.tool_choice = { type: "any" };
      else if (params.toolChoice === "none")
        body.tool_choice = { disable_parallel_tool_use: true, type: "none" };
      else
        body.tool_choice = {
          name: params.toolChoice.function.name,
          type: "tool"
        };
    }

    return body;
  }

  const body: Record<string, unknown> = {
    messages: toOpenAIMessages(params.messages, params.system),
    model: params.model,
    stream
  };

  if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.topP !== undefined) body.top_p = params.topP;
  if (params.stop) body.stop = params.stop;
  if (params.tools) body.tools = params.tools;
  if (params.toolChoice) body.tool_choice = params.toolChoice;

  if (stream) {
    body.stream_options = { include_usage: true };
  }

  return body;
};

const parseOpenAIUsage = (
  usage: Record<string, number> | undefined
): Usage => ({
  completionTokens: usage?.completion_tokens ?? 0,
  promptTokens: usage?.prompt_tokens ?? 0,
  totalTokens: usage?.total_tokens ?? 0
});

const parseAnthropicUsage = (
  usage: Record<string, number> | undefined
): Usage => ({
  completionTokens: usage?.output_tokens ?? 0,
  promptTokens: usage?.input_tokens ?? 0,
  totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0)
});

export const parseBufferedResponse = (
  provider: string,
  data: Record<string, unknown>
): TextResult => {
  if (isAnthropicProvider(provider)) {
    const content = data.content as
      | Array<{
          text?: string;
          type: string;
          id?: string;
          name?: string;
          input?: unknown;
        }>
      | undefined;

    let text = "";
    const toolCalls: ToolCall[] = [];

    for (const block of content ?? []) {
      if (block.type === "text" && block.text) {
        text += block.text;
      }
      if (block.type === "tool_use" && block.name) {
        toolCalls.push({
          function: {
            arguments: JSON.stringify(block.input ?? {}),
            name: block.name
          },
          id: block.id ?? "",
          type: "function"
        });
      }
    }

    return {
      finishReason: (data.stop_reason as string) ?? "stop",
      text,
      toolCalls,
      usage: parseAnthropicUsage(
        data.usage as Record<string, number> | undefined
      )
    };
  }

  const choices = data.choices as
    | Array<{
        finish_reason?: string;
        message?: {
          content?: string;
          tool_calls?: ToolCall[];
        };
      }>
    | undefined;

  const choice = choices?.[0];

  return {
    finishReason: choice?.finish_reason ?? "stop",
    text: choice?.message?.content ?? "",
    toolCalls: choice?.message?.tool_calls ?? [],
    usage: parseOpenAIUsage(data.usage as Record<string, number> | undefined)
  };
};
