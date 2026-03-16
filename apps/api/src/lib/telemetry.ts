// OpenTelemetry integration for distributed tracing and metrics export
// Uses standard OTLP protocol for compatibility with Datadog, Grafana, New Relic, etc.

export interface SpanAttributes {
  "raven.model"?: string;
  "raven.provider"?: string;
  "raven.organization_id"?: string;
  "raven.virtual_key_id"?: string;
  "raven.input_tokens"?: number;
  "raven.output_tokens"?: number;
  "raven.cost"?: number;
  "raven.cache_hit"?: boolean;
  "raven.cache_type"?: string;
  "raven.guardrail_triggered"?: boolean;
  "raven.fallback_used"?: boolean;
  "raven.latency_ms"?: number;
  "raven.status_code"?: number;
  "raven.error"?: string;
  "raven.task_type"?: string;
  "raven.routing_strategy"?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface Span {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes;
  status: "ok" | "error" | "unset";
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
}

// Generate random hex IDs
const randomHex = (bytes: number): string => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

class TelemetryCollector {
  private spans: Span[] = [];
  private enabled = false;
  private exportEndpoint: string | null = null;
  private exportHeaders: Record<string, string> = {};
  private serviceName = "raven-gateway";
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  init(config: {
    enabled?: boolean;
    endpoint?: string;
    headers?: Record<string, string>;
    serviceName?: string;
    flushIntervalMs?: number;
  }) {
    this.enabled = config.enabled ?? false;
    this.exportEndpoint = config.endpoint ?? null;
    this.exportHeaders = config.headers ?? {};
    this.serviceName = config.serviceName ?? "raven-gateway";

    if (this.enabled && this.exportEndpoint) {
      const interval = config.flushIntervalMs ?? 10000;
      this.flushInterval = setInterval(() => void this.flush(), interval);
    }
  }

  startSpan(name: string, parentSpanId?: string): Span {
    const span: Span = {
      attributes: {},
      events: [],
      name,
      parentSpanId,
      spanId: randomHex(8),
      startTime: Date.now(),
      status: "unset",
      traceId: randomHex(16)
    };
    return span;
  }

  endSpan(span: Span, status: "ok" | "error" = "ok") {
    span.endTime = Date.now();
    span.status = status;
    if (this.enabled) {
      this.spans.push(span);
    }
  }

  addEvent(span: Span, name: string, attributes?: Record<string, unknown>) {
    span.events.push({ attributes, name, timestamp: Date.now() });
  }

  // Convert to OTLP JSON format
  private toOTLP(): Record<string, unknown> {
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              {
                key: "service.name",
                value: { stringValue: this.serviceName }
              },
              { key: "service.version", value: { stringValue: "1.0.0" } }
            ]
          },
          scopeSpans: [
            {
              scope: { name: "raven-gateway" },
              spans: this.spans.map((span) => ({
                attributes: Object.entries(span.attributes)
                  .filter(([, v]) => v !== undefined)
                  .map(([key, value]) => ({
                    key,
                    value:
                      typeof value === "string"
                        ? { stringValue: value }
                        : typeof value === "number"
                          ? { intValue: String(Math.floor(value)) }
                          : typeof value === "boolean"
                            ? { boolValue: value }
                            : { stringValue: String(value) }
                  })),
                endTimeUnixNano: String(
                  (span.endTime ?? Date.now()) * 1_000_000
                ),
                events: span.events.map((e) => ({
                  attributes: Object.entries(e.attributes ?? {}).map(
                    ([key, value]) => ({
                      key,
                      value: { stringValue: String(value) }
                    })
                  ),
                  name: e.name,
                  timeUnixNano: String(e.timestamp * 1_000_000)
                })),
                kind: 2, // SERVER
                name: span.name,
                parentSpanId: span.parentSpanId ?? "",
                spanId: span.spanId,
                startTimeUnixNano: String(span.startTime * 1_000_000),
                status: {
                  code:
                    span.status === "ok" ? 1 : span.status === "error" ? 2 : 0
                },
                traceId: span.traceId
              }))
            }
          ]
        }
      ]
    };
  }

  async flush(): Promise<void> {
    if (!this.enabled || !this.exportEndpoint || this.spans.length === 0)
      return;

    const payload = this.toOTLP();
    const spans = this.spans.splice(0);

    try {
      const response = await fetch(this.exportEndpoint, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          ...this.exportHeaders
        },
        method: "POST"
      });

      if (!response.ok) {
        console.error(
          `OTLP export failed: ${response.status} ${response.statusText}`
        );
        // Re-queue spans on failure (up to a limit)
        if (this.spans.length < 10000) {
          this.spans.push(...spans);
        }
      }
    } catch (err) {
      console.error("OTLP export error:", err);
      if (this.spans.length < 10000) {
        this.spans.push(...spans);
      }
    }
  }

  shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    void this.flush();
  }
}

export const telemetry = new TelemetryCollector();

// Convenience: trace a proxy request
export const traceProxyRequest = (attributes: SpanAttributes): Span => {
  const span = telemetry.startSpan("proxy.request");
  span.attributes = { ...span.attributes, ...attributes };
  return span;
};
