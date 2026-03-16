export interface InjectionDetectionResult {
  detected: boolean;
  confidence: number;
  layer: string;
  patterns: string[];
  details: string;
}

// Layer 1: Deterministic patterns (< 1ms)
const INJECTION_PATTERNS = [
  // Instruction override
  {
    name: "instruction_override",
    pattern:
      /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules|directives)/i
  },
  {
    name: "instruction_override",
    pattern:
      /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|context)/i
  },
  // Role switching
  {
    name: "role_switch",
    pattern: /you\s+are\s+now\s+(a|an|the)\s+/i
  },
  {
    name: "role_switch",
    pattern: /act\s+as\s+(if\s+you\s+are|a|an)\s+/i
  },
  // System prompt extraction
  {
    name: "system_extraction",
    pattern:
      /(?:reveal|show|print|display|output|repeat)\s+(?:your|the)\s+(?:system|initial|original)\s+(?:prompt|instructions|message)/i
  },
  {
    name: "system_extraction",
    pattern:
      /what\s+(?:is|are)\s+your\s+(?:system|initial|original)\s+(?:prompt|instructions)/i
  },
  // Delimiter attacks
  {
    name: "delimiter_attack",
    pattern: /```\s*system\b/i
  },
  {
    name: "delimiter_attack",
    pattern: /<\/?system>/i
  },
  // Encoding attacks
  {
    name: "encoding_attack",
    pattern: /(?:base64|rot13|hex)\s*(?:decode|encode)/i
  },
  // Jailbreak attempts
  {
    name: "jailbreak",
    pattern: /(?:DAN|do\s+anything\s+now|developer\s+mode|god\s+mode)/i
  },
  {
    name: "jailbreak",
    pattern:
      /(?:pretend|imagine|hypothetically)\s+(?:you\s+have\s+no|there\s+are\s+no)\s+(?:restrictions|rules|limits)/i
  },
  // Prompt leaking
  {
    name: "prompt_leak",
    pattern:
      /(?:beginning|start)\s+of\s+(?:the\s+)?(?:conversation|prompt|system)/i
  },
  {
    name: "prompt_leak",
    pattern:
      /(?:output|print)\s+(?:everything|all)\s+(?:above|before|preceding)/i
  }
];

// Sensitivity thresholds for deterministic pattern matching
const SENSITIVITY_THRESHOLDS = {
  high: 1,
  low: 3,
  medium: 1
} as const;

export const detectPromptInjection = (
  messages: Array<{ role: string; content: unknown }>,
  sensitivity: "low" | "medium" | "high" = "medium"
): InjectionDetectionResult => {
  // Extract text from user messages only
  const textContent = messages
    .filter((m) => m.role === "user")
    .map((m) =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    )
    .join("\n");

  if (!textContent) {
    return {
      confidence: 0,
      details: "No user content to analyze",
      detected: false,
      layer: "none",
      patterns: []
    };
  }

  // Layer 1: Deterministic pattern matching
  const matchedPatterns: string[] = [];
  for (const { name, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(textContent)) {
      matchedPatterns.push(name);
    }
  }

  if (matchedPatterns.length > 0) {
    const confidence = Math.min(0.5 + matchedPatterns.length * 0.15, 0.99);
    const threshold = SENSITIVITY_THRESHOLDS[sensitivity];

    return {
      confidence,
      details: `Matched ${matchedPatterns.length} injection pattern(s)`,
      detected: matchedPatterns.length >= threshold,
      layer: "deterministic",
      patterns: [...new Set(matchedPatterns)]
    };
  }

  // Layer 2: Heuristic analysis — check for unusual instruction density
  const instructionWords = (
    textContent.match(
      /\b(must|always|never|ignore|forget|override|bypass|skip|disable)\b/gi
    ) || []
  ).length;
  const wordCount = textContent.split(/\s+/).length;
  const instructionDensity = wordCount > 0 ? instructionWords / wordCount : 0;

  if (instructionDensity > 0.08 && sensitivity !== "low") {
    return {
      confidence: Math.min(0.6 + instructionDensity, 0.99),
      details: `Instruction word density: ${(instructionDensity * 100).toFixed(1)}%`,
      detected: true,
      layer: "heuristic",
      patterns: ["high_instruction_density"]
    };
  }

  // Layer 2b: Check for suspicious character patterns
  const suspiciousChars =
    (textContent.match(/[<>{}[\]\\|`~^]/g) || []).length / textContent.length;
  if (suspiciousChars > 0.05 && sensitivity === "high") {
    return {
      confidence: 0.4 + suspiciousChars * 2,
      details: `Suspicious character density: ${(suspiciousChars * 100).toFixed(1)}%`,
      detected: true,
      layer: "heuristic",
      patterns: ["suspicious_characters"]
    };
  }

  return {
    confidence: 0,
    details: "No injection detected",
    detected: false,
    layer: "none",
    patterns: []
  };
};
