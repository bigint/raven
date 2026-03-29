import { log } from "../logger";

const DEFAULT_MAX_PAGES = 50;
const FETCH_TIMEOUT = 15_000;
const CRAWL_DELAY_MS = 300;
const MAX_HTML_BYTES = 512 * 1024;

export interface CrawledPage {
  readonly url: string;
  readonly text: string;
}

/** Strip HTML tags and decode common entities — no DOM parsing needed */
const htmlToText = (html: string): string => {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  cleaned = cleaned
    .replace(
      /<\/?(p|div|br|h[1-6]|li|tr|blockquote|section|article)[^>]*>/gi,
      "\n"
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
};

const extractTitle = (html: string): string | null => {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
};

/** Extract same-origin links using regex — no DOM needed */
const extractLinks = (html: string, baseUrl: URL): string[] => {
  const links: string[] = [];
  const seen = new Set<string>();
  const hrefRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const href = match[1]!;
      if (
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        continue;

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

      if (!seen.has(normalized)) {
        seen.add(normalized);
        links.push(normalized);
      }
    } catch {
      // skip
    }
  }

  return links;
};

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

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_HTML_BYTES) {
      log.info("Skipped (too large)", {
        sizeKB: Math.round(Number.parseInt(contentLength, 10) / 1024),
        url
      });
      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) return null;

    const parts: string[] = [];
    const decoder = new TextDecoder();
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
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } catch (err) {
    log.info("Skipped (fetch failed)", {
      error: err instanceof Error ? err.message : String(err),
      url
    });
    return null;
  }
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

    const text = htmlToText(html);
    const links = extractLinks(html, baseUrl);

    if (text.length > 50) {
      pagesWithText++;
      const title = extractTitle(html);
      const label = title ? `${title} (${currentUrl})` : currentUrl;
      log.info("Extracted text", {
        pagesWithText,
        textLength: text.length,
        url: currentUrl
      });
      yield { text: `[Source: ${label}]\n${text}`, url: currentUrl };
    } else {
      log.info("No readable content", {
        textLength: text.length,
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
