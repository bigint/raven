"use client";

import { Button } from "@raven/ui";
import { Check, Clipboard } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Copy button for code blocks
// ---------------------------------------------------------------------------

export const CopyButton = ({ text }: { readonly text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <Button
      aria-label={copied ? "Copied" : "Copy code"}
      className="rounded px-1.5 py-0.5 text-xs"
      onClick={handleCopy}
      variant="ghost"
    >
      {copied ? (
        <>
          <Check className="size-3" />
          Copied!
        </>
      ) : (
        <>
          <Clipboard className="size-3" />
          Copy
        </>
      )}
    </Button>
  );
};

// ---------------------------------------------------------------------------
// Code block with syntax highlighting
// ---------------------------------------------------------------------------

export const CodeBlock = ({
  code,
  language
}: {
  readonly code: string;
  readonly language: string;
}) => {
  const displayLang = language || "text";

  return (
    <div className="group/code my-2 overflow-hidden rounded-lg border border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {displayLang}
        </span>
        <CopyButton text={code} />
      </div>
      {language ? (
        <Highlight code={code} language={language} theme={themes.nightOwl}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="overflow-x-auto p-3 text-xs font-mono leading-relaxed">
              <code>
                {tokens.map((line, i) => (
                  <div {...getLineProps({ line })} key={i}>
                    {line.map((token, j) => (
                      <span {...getTokenProps({ token })} key={j} />
                    ))}
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      ) : (
        <pre className="overflow-x-auto p-3 text-xs font-mono leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};
