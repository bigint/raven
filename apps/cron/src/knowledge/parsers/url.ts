import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { log } from "../logger";

const DEFAULT_MAX_PAGES = 50;
const FETCH_TIMEOUT = 15_000;

const fetchPage = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RavenBot/1.0 (Knowledge RAG Ingestion)"
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT)
    });

    if (!response.ok) {
      log.info("Skipped (HTTP error)", { url, status: response.status });
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      log.info("Skipped (non-HTML)", { url, contentType });
      return null;
    }

    return response.text();
  } catch (err) {
    log.info("Skipped (fetch failed)", { url, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
};

const extractText = (html: string): string | null => {
  const window = parseHTML(html);
  const doc = (window as unknown as Record<string, unknown>).document;
  const reader = new Readability(
    doc as ConstructorParameters<typeof Readability>[0]
  );
  const article = reader.parse();
  return article?.textContent?.trim() || null;
};

const extractLinks = (html: string, baseUrl: URL): string[] => {
  const window = parseHTML(html);
  const doc = (window as unknown as Record<string, unknown>)
    .document as unknown as {
    querySelectorAll: (s: string) => { href?: string }[];
  };

  const anchors = doc.querySelectorAll("a[href]");
  const links: string[] = [];

  for (const a of anchors) {
    try {
      const href = a.href;
      if (!href) continue;

      const resolved = new URL(href, baseUrl);
      // Same origin only
      if (resolved.origin !== baseUrl.origin) continue;
      // Skip fragments, mailto, tel, javascript
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
        continue;

      // Normalize: remove fragment, trailing slash
      resolved.hash = "";
      const normalized = resolved.href.replace(/\/+$/, "");

      // Skip non-page resources
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|tar|gz|mp4|mp3|woff2?|ttf|eot)$/i.test(resolved.pathname))
        continue;

      links.push(normalized);
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(links)];
};

export const parseUrl = async (url: string, maxPages?: number): Promise<string> => {
  const MAX_PAGES = maxPages ?? DEFAULT_MAX_PAGES;
  const baseUrl = new URL(url);
  const visited = new Set<string>();
  const queue: string[] = [url.replace(/\/+$/, "")];
  const allText: string[] = [];

  log.info("Starting crawl", { url, maxPages: MAX_PAGES });

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    log.info("Fetching", { url: currentUrl, visited: visited.size, queued: queue.length });

    const html = await fetchPage(currentUrl);
    if (!html) continue;

    const text = extractText(html);
    if (text && text.length > 50) {
      allText.push(`[Source: ${currentUrl}]\n${text}`);
      log.info("Extracted text", { url: currentUrl, textLength: text.length, pagesWithText: allText.length });
    } else {
      log.info("No readable content", { url: currentUrl, textLength: text?.length ?? 0 });
    }

    const links = extractLinks(html, baseUrl);
    let newLinks = 0;
    for (const link of links) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
        newLinks++;
      }
    }
    if (newLinks > 0) {
      log.info("Discovered links", { from: currentUrl, newLinks, totalQueued: queue.length });
    }
  }

  if (allText.length === 0) {
    throw new Error("Could not extract readable content from URL or any linked pages");
  }

  log.info("Crawl complete", { url, pagesVisited: visited.size, pagesWithText: allText.length, totalChars: allText.reduce((s, t) => s + t.length, 0) });
  return allText.join("\n\n---\n\n");
};
