import { toRavenError } from "./errors";
import { formatRequest, getProxyPath, parseBufferedResponse } from "./format";
import { TextStreamResult } from "./stream";
import type { GenerateParams, RavenClientOptions, TextResult } from "./types";

export class RavenClient {
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: RavenClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.headers = options.headers ?? {};
  }

  async generateText(
    params: GenerateParams,
    signal?: AbortSignal
  ): Promise<TextResult> {
    const path = getProxyPath(params.provider);
    const body = formatRequest(params, false);

    const response = await fetch(`${this.baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...this.headers
      },
      method: "POST",
      signal
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        (errorBody as Record<string, Record<string, string>>)?.error?.message ??
        (errorBody as Record<string, string>)?.message ??
        `Request failed with status ${response.status}`;
      throw toRavenError(message, response.status);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return parseBufferedResponse(data);
  }

  async streamText(
    params: GenerateParams,
    signal?: AbortSignal
  ): Promise<TextStreamResult> {
    const path = getProxyPath(params.provider);
    const body = formatRequest(params, true);
    const abortController = new AbortController();

    if (signal) {
      signal.addEventListener("abort", () => abortController.abort(), {
        once: true
      });
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...this.headers
      },
      method: "POST",
      signal: abortController.signal
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        (errorBody as Record<string, Record<string, string>>)?.error?.message ??
        (errorBody as Record<string, string>)?.message ??
        `Request failed with status ${response.status}`;
      throw toRavenError(message, response.status);
    }

    return new TextStreamResult(response, abortController);
  }
}
