export interface TextContent {
  text: string;
  type: "text";
}

export interface ImageContent {
  image: string;
  type: "image";
}

export type ContentPart = ImageContent | TextContent;

export interface Message {
  content: ContentPart[] | string;
  role: "assistant" | "system" | "tool" | "user";
  toolCallId?: string;
}

export interface ToolFunction {
  description?: string;
  name: string;
  parameters: Record<string, unknown>;
}

export interface ToolDefinition {
  function: ToolFunction;
  type: "function";
}

export interface ToolCall {
  function: {
    arguments: string;
    name: string;
  };
  id: string;
  type: "function";
}

export type ToolChoice =
  | "auto"
  | "none"
  | "required"
  | { function: { name: string }; type: "function" };

export interface Usage {
  completionTokens: number;
  promptTokens: number;
  totalTokens: number;
}

export interface GenerateParams {
  maxTokens?: number;
  messages: Message[];
  model: string;
  provider: string;
  stop?: string[];
  system?: string;
  temperature?: number;
  toolChoice?: ToolChoice;
  tools?: ToolDefinition[];
  topP?: number;
}

export interface TextResult {
  finishReason: string;
  text: string;
  toolCalls: ToolCall[];
  usage: Usage;
}

export type TextStreamChunkType =
  | "error"
  | "finish"
  | "text-delta"
  | "tool-call";

export interface TextStreamChunk {
  error?: string;
  finishReason?: string;
  textDelta?: string;
  toolCall?: ToolCall;
  type: TextStreamChunkType;
  usage?: Usage;
}

export interface RavenClientOptions {
  apiKey: string;
  baseUrl: string;
}
