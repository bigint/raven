/**
 * Parses an SSE stream from an OpenAI-compatible chat completions endpoint.
 * Yields text deltas, reasoning deltas, and final usage statistics.
 */
export const parseSSEStream = async function* (
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<{
  reasoning?: string;
  text: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}> {
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: { prompt_tokens: number; completion_tokens: number } | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed?.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);

        // Extract usage from finish chunk
        if (parsed.usage) {
          usage = {
            completion_tokens: parsed.usage.completion_tokens ?? 0,
            prompt_tokens: parsed.usage.prompt_tokens ?? 0
          };
        }

        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content || delta?.reasoning_content) {
          yield {
            reasoning: delta.reasoning_content,
            text: delta.content ?? ""
          };
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  // Yield final empty chunk with usage if available
  if (usage) {
    yield { text: "", usage };
  }
};
