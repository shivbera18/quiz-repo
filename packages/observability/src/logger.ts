import pino from "pino"
import { randomUUID } from "node:crypto"

export function createLogger(serviceName: string) {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
        : undefined,
  })
}

// Lightweight, honest substitute for full OpenTelemetry auto-instrumentation:
// one traceId, generated at the gateway (or wherever a request enters the
// system), carried in the `x-trace-id` header across every service hop, into
// the Kafka envelope's `traceId` field, and logged on every line via child
// loggers. That's what lets you `grep <traceId>` across every service's logs
// and Redpanda Console's message view and follow one request end to end --
// which is the actual demo ARCHITECTURE.md calls out as worth building.
// Wiring real OTel spans/Jaeger auto-instrumentation on top of this is a
// documented follow-up (see HOSTING.md's known-gaps section), not something
// pretended to work here without ever having run it.
export function getOrCreateTraceId(headerValue: string | string[] | undefined): string {
  if (typeof headerValue === "string" && headerValue.length > 0) return headerValue
  return randomUUID()
}

export const TRACE_HEADER = "x-trace-id"
