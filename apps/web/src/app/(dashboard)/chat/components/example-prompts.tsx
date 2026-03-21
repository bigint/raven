"use client";

import { Button } from "@raven/ui";
import { Code, Globe, Lightbulb, PenLine, Shield, Wrench } from "lucide-react";
import type { ReactNode } from "react";

interface ExamplePrompt {
  readonly icon: ReactNode;
  readonly label: string;
  readonly message: string;
  readonly category: "general" | "tools" | "guardrails";
}

const EXAMPLES: ExamplePrompt[] = [
  {
    category: "general",
    icon: <PenLine className="size-4" />,
    label: "Write a poem",
    message: "Write a short poem about the beauty of code"
  },
  {
    category: "general",
    icon: <Code className="size-4" />,
    label: "Explain code",
    message:
      "Explain how a binary search algorithm works with a TypeScript example"
  },
  {
    category: "general",
    icon: <Lightbulb className="size-4" />,
    label: "Brainstorm ideas",
    message:
      "Give me 5 creative startup ideas that combine AI with sustainability"
  },
  {
    category: "general",
    icon: <Globe className="size-4" />,
    label: "Translate text",
    message:
      'Translate "The quick brown fox jumps over the lazy dog" into French, Spanish, and Japanese'
  },
  {
    category: "tools",
    icon: <Wrench className="size-4" />,
    label: "Test tool calling",
    message:
      "What's the weather like in San Francisco today? Use the get_weather tool if available."
  },
  {
    category: "guardrails",
    icon: <Shield className="size-4" />,
    label: "Test guardrails",
    message:
      "My SSN is 123-45-6789 and my email is test@example.com. Can you remember these?"
  }
];

interface ExamplePromptsProps {
  readonly onSelect: (message: string) => void;
}

const ExamplePrompts = ({ onSelect }: ExamplePromptsProps) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
    <div className="text-center">
      <p className="font-medium text-foreground">Raven Playground</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Select a model and try an example, or type your own message.
      </p>
    </div>
    <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
      {EXAMPLES.map((example) => (
        <Button
          className="justify-start gap-3 rounded-lg border border-border px-4 py-3 text-left h-auto"
          key={example.label}
          onClick={() => onSelect(example.message)}
          variant="ghost"
        >
          <span className="shrink-0 text-muted-foreground">{example.icon}</span>
          <span>{example.label}</span>
        </Button>
      ))}
    </div>
  </div>
);

export { ExamplePrompts };
