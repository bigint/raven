export interface PlaygroundSettings {
  readonly temperature: number;
  readonly maxTokens: number;
  readonly stream: boolean;
  readonly showMetadata: boolean;
  readonly enableTools: boolean;
  readonly enableWebSearch: boolean;
  readonly enableReasoning: boolean;
  readonly reasoningBudget: number;
  readonly chatMemory: number;
}

export interface ImageAttachment {
  readonly id: string;
  readonly base64: string;
  readonly name: string;
  readonly preview: string;
}
