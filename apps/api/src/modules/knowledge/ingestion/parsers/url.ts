import { log } from "@/lib/logger";

const DEFAULT_MAX_PAGES = 50;
const FETCH_TIMEOUT = 15_000;
const CRAWL_DELAY_MS = 300;
const MAX_HTML_BYTES = 512 * 1024;

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

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_HTML_BYTES)
      return null;

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
        return null;
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } catch {
    return null;
  }
};

export const parseUrl = async (
  url: string,
  maxPages?: number
): Promise<string> => {
  const MAX_PAGES = maxPages ?? DEFAULT_MAX_PAGES;
  const baseUrl = new URL(url);
  const visited = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];
  const startUrl = url.replace(/\/+$/, "");

  queue.push(startUrl);
  queued.add(startUrl);

  const allText: string[] = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const currentUrl = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    if (visited.size > 1) {
      await new Promise((r) => setTimeout(r, CRAWL_DELAY_MS));
    }

    const html = await fetchPage(currentUrl);
    if (!html) continue;

    const text = htmlToText(html);
    const links = extractLinks(html, baseUrl);

    if (text.length > 50) {
      const title = extractTitle(html);
      const label = title ? `${title} (${currentUrl})` : currentUrl;
      allText.push(`[Source: ${label}]\n${text}`);
      log.info("Crawled page", { textLength: text.length, url: currentUrl });
    }

    for (const link of links) {
      if (!visited.has(link) && !queued.has(link)) {
        queue.push(link);
        queued.add(link);
      }
    }
  }

  if (allText.length === 0) {
    throw new Error(
      "Could not extract readable content from URL or any linked pages"
    );
  }

  log.info("Crawl complete", {
    pagesVisited: visited.size,
    pagesWithText: allText.length,
    url
  });
  return allText.join("\n\n---\n\n");
};
