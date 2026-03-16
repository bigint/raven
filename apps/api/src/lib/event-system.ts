import type { Redis } from "ioredis";

// All event types in the system
export type EventType =
  // Request events
  | "request.started"
  | "request.completed"
  | "request.failed"
  | "request.cached"
  | "request.fallback"
  // Guardrail events
  | "guardrail.triggered"
  | "guardrail.blocked"
  | "guardrail.warned"
  // Policy events
  | "policy.evaluated"
  | "policy.blocked"
  | "policy.updated"
  // Budget events
  | "budget.threshold.reached"
  | "budget.exceeded"
  | "budget.reset"
  // Key events
  | "key.created"
  | "key.revoked"
  | "key.rate_limited"
  | "key.expired"
  // Provider events
  | "provider.health.degraded"
  | "provider.health.recovered"
  | "provider.outage.detected"
  // Model events
  | "model.quality.degraded"
  | "model.version.changed"
  // Agent events
  | "agent.registered"
  | "agent.anomaly.detected"
  | "agent.budget.exceeded"
  | "agent.tool.invoked"
  // Compliance events
  | "compliance.drift.detected"
  | "compliance.audit.generated"
  // Experiment events
  | "experiment.started"
  | "experiment.completed"
  | "experiment.variant.selected";

export interface RavenEvent {
  id: string;
  type: EventType;
  organizationId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata?: {
    agentId?: string;
    model?: string;
    provider?: string;
    requestId?: string;
    teamId?: string;
    virtualKeyId?: string;
  };
}

type EventHandler = (event: RavenEvent) => void | Promise<void>;

class EventSystem {
  private channelPrefix = "raven:events";
  private handlers = new Map<string, Set<EventHandler>>();
  private redis: Redis | null = null;

  init(redis: Redis) {
    this.redis = redis;
  }

  // Subscribe to events
  on(eventType: EventType | "*", handler: EventHandler) {
    const handlers = this.handlers.get(eventType) ?? new Set();
    handlers.add(handler);
    this.handlers.set(eventType, handlers);
  }

  // Unsubscribe
  off(eventType: EventType | "*", handler: EventHandler) {
    this.handlers.get(eventType)?.delete(handler);
  }

  // Emit event
  async emit(event: RavenEvent): Promise<void> {
    // Local handlers
    const typeHandlers = this.handlers.get(event.type) ?? new Set();
    const wildcardHandlers = this.handlers.get("*") ?? new Set();

    const allHandlers = [...typeHandlers, ...wildcardHandlers];
    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Event handler error for ${event.type}:`, err);
      }
    }

    // Publish to Redis for cross-instance communication
    if (this.redis) {
      await this.redis.publish(
        `${this.channelPrefix}:${event.type}`,
        JSON.stringify(event)
      );
    }

    // Store recent events for replay (last 1000 per org)
    if (this.redis) {
      const key = `events:recent:${event.organizationId}`;
      await this.redis.lpush(key, JSON.stringify(event));
      await this.redis.ltrim(key, 0, 999);
      await this.redis.expire(key, 86400); // 24h
    }
  }

  // Get recent events for an org
  async getRecentEvents(
    orgId: string,
    limit: number = 50
  ): Promise<RavenEvent[]> {
    if (!this.redis) return [];
    const raw = await this.redis.lrange(`events:recent:${orgId}`, 0, limit - 1);
    return raw.map((r) => JSON.parse(r) as RavenEvent);
  }

  // Get events by type
  async getEventsByType(
    orgId: string,
    type: EventType,
    limit: number = 50
  ): Promise<RavenEvent[]> {
    const all = await this.getRecentEvents(orgId, 1000);
    return all.filter((e) => e.type === type).slice(0, limit);
  }
}

export const eventSystem = new EventSystem();

// Convenience emitters
export const emitRequestEvent = (
  type:
    | "request.started"
    | "request.completed"
    | "request.failed"
    | "request.cached"
    | "request.fallback",
  orgId: string,
  data: Record<string, unknown>,
  metadata?: RavenEvent["metadata"]
) => {
  return eventSystem.emit({
    data,
    id: crypto.randomUUID(),
    metadata,
    organizationId: orgId,
    timestamp: new Date(),
    type
  });
};

export const emitGuardrailEvent = (
  type: "guardrail.triggered" | "guardrail.blocked" | "guardrail.warned",
  orgId: string,
  data: Record<string, unknown>
) => {
  return eventSystem.emit({
    data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    timestamp: new Date(),
    type
  });
};

export const emitBudgetEvent = (
  type: "budget.threshold.reached" | "budget.exceeded" | "budget.reset",
  orgId: string,
  data: Record<string, unknown>
) => {
  return eventSystem.emit({
    data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    timestamp: new Date(),
    type
  });
};

export const emitProviderEvent = (
  type:
    | "provider.health.degraded"
    | "provider.health.recovered"
    | "provider.outage.detected",
  orgId: string,
  data: Record<string, unknown>
) => {
  return eventSystem.emit({
    data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    timestamp: new Date(),
    type
  });
};

export const emitAgentEvent = (
  type:
    | "agent.registered"
    | "agent.anomaly.detected"
    | "agent.budget.exceeded"
    | "agent.tool.invoked",
  orgId: string,
  data: Record<string, unknown>
) => {
  return eventSystem.emit({
    data,
    id: crypto.randomUUID(),
    organizationId: orgId,
    timestamp: new Date(),
    type
  });
};
