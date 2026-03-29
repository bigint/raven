import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import { decrypt } from "./crypto";

export const hasOpenAIProvider = async (db: Database): Promise<boolean> => {
  const [config] = await db
    .select({ id: providerConfigs.id })
    .from(providerConfigs)
    .where(eq(providerConfigs.provider, "openai"))
    .limit(1);
  return !!config;
};

export const getOpenAIKey = async (
  db: Database,
  encryptionSecret: string
): Promise<string> => {
  const configs = await db
    .select()
    .from(providerConfigs)
    .where(eq(providerConfigs.provider, "openai"))
    .limit(1);

  if (configs.length === 0) {
    throw new Error(
      "No OpenAI provider configured. Add an OpenAI provider to use Knowledge RAG."
    );
  }

  return decrypt(configs[0]!.apiKey, encryptionSecret);
};

/**
 * Embed texts using direct fetch instead of OpenAI SDK to minimize memory overhead.
 * Processes one text at a time — caller batches externally.
 */
export const embedTexts = async (
  apiKey: string,
  texts: string[],
  model: string,
  dimensions: number
): Promise<number[][]> => {
  const results: number[][] = [];

  for (const text of texts) {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      body: JSON.stringify({
        dimensions,
        input: text,
        model
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "Unknown error");
      throw new Error(`OpenAI embeddings API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as {
      data: { embedding: number[] }[];
    };
    results.push(data.data[0]!.embedding);
  }

  return results;
};

export const embedQuery = async (
  apiKey: string,
  query: string,
  model: string,
  dimensions: number
): Promise<number[]> => {
  const [embedding] = await embedTexts(apiKey, [query], model, dimensions);
  return embedding!;
};
