"use client";

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: code blocks (with syntax highlighting + copy), inline code,
 * bold, italic, strikethrough, links, blockquotes, horizontal rules,
 * tables, lists, headings, line breaks.
 * No heavy markdown-to-AST library. All content is escaped before rendering.
 */

import { memo, type ReactNode } from "react";
import { CodeBlock } from "./code-block";

const SAFE_URL_RE = /^(https?:|mailto:)/i;

const isSafeHref = (url: string): boolean => {
  try {
    const trimmed = url.trim();
    return SAFE_URL_RE.test(trimmed);
  } catch {
    return false;
  }
};

const parseInline = (text: string): ReactNode[] => {
  const result: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      result.push(
        <code
          className="rounded bg-muted px-1 py-0.5 text-xs font-mono"
          key={key++}
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkText = linkMatch[1] as string;
      const href = linkMatch[2] as string;

      if (isSafeHref(href)) {
        result.push(
          <a
            className="text-primary underline underline-offset-2 hover:text-primary/80"
            href={href}
            key={key++}
            rel="noopener noreferrer"
            target="_blank"
          >
            {linkText}
          </a>
        );
      } else {
        result.push(<span key={key++}>{linkText}</span>);
      }
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Strikethrough ~~text~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      result.push(
        <del className="text-muted-foreground" key={key++}>
          {strikeMatch[1]}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      result.push(
        <strong key={key++}>{parseInline(boldMatch[1] as string)}</strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      result.push(<em key={key++}>{parseInline(italicMatch[1] as string)}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text (up to next special char)
    const nextSpecial = remaining.search(/[`*~[\]]/);
    if (nextSpecial === -1) {
      result.push(remaining);
      break;
    }
    if (nextSpecial === 0) {
      // Special char that didn't match any pattern — treat as plain
      result.push(remaining[0]);
      remaining = remaining.slice(1);
      continue;
    }
    result.push(remaining.slice(0, nextSpecial));
    remaining = remaining.slice(nextSpecial);
  }

  return result;
};

const TABLE_SEPARATOR_RE = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const parseTableRow = (line: string): string[] => {
  // Strip leading/trailing pipes, then split
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
};

const isTableSeparator = (line: string): boolean =>
  TABLE_SEPARATOR_RE.test(line);

const Markdown = memo(function Markdown({
  content
}: {
  readonly content: string;
}) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] as string;

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]?.startsWith("```")) {
        codeLines.push(lines[i] as string);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <CodeBlock
          code={codeLines.join("\n")}
          key={`code-${elements.length}`}
          language={lang}
        />
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule — must be on its own line: ---, ***, or ___
    if (/^([-*_])\1{2,}\s*$/.test(line)) {
      elements.push(
        <hr className="my-3 border-border" key={`hr-${elements.length}`} />
      );
      i++;
      continue;
    }

    // Table detection: current line has |, next line is a separator
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1] as string)
    ) {
      const headers = parseTableRow(line);
      i += 2; // skip header + separator

      const rows: string[][] = [];
      while (
        i < lines.length &&
        (lines[i] as string).includes("|") &&
        (lines[i] as string).trim() !== ""
      ) {
        rows.push(parseTableRow(lines[i] as string));
        i++;
      }

      elements.push(
        <div
          className="my-2 overflow-x-auto rounded-xl border border-border"
          key={`table-${elements.length}`}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {headers.map((h, hi) => (
                  <th
                    className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    key={hi}
                  >
                    {parseInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                  key={ri}
                >
                  {row.map((cell, ci) => (
                    <td className="px-3 py-3" key={ci}>
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote (collect consecutive > lines)
    if (line.startsWith("> ") || line === ">") {
      const quoteLines: string[] = [];
      while (
        i < lines.length &&
        ((lines[i] as string).startsWith("> ") || (lines[i] as string) === ">")
      ) {
        const raw = lines[i] as string;
        quoteLines.push(raw === ">" ? "" : raw.slice(2));
        i++;
      }

      elements.push(
        <blockquote
          className="my-2 border-l-2 border-border pl-3 text-sm text-muted-foreground italic"
          key={`bq-${elements.length}`}
        >
          {quoteLines.map((ql, qi) => (
            <p className="my-0.5 leading-relaxed" key={qi}>
              {parseInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          className="mt-3 mb-1 text-sm font-semibold"
          key={`h-${elements.length}`}
        >
          {parseInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 className="mt-3 mb-1 font-semibold" key={`h-${elements.length}`}>
          {parseInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          className="mt-4 mb-1.5 text-lg font-bold"
          key={`h-${elements.length}`}
        >
          {parseInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i]?.match(/^[-*] /)) {
        items.push((lines[i] as string).slice(2));
        i++;
      }
      elements.push(
        <ul
          className="my-1 list-disc pl-5 space-y-0.5"
          key={`ul-${elements.length}`}
        >
          {items.map((item, j) => (
            <li className="text-sm" key={j}>
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i]?.match(/^\d+\. /)) {
        items.push((lines[i] as string).replace(/^\d+\.\s*/, ""));
        i++;
      }
      elements.push(
        <ol
          className="my-1 list-decimal pl-5 space-y-0.5"
          key={`ol-${elements.length}`}
        >
          {items.map((item, j) => (
            <li className="text-sm" key={j}>
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p className="my-1 text-sm leading-relaxed" key={`p-${elements.length}`}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
});

export { Markdown };
