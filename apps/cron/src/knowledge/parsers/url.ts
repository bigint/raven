import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { log } from "../logger";

const DEFAULT_MAX_PAGES = 50;
const FETCH_TIMEOUT = 15_000;
const MAX_TEXT_BYTES = 10 * 1024 * 1024; // 10MB cap on total extracted text

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

export const parseUrl = async (url: string, maxPages?: number): Promise<string> => {
  const MAX_PAGES = maxPages ?? DEFAULT_MAX_PAGES;
  const baseUrl = new URL(url);
  const visited = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];
  const startUrl = url.replace(/\/+$/, "");

  queue.push(startUrl);
  queued.add(startUrl);

  const resultParts: string[] = [];
  let totalBytes = 0;
  let pagesWithText = 0;

  log.info("Starting crawl", { url, maxPages: MAX_PAGES });

  while (queue.length > 0 && visited.size < MAX_PAGES && totalBytes < MAX_TEXT_BYTES) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    log.info("Fetching", { url: currentUrl, visited: visited.size, queued: queue.length });

    // Polite delay between requests
    if (visited.size > 1) {
      await new Promise((r) => setTimeout(r, 200));
    }

    const html = await fetchPage(currentUrl);
    if (!html) continue;

    const text = extractText(html);
    if (text && text.length > 50) {
      const section = `[Source: ${currentUrl}]\n${text}`;
      resultParts.push(section);
      totalBytes += section.length;
      pagesWithText++;
      log.info("Extracted text", { url: currentUrl, textLength: text.length, pagesWithText, totalKB: Math.round(totalBytes / 1024) });

      // Stop if we've accumulated enough text
      if (totalBytes >= MAX_TEXT_BYTES) {
        log.info("Text size limit reached, stopping crawl", { totalKB: Math.round(totalBytes / 1024) });
        break;
      }
    } else {
      log.info("No readable content", { url: currentUrl, textLength: text?.length ?? 0 });
    }

    // Discover links — use Set for O(1) lookup instead of array.includes
    const links = extractLinks(html, baseUrl);
    let newLinks = 0;
    for (const link of links) {
      if (!visited.has(link) && !queued.has(link)) {
        queue.push(link);
        queued.add(link);
        newLinks++;
      }
    }
    if (newLinks > 0) {
      log.info("Discovered links", { from: currentUrl, newLinks, totalQueued: queue.length });
    }
  }

  if (resultParts.length === 0) {
    throw new Error("Could not extract readable content from URL or any linked pages");
  }

  log.info("Crawl complete", { url, pagesVisited: visited.size, pagesWithText, totalKB: Math.round(totalBytes / 1024) });
  return resultParts.join("\n\n---\n\n");
};
