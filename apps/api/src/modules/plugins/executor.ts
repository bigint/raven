export interface PluginContext {
  metadata: {
    keyId: string;
    model: string;
    orgId: string;
    provider: string;
  };
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
}

export interface PluginResult {
  blockReason?: string;
  blocked?: boolean;
  modified: boolean;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

interface BuiltinPlugin {
  description: string;
  execute: (ctx: PluginContext) => PluginResult;
  hook: "pre_request" | "post_response";
  name: string;
}

const getResponseContent = (
  response: Record<string, unknown>
): string | null => {
  const choices = response.choices as
    | Array<{ message?: { content?: string } }>
    | undefined;
  const content = choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
};

const setResponseContent = (
  response: Record<string, unknown>,
  content: string
): Record<string, unknown> => {
  const newResponse = structuredClone(response);
  const choices = newResponse.choices as Array<{
    message?: { content?: string };
  }>;
  if (choices?.[0]?.message) {
    choices[0].message.content = content;
  }
  return newResponse;
};

export const BUILTIN_PLUGINS: Record<string, BuiltinPlugin> = {
  "pii-redactor": {
    description: "Redacts PII from LLM responses",
    execute: (ctx: PluginContext): PluginResult => {
      if (!ctx.response) return { modified: false };
      const content = getResponseContent(ctx.response);
      if (!content) return { modified: false };

      let redacted = content;
      let modified = false;

      if (
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(redacted)
      ) {
        redacted = redacted.replace(
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
          "[EMAIL REDACTED]"
        );
        modified = true;
      }

      if (/\b\d{3}-\d{2}-\d{4}\b/.test(redacted)) {
        redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN REDACTED]");
        modified = true;
      }

      if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(redacted)) {
        redacted = redacted.replace(
          /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
          "[CARD REDACTED]"
        );
        modified = true;
      }

      if (modified) {
        return {
          modified: true,
          response: setResponseContent(ctx.response, redacted)
        };
      }

      return { modified: false };
    },
    hook: "post_response",
    name: "PII Redactor"
  },

  "response-healing": {
    description: "Automatically fixes malformed JSON in LLM responses",
    execute: (ctx: PluginContext): PluginResult => {
      if (!ctx.response) return { modified: false };
      const content = getResponseContent(ctx.response);
      if (!content) return { modified: false };

      try {
        JSON.parse(content);
        return { modified: false };
      } catch {
        let fixed = content;
        // Remove trailing commas
        fixed = fixed.replace(/,\s*([\]}])/g, "$1");
        // Add missing closing brackets
        const openBraces = (fixed.match(/{/g) ?? []).length;
        const closeBraces = (fixed.match(/}/g) ?? []).length;
        for (let i = 0; i < openBraces - closeBraces; i++) fixed += "}";
        const openBrackets = (fixed.match(/\[/g) ?? []).length;
        const closeBrackets = (fixed.match(/]/g) ?? []).length;
        for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += "]";

        try {
          JSON.parse(fixed);
          return {
            modified: true,
            response: setResponseContent(ctx.response, fixed)
          };
        } catch {
          return { modified: false };
        }
      }
    },
    hook: "post_response",
    name: "Response Healing"
  }
};

export const executePlugins = (
  pluginTypes: string[],
  ctx: PluginContext
): PluginResult => {
  const currentCtx = { ...ctx };
  let wasModified = false;

  for (const pluginType of pluginTypes) {
    const plugin = BUILTIN_PLUGINS[pluginType];
    if (!plugin) continue;

    const result = plugin.execute(currentCtx);

    if (result.blocked) {
      return result;
    }

    if (result.modified) {
      wasModified = true;
      if (result.request) currentCtx.request = result.request;
      if (result.response) currentCtx.response = result.response;
    }
  }

  return {
    modified: wasModified,
    request: currentCtx.request,
    response: currentCtx.response
  };
};
