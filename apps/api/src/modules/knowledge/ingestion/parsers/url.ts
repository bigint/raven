import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { log } from "@/lib/logger";

const MAX_PAGES = 50;
const FETCH_TIMEOUT = 15_000;

const fetchPage = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RavenBot/1.0 (Knowledge RAG Ingestion)"
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT)
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    return response.text();
  } catch {
    return null;
  }
};

const extractText = (html: string): string | null => {
  const window = parseHTML(html);
  const document = (window as unknown as { document: Document }).document;
  const reader = new Readability(document);
  const article = reader.parse();
  return article?.textContent?.trim() || null;
};

const extractLinks = (html: string, baseUrl: URL): string[] => {
  const window = parseHTML(html);
  const document = (window as unknown as { document: Document }).document;

  const anchors = document.querySelectorAll("a[href]");
  const links: string[] = [];

  for (const a of anchors) {
    try {
      const href = (a as HTMLAnchorElement).href;
      if (!href) continue;

      const resolved = new URL(href, baseUrl);
      if (resolved.origin !== baseUrl.origin) continue;
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
        continue;

      resolved.hash = "";
      const normalized = resolved.href.replace(/\/+$/, "");

      if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|tar|gz|mp4|mp3|woff2?|ttf|eot)$/i.test(resolved.pathname))
        continue;

      links.push(normalized);
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(links)];
};

export const parseUrl = async (url: string): Promise<string> => {
  const baseUrl = new URL(url);
  const visited = new Set<string>();
  const queue: string[] = [url.replace(/\/+$/, "")];
  const allText: string[] = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    const html = await fetchPage(currentUrl);
    if (!html) continue;

    const text = extractText(html);
    if (text && text.length > 50) {
      allText.push(`[Source: ${currentUrl}]\n${text}`);
      log.info("Crawled page", { url: currentUrl, textLength: text.length });
    }

    const links = extractLinks(html, baseUrl);
    for (const link of links) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
      }
    }
  }

  if (allText.length === 0) {
    throw new Error("Could not extract readable content from URL or any linked pages");
  }

  log.info("Crawl complete", { url, pagesProcessed: allText.length });
  return allText.join("\n\n---\n\n");
};
