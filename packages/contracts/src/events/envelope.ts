import { randomUUID } from "node:crypto"

// Shared envelope for every Kafka record in the system. eventId is the
// consumer-side dedupe key (checked against each consumer's own
// processed_event table before an upsert is applied) -- see
// ARCHITECTURE.md's "Kafka topic design" for why idempotent consumers are
// used instead of Kafka exactly-once semantics.
export interface EventEnvelope<T> {
  eventId: string
  eventType: string
  eventVersion: number
  occurredAt: string
  producer: string
  traceId?: string
  data: T
}

export function createEnvelope<T>(
  eventType: string,
  data: T,
  opts: { eventVersion?: number; producer: string; traceId?: string }
): EventEnvelope<T> {
  return {
    eventId: randomUUID(),
    eventType,
    eventVersion: opts.eventVersion ?? 1,
    occurredAt: new Date().toISOString(),
    producer: opts.producer,
    traceId: opts.traceId,
    data,
  }
}
