import type { Database } from "@raven/db";
import { providerConfigs } from "@raven/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { decrypt } from "@/lib/crypto";
import { log } from "@/lib/logger";

const BATCH_SIZE = 2048;

/** Quick check without decryption — use before accepting ingestion jobs */
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

export const embedTexts = async (
  apiKey: string,
  texts: string[],
  model: string,
  dimensions: number
): Promise<number[][]> => {
  const client = new OpenAI({ apiKey });
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({
      dimensions,
      input: batch,
      model
    });
    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
    if (i + BATCH_SIZE < texts.length) {
      log.info("Embedding batch progress", {
        completed: i + BATCH_SIZE,
        total: texts.length
      });
    }
  }
  return allEmbeddings;
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
