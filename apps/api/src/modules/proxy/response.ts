const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "transfer-encoding",
  "content-encoding",
  "content-length"
]);

export interface StreamingResponse {
  kind: "streaming";
  response: Response;
  headers: Record<string, string>;
}

export interface BufferedResponse {
  kind: "buffered";
  response: Response;
  headers: Record<string, string>;
  text: string;
  body: Record<string, unknown>;
}

export type ProxyResponse = StreamingResponse | BufferedResponse;

const stripHopByHopHeaders = (
  upstreamResponse: Response
): Record<string, string> => {
  const headers: Record<string, string> = {};
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  return headers;
};

export const buildResponse = async (
  upstreamResponse: Response,
  isStreaming: boolean
): Promise<ProxyResponse> => {
  const headers = stripHopByHopHeaders(upstreamResponse);

  if (isStreaming && upstreamResponse.body) {
    return { headers, kind: "streaming", response: upstreamResponse };
  }

  const text = await upstreamResponse.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }

  return { body, headers, kind: "buffered", response: upstreamResponse, text };
};
