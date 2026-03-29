import OpenAI from "openai";

interface RankedChunk {
  readonly content: string;
  readonly id: string;
  readonly originalScore: number;
}

export const rerankChunks = async (
  apiKey: string,
  query: string,
  chunks: RankedChunk[]
): Promise<RankedChunk[]> => {
  if (chunks.length <= 1) return chunks;

  const client = new OpenAI({ apiKey });
  const numbered = chunks
    .map((c, i) => `[${i}] ${c.content.slice(0, 500)}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    messages: [
      {
        content: `You are a relevance ranker. Given a query and numbered text passages, return ONLY a comma-separated list of passage numbers ordered from most relevant to least relevant. No explanation.\n\nQuery: ${query}\n\nPassages:\n${numbered}`,
        role: "user"
      }
    ],
    model: "gpt-4o-mini",
    temperature: 0
  });

  const text = response.choices[0]?.message?.content ?? "";
  const indices = text
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n < chunks.length);

  if (indices.length === 0) return chunks;

  const seen = new Set(indices);
  const remaining = chunks.map((_, i) => i).filter((i) => !seen.has(i));
  return [...indices, ...remaining].map((i) => chunks[i]!);
};
