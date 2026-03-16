/**
 * Simple Prometheus metrics collector.
 * No external dependencies — generates Prometheus text format directly.
 */

interface Counter {
  name: string;
  help: string;
  labels: Record<string, string>;
  value: number;
}

interface Histogram {
  name: string;
  help: string;
  labels: Record<string, string>;
  sum: number;
  count: number;
  buckets: Map<number, number>;
}

class MetricsCollector {
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();

  incrementCounter(
    name: string,
    help: string,
    labels: Record<string, string>,
    value: number = 1
  ) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const existing = this.counters.get(key);
    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { help, labels, name, value });
    }
  }

  observeHistogram(
    name: string,
    help: string,
    labels: Record<string, string>,
    value: number
  ) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const buckets = [
      0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60
    ];
    const existing = this.histograms.get(key);
    if (existing) {
      existing.sum += value;
      existing.count++;
      for (const b of buckets) {
        if (value <= b)
          existing.buckets.set(b, (existing.buckets.get(b) ?? 0) + 1);
      }
    } else {
      const bucketMap = new Map<number, number>();
      for (const b of buckets) {
        bucketMap.set(b, value <= b ? 1 : 0);
      }
      this.histograms.set(key, {
        buckets: bucketMap,
        count: 1,
        help,
        labels,
        name,
        sum: value
      });
    }
  }

  serialize(): string {
    const lines: string[] = [];
    const seenHelp = new Set<string>();

    for (const counter of this.counters.values()) {
      if (!seenHelp.has(counter.name)) {
        lines.push(`# HELP ${counter.name} ${counter.help}`);
        lines.push(`# TYPE ${counter.name} counter`);
        seenHelp.add(counter.name);
      }
      const labelStr = Object.entries(counter.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      lines.push(`${counter.name}{${labelStr}} ${counter.value}`);
    }

    for (const hist of this.histograms.values()) {
      if (!seenHelp.has(hist.name)) {
        lines.push(`# HELP ${hist.name} ${hist.help}`);
        lines.push(`# TYPE ${hist.name} histogram`);
        seenHelp.add(hist.name);
      }
      const labelStr = Object.entries(hist.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      for (const [bucket, count] of hist.buckets) {
        lines.push(`${hist.name}_bucket{${labelStr},le="${bucket}"} ${count}`);
      }
      lines.push(`${hist.name}_bucket{${labelStr},le="+Inf"} ${hist.count}`);
      lines.push(`${hist.name}_sum{${labelStr}} ${hist.sum}`);
      lines.push(`${hist.name}_count{${labelStr}} ${hist.count}`);
    }

    return `${lines.join("\n")}\n`;
  }

  reset() {
    this.counters.clear();
    this.histograms.clear();
  }
}

export const metrics = new MetricsCollector();

// Convenience functions

export const recordRequest = (
  model: string,
  provider: string,
  status: number,
  latencyS: number,
  cost: number
) => {
  metrics.incrementCounter("raven_requests_total", "Total requests", {
    model,
    provider,
    status: String(status)
  });
  metrics.observeHistogram(
    "raven_request_duration_seconds",
    "Request duration in seconds",
    { model, provider },
    latencyS
  );
  metrics.incrementCounter(
    "raven_cost_dollars_total",
    "Total cost in dollars",
    { model, provider },
    cost
  );
};

export const recordTokens = (
  model: string,
  provider: string,
  input: number,
  output: number
) => {
  metrics.incrementCounter(
    "raven_tokens_total",
    "Total tokens processed",
    { direction: "input", model, provider },
    input
  );
  metrics.incrementCounter(
    "raven_tokens_total",
    "Total tokens processed",
    { direction: "output", model, provider },
    output
  );
};

export const recordCacheHit = (type: "exact" | "semantic", model: string) => {
  metrics.incrementCounter("raven_cache_hits_total", "Cache hits", {
    model,
    type
  });
};

export const recordGuardrailTrigger = (rule: string, action: string) => {
  metrics.incrementCounter(
    "raven_guardrail_triggers_total",
    "Guardrail triggers",
    { action, rule }
  );
};

export const recordFallback = (
  fromProvider: string,
  toProvider: string,
  succeeded: boolean
) => {
  metrics.incrementCounter("raven_fallback_total", "Fallback events", {
    from: fromProvider,
    success: String(succeeded),
    to: toProvider
  });
};

export const recordRateLimitExceeded = (keyId: string) => {
  metrics.incrementCounter(
    "raven_rate_limit_exceeded_total",
    "Rate limit exceeded events",
    { key_id: keyId }
  );
};
