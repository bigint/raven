import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { log } from "../logger";

const DEFAULT_MAX_PAGES = 50;
const FETCH_TIMEOUT = 15_000;
const CRAWL_DELAY_MS = 300;

export interface CrawledPage {
  readonly url: string;
  readonly text: string;
}

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
    log.info("Skipped (fetch failed)", {
      error: err instanceof Error ? err.message : String(err),
      url
    });
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

      if (
        /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|tar|gz|mp4|mp3|woff2?|ttf|eot)$/i.test(
          resolved.pathname
        )
      )
        continue;

      links.push(normalized);
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(links)];
};

/**
 * Crawl a URL and yield pages one at a time.
 * Each page is yielded independently so the caller can process and discard it
 * before moving to the next — keeping memory flat regardless of site size.
 */
export async function* crawlUrl(
  url: string,
  maxPages?: number
): AsyncGenerator<CrawledPage> {
  const MAX_PAGES = maxPages ?? DEFAULT_MAX_PAGES;
  const baseUrl = new URL(url);
  const visited = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];
  const startUrl = url.replace(/\/+$/, "");

  queue.push(startUrl);
  queued.add(startUrl);

  let pagesWithText = 0;

  log.info("Starting crawl", { maxPages: MAX_PAGES, url });

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    log.info("Fetching", {
      queued: queue.length,
      url: currentUrl,
      visited: visited.size
    });

    if (visited.size > 1) {
      await new Promise((r) => setTimeout(r, CRAWL_DELAY_MS));
    }

    const html = await fetchPage(currentUrl);
    if (!html) continue;

    const text = extractText(html);
    if (text && text.length > 50) {
      pagesWithText++;
      log.info("Extracted text", {
        pagesWithText,
        textLength: text.length,
        url: currentUrl
      });
      yield { text: `[Source: ${currentUrl}]\n${text}`, url: currentUrl };
    } else {
      log.info("No readable content", {
        textLength: text?.length ?? 0,
        url: currentUrl
      });
    }

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
      log.info("Discovered links", {
        from: currentUrl,
        newLinks,
        totalQueued: queue.length
      });
    }
  }

  log.info("Crawl complete", {
    pagesVisited: visited.size,
    pagesWithText,
    url
  });
}

/** Legacy single-string API — kept for non-worker callers */
export const parseUrl = async (
  url: string,
  maxPages?: number
): Promise<string> => {
  const parts: string[] = [];
  for await (const page of crawlUrl(url, maxPages)) {
    parts.push(page.text);
  }
  if (parts.length === 0) {
    throw new Error(
      "Could not extract readable content from URL or any linked pages"
    );
  }
  return parts.join("\n\n---\n\n");
};
