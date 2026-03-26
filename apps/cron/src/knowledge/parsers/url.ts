import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { log } from "../logger";

const DEFAULT_MAX_PAGES = 50;
const FETCH_TIMEOUT = 15_000;
const CRAWL_DELAY_MS = 300;
const MAX_HTML_BYTES = 512 * 1024; // 512KB max per page — skip bloated pages

export interface CrawledPage {
  readonly url: string;
  readonly text: string;
}

/** Strip heavy tags before DOM parsing to save memory */
const stripHeavyTags = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

const fetchPage = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "Accept-Encoding": "identity",
        "User-Agent": "RavenBot/1.0 (Knowledge RAG Ingestion)"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT)
    });

    if (!response.ok) {
      log.info("Skipped (HTTP error)", { status: response.status, url });
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      log.info("Skipped (non-HTML)", { contentType, url });
      return null;
    }

    // Check content-length header if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_HTML_BYTES) {
      log.info("Skipped (too large)", {
        sizeKB: Math.round(Number.parseInt(contentLength, 10) / 1024),
        url
      });
      return null;
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) return null;

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_HTML_BYTES) {
        reader.cancel();
        log.info("Skipped (body exceeded limit)", {
          sizeKB: Math.round(totalSize / 1024),
          url
        });
        return null;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    return chunks.map((c) => decoder.decode(c, { stream: true })).join("") +
      decoder.decode();
  } catch (err) {
    log.info("Skipped (fetch failed)", {
      error: err instanceof Error ? err.message : String(err),
      url
    });
    return null;
  }
};

/**
 * Parse HTML once, extract both readable text and links.
 * Single DOM parse per page to minimize memory usage.
 */
const parsePage = (
  html: string,
  baseUrl: URL
): { text: string | null; links: string[] } => {
  const cleaned = stripHeavyTags(html);
  const { document: doc } = parseHTML(cleaned) as unknown as {
    document: {
      querySelectorAll: (s: string) => { href?: string }[];
      cloneNode: (deep: boolean) => unknown;
    };
  };

  // Extract links first (before Readability mutates the DOM)
  const links: string[] = [];
  const anchors = doc.querySelectorAll("a[href]");
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
      // skip invalid URLs
    }
  }

  // Extract text using a cloned DOM (Readability mutates it)
  const reader = new Readability(
    doc.cloneNode(true) as ConstructorParameters<typeof Readability>[0]
  );
  const article = reader.parse();
  const text = article?.textContent?.trim() || null;

  return { links: [...new Set(links)], text };
};

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

    // Single DOM parse for both text + links
    const { text, links } = parsePage(html, baseUrl);

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

/** Legacy single-string API */
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
