"use client";

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: code blocks, inline code, bold, italic, lists, line breaks.
 * No external dependencies. All content is escaped before rendering.
 */

import type { ReactNode } from "react";

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

    // Bold
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      result.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      result.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text (up to next special char)
    const nextSpecial = remaining.search(/[`*]/);
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

const Markdown = ({ content }: { content: string }) => {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] as string;

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]?.startsWith("```")) {
        codeLines.push(lines[i] as string);
        i++;
      }
      i++;
      elements.push(
        <pre
          className="my-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs font-mono"
          key={`code-${elements.length}`}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
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
};

export { Markdown };
