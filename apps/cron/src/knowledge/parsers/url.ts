import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export const parseUrl = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "RavenBot/1.0 (Knowledge RAG Ingestion)"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const window = parseHTML(html);
  const document = (window as unknown as { document: Document }).document;
  const reader = new Readability(document);
  const article = reader.parse();

  if (!article?.textContent) {
    throw new Error("Could not extract readable content from URL");
  }

  return article.textContent.trim();
};
