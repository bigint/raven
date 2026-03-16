export interface PromptInjectionResult {
  detected: boolean;
  confidence: number;
  patterns: string[];
}

// Deterministic patterns for prompt injection detection
const INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Direct instruction override attempts
  {
    name: "ignore_previous_instructions",
    pattern:
      /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|prompts?|context|rules?|guidelines?)/i
  },
  {
    name: "disregard_instructions",
    pattern:
      /disregard\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|prompts?|rules?|guidelines?)/i
  },
  {
    name: "forget_everything",
    pattern: /forget\s+(everything|all|anything)\s+(you|that)/i
  },
  {
    name: "new_instructions",
    pattern:
      /(?:your|here are your)\s+new\s+(instructions?|rules?|guidelines?|prompt)/i
  },

  // Identity manipulation
  {
    name: "you_are_now",
    pattern: /you\s+are\s+now\s+(?:a|an|the|acting\s+as|pretending)/i
  },
  {
    name: "act_as",
    pattern: /(?:please\s+)?act\s+as\s+(?:if\s+you\s+(?:are|were)|a|an|the)/i
  },
  {
    name: "pretend_to_be",
    pattern: /pretend\s+(?:to\s+be|you\s+are|that\s+you)/i
  },
  {
    name: "roleplay_jailbreak",
    pattern:
      /(?:enter|switch\s+to|activate)\s+(?:DAN|developer|god|admin|jailbreak|unrestricted)\s+mode/i
  },

  // System prompt extraction
  {
    name: "system_prompt_leak",
    pattern:
      /(?:reveal|show|display|print|output|repeat|tell\s+me)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)/i
  },
  {
    name: "system_prompt_colon",
    pattern: /^system\s*(?:prompt|message)\s*:/im
  },

  // Delimiter injection
  {
    name: "delimiter_injection",
    pattern:
      /(?:```|<\/?(?:system|assistant|user|human|prompt)>|\[(?:SYSTEM|INST)\]|<<\s*SYS\s*>>)/i
  },

  // Instruction boundary breaking
  {
    name: "end_of_prompt",
    pattern:
      /(?:---\s*end\s+of\s+(?:system\s+)?(?:prompt|instructions?)|END_SYSTEM_PROMPT|<\/system>)/i
  },

  // Character encoding attacks
  {
    name: "base64_instruction",
    pattern: /(?:decode|execute|run|eval)\s+(?:this\s+)?(?:base64|b64)\s*[:=]/i
  },

  // Unicode tricks (zero-width characters, homoglyphs)
  {
    name: "zero_width_chars",
    pattern: /(?:\u200B|\u200C|\u200D|\uFEFF|\u2060|\u2061|\u2062|\u2063){3,}/
  },

  // XML/HTML injection attempts
  {
    name: "xml_injection",
    pattern:
      /<(?:script|iframe|object|embed|form|input|meta|link|style|svg|math)\b[^>]*>/i
  },
  {
    name: "html_event_handler",
    pattern: /\bon(?:load|error|click|mouseover|focus|blur)\s*=/i
  },

  // Multi-turn manipulation
  {
    name: "conversation_reset",
    pattern:
      /(?:reset|clear|wipe|erase)\s+(?:your|the|this)\s+(?:conversation|context|memory|chat\s+history)/i
  },

  // Tool/function abuse
  {
    name: "function_injection",
    pattern:
      /(?:call|invoke|execute|run)\s+(?:the\s+)?(?:function|tool|api|command)\s*[:=]/i
  }
];

// Higher-confidence compound patterns (multiple signals in one message)
const COMPOUND_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "ignore_and_do",
    pattern:
      /ignore\s+.*?(?:instead|now|rather)\s+(?:do|say|respond|output|print)/i
  },
  {
    name: "override_with_new",
    pattern:
      /(?:override|replace|overwrite)\s+.*?(?:instructions?|prompt|rules?|system)/i
  }
];

const extractTextFromMessages = (
  messages: Array<Record<string, unknown>>
): string[] => {
  const texts: string[] = [];

  for (const msg of messages) {
    if (typeof msg.content === "string") {
      texts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") {
          texts.push(b.text);
        }
      }
    }
  }

  return texts;
};

export const detectPromptInjection = (
  messages: Array<Record<string, unknown>>
): PromptInjectionResult => {
  const texts = extractTextFromMessages(messages);
  if (texts.length === 0) {
    return { confidence: 0, detected: false, patterns: [] };
  }

  const matchedPatterns: string[] = [];

  for (const text of texts) {
    // Limit text length to prevent ReDoS
    const truncated = text.length > 50_000 ? text.slice(0, 50_000) : text;

    for (const { name, pattern } of INJECTION_PATTERNS) {
      if (pattern.test(truncated) && !matchedPatterns.includes(name)) {
        matchedPatterns.push(name);
      }
    }

    for (const { name, pattern } of COMPOUND_PATTERNS) {
      if (pattern.test(truncated) && !matchedPatterns.includes(name)) {
        matchedPatterns.push(name);
      }
    }
  }

  if (matchedPatterns.length === 0) {
    return { confidence: 0, detected: false, patterns: [] };
  }

  // Calculate confidence based on number and type of matches
  const hasCompound = matchedPatterns.some((p) =>
    COMPOUND_PATTERNS.some((cp) => cp.name === p)
  );
  const baseConfidence = Math.min(matchedPatterns.length * 0.25, 0.8);
  const confidence = hasCompound
    ? Math.min(baseConfidence + 0.2, 1)
    : baseConfidence;

  return {
    confidence: Math.round(confidence * 100) / 100,
    detected: true,
    patterns: matchedPatterns
  };
};
