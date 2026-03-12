import type { ProviderAdapter } from "./providers/registry";

const HOP_BY_HOP_HEADERS = new Set([
  "authorization",
  "host",
  "connection",
  "transfer-encoding"
]);

export interface ForwardRequestInput {
  adapter: ProviderAdapter;
  decryptedApiKey: string;
  upstreamPath: string;
  method: string;
  rawUrl: string;
  incomingHeaders: Record<string, string>;
  body: string | undefined;
}

export interface ForwardRequestResult {
  response: Response;
  requestBody: Record<string, unknown>;
  requestedModel: string;
  isStreaming: boolean;
}

export const forwardRequest = async (
  input: ForwardRequestInput
): Promise<ForwardRequestResult> => {
  const { adapter, decryptedApiKey, upstreamPath, method, rawUrl, incomingHeaders, body } = input;

  const queryString = rawUrl.includes("?")
    ? rawUrl.split("?").slice(1).join("?")
    : "";
  const upstreamUrl = `${adapter.baseUrl}${upstreamPath}${queryString ? `?${queryString}` : ""}`;

  const filteredHeaders = Object.fromEntries(
    Object.entries(incomingHeaders).filter(
      ([k]) => !HOP_BY_HOP_HEADERS.has(k.toLowerCase())
    )
  );

  const upstreamHeaders = adapter.transformHeaders(
    decryptedApiKey,
    filteredHeaders
  );

  let requestBody: Record<string, unknown> = {};
  if (body) {
    try {
      requestBody = JSON.parse(body);
    } catch {
      requestBody = {};
    }
  }

  const requestedModel = (requestBody.model as string) ?? "unknown";
  const isStreaming = requestBody.stream === true;

  const response = await fetch(upstreamUrl, {
    body: body ?? undefined,
    headers: upstreamHeaders,
    method
  });

  return { isStreaming, requestBody, requestedModel, response };
};
