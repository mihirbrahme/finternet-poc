import type { AgentAuditEvent, AgentAuditEventType } from "./types.js";

export class InMemoryAgentAuditLog {
  private sequence = 1;
  private readonly events: AgentAuditEvent[] = [];

  append(input: {
    agentRunId: string;
    type: AgentAuditEventType;
    at: string;
    payload: Record<string, unknown>;
  }): AgentAuditEvent {
    const event: AgentAuditEvent = {
      eventId: `AUD-${String(this.sequence++).padStart(6, "0")}`,
      agentRunId: input.agentRunId,
      type: input.type,
      at: input.at,
      payload: sanitizePayload(input.payload)
    };
    this.events.push(event);
    return event;
  }

  list(agentRunId?: string): AgentAuditEvent[] {
    const events = agentRunId ? this.events.filter((event) => event.agentRunId === agentRunId) : this.events;
    return events.map((event) => ({
      ...event,
      payload: { ...event.payload }
    }));
  }
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const blockedKeys = new Set(["privateKey", "seedPhrase", "secret", "token"]);
  return sanitizeRecord(payload, blockedKeys);
}

function sanitizeRecord(record: Record<string, unknown>, blockedKeys: Set<string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !blockedKeys.has(key))
      .map(([key, value]) => [key, sanitizeValue(value, blockedKeys)])
  ) as Record<string, unknown>;
}

function sanitizeValue(value: unknown, blockedKeys: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, blockedKeys));
  }

  if (value && typeof value === "object") {
    return sanitizeRecord(value as Record<string, unknown>, blockedKeys);
  }

  return value;
}
