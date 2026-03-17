import type {
  GenerateParams,
  Message,
  TextResult,
  ToolCall,
  Usage
} from "./types";

export const getProxyPath = (provider: string): string =>
  `/v1/proxy/${provider}/chat/completions`;

const toMessages = (
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

export const formatRequest = (
  params: GenerateParams,
  stream: boolean
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    messages: toMessages(params.messages, params.system),
    model: params.model,
    stream
  };

  if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.topP !== undefined) body.top_p = params.topP;
  if (params.stop) body.stop = params.stop;
  if (params.tools) body.tools = params.tools;
  if (params.toolChoice) body.tool_choice = params.toolChoice;
  if (params.reasoning?.enabled) {
    body.thinking = {
      budget_tokens: params.reasoning.budgetTokens ?? 8192,
      type: "enabled"
    };
    // Anthropic requires temperature=1 for extended thinking
    body.temperature = 1;
  }

  if (stream) {
    body.stream_options = { include_usage: true };
  }

  return body;
};

const parseUsage = (usage: Record<string, number> | undefined): Usage => ({
  completionTokens: usage?.completion_tokens ?? 0,
  promptTokens: usage?.prompt_tokens ?? 0,
  totalTokens: usage?.total_tokens ?? 0
});

export const parseBufferedResponse = (
  data: Record<string, unknown>
): TextResult => {
  // OpenAI format: choices[0].message.content
  const choices = data.choices as
    | Array<{
        finish_reason?: string;
        message?: {
          content?: string;
          tool_calls?: ToolCall[];
        };
      }>
    | undefined;

  if (choices?.[0]) {
    const choice = choices[0];
    return {
      finishReason: choice.finish_reason ?? "stop",
      text: choice.message?.content ?? "",
      toolCalls: choice.message?.tool_calls ?? [],
      usage: parseUsage(data.usage as Record<string, number> | undefined)
    };
  }

  // Anthropic format: content[0].text
  const content = data.content as
    | Array<{ type: string; text?: string }>
    | undefined;
  const textBlock = content?.find((b) => b.type === "text");
  const usage = data.usage as Record<string, number> | undefined;

  return {
    finishReason: (data.stop_reason as string) ?? "stop",
    text: textBlock?.text ?? "",
    toolCalls: [],
    usage: {
      completionTokens: usage?.output_tokens ?? 0,
      promptTokens: usage?.input_tokens ?? 0,
      totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0)
    }
  };
};
