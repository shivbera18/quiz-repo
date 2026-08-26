import { describe, expect, it, vi } from "vitest"
import { processMessage, type MessageOutcome } from "../src/consumer.js"
import type { EachMessagePayload } from "kafkajs"
import type { EventEnvelope } from "@quiz/contracts"

function makePayload(value: Buffer | null, overrides: Partial<EachMessagePayload> = {}): EachMessagePayload {
  return {
    topic: "quiz.test.v1",
    partition: 0,
    message: { key: Buffer.from("key-1"), value, offset: "42", headers: {} },
    heartbeat: async () => {},
    pause: () => () => {},
    ...overrides,
  } as unknown as EachMessagePayload
}

function makeEnvelope(eventId = "evt-1"): EventEnvelope<{ n: number }> {
  return {
    eventId,
    eventType: "quiz.test.v1",
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    producer: "test",
    data: { n: 1 },
  }
}

const OK_VALUE = Buffer.from(JSON.stringify(makeEnvelope()))

function baseArgs(overrides: Record<string, unknown> = {}) {
  return {
    groupId: "test-group",
    store: { hasProcessed: vi.fn().mockResolvedValue(false) },
    onMessage: vi.fn().mockResolvedValue(undefined),
    dlq: { enabled: true, maxRetries: 2, retryBackoffMs: 1 },
    produceToDlq: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("processMessage failure policy", () => {
  it("skips tombstones (null value) without touching the handler or DLQ", async () => {
    const args = baseArgs()
    const outcome = await processMessage(makePayload(null), args)
    expect(outcome).toBe("skipped-tombstone")
    expect(args.onMessage).not.toHaveBeenCalled()
    expect(args.produceToDlq).not.toHaveBeenCalled()
  })

  it("delivers tombstones to onTombstone when provided (compacted-topic deletes)", async () => {
    const onTombstone = vi.fn().mockResolvedValue(undefined)
    const args = baseArgs({ onTombstone })

    const outcome = await processMessage(makePayload(null), args)

    expect(outcome).toBe("processed-tombstone")
    expect(onTombstone).toHaveBeenCalledTimes(1)
    const ctx = onTombstone.mock.calls[0][0]
    expect(ctx.topic).toBe("quiz.test.v1")
    expect(ctx.key).toBe("key-1")
    expect(args.onMessage).not.toHaveBeenCalled()
  })

  it("retries then dead-letters a failing tombstone handler", async () => {
    const onTombstone = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("delete failed"))
    const args = baseArgs({ onTombstone }) // maxRetries=2 -> 3 attempts

    const outcome = await processMessage(makePayload(null), args)

    expect(outcome).toBe("dead-lettered-handler-error")
    expect(onTombstone).toHaveBeenCalledTimes(3)
    const record = args.produceToDlq.mock.calls[0][0]
    expect(record.headers["dlq-error"]).toContain("delete failed")
    expect(record.headers["dlq-attempts"]).toBe("3")
  })

  it("dead-letters an unparsable value with the RAW bytes and dlq metadata headers", async () => {
    const raw = Buffer.from("{not json")
    const args = baseArgs()
    const outcome = await processMessage(makePayload(raw), args)

    expect(outcome).toBe("dead-lettered-parse-error")
    expect(args.onMessage).not.toHaveBeenCalled()
    expect(args.produceToDlq).toHaveBeenCalledTimes(1)
    const record = args.produceToDlq.mock.calls[0][0]
    expect(record.topic).toBe("quiz.test.v1.dlq")
    expect(record.value).toBe(raw) // exact original bytes preserved
    expect(record.headers["dlq-original-topic"]).toBe("quiz.test.v1")
    expect(record.headers["dlq-original-offset"]).toBe("42")
    expect(record.headers["dlq-error"]).toBeTruthy()
  })

  it("drops an unparsable value without throwing when the DLQ publish itself fails", async () => {
    const args = baseArgs({ produceToDlq: vi.fn().mockRejectedValue(new Error("broker down")) })
    const outcome = await processMessage(makePayload(Buffer.from("garbage")), args)
    expect(outcome).toBe("dropped-parse-error")
  })

  it("drops an unparsable value without throwing when DLQ is disabled", async () => {
    const args = baseArgs({ dlq: { enabled: false, maxRetries: 2, retryBackoffMs: 1 } })
    const outcome = await processMessage(makePayload(Buffer.from("garbage")), args)
    expect(outcome).toBe("dropped-parse-error")
  })

  it.each([
    ["a bare number", Buffer.from("5")],
    ["a bare string", JSON.stringify("hello")],
    ["null", Buffer.from("null")],
    ["an array", JSON.stringify([1, 2, 3])],
  ])("dead-letters syntactically-valid JSON that is not an envelope (%s)", async (_label, raw) => {
    const args = baseArgs()
    const payloadBytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
    const outcome = await processMessage(makePayload(payloadBytes), args)

    expect(outcome).toBe("dead-lettered-parse-error")
    expect(args.onMessage).not.toHaveBeenCalled() // would otherwise throw on property access and crash-loop the group
    const record = args.produceToDlq.mock.calls[0][0]
    expect(record.value).toBe(payloadBytes)
    expect(record.headers["dlq-error"]).toContain("not an event envelope")
  })

  it("dead-letters an object missing eventId/eventType/data fields", async () => {
    const args = baseArgs()
    const outcome = await processMessage(makePayload(Buffer.from(JSON.stringify({ foo: "bar" }))), args)
    expect(outcome).toBe("dead-lettered-parse-error")
    expect(args.onMessage).not.toHaveBeenCalled()
  })

  it("records attempt count in the dlq-attempts header after exhausted retries", async () => {
    const args = baseArgs({ onMessage: vi.fn().mockRejectedValue(new Error("boom")) }) // maxRetries=2 -> 3 attempts
    await processMessage(makePayload(OK_VALUE), args)
    const record = args.produceToDlq.mock.calls[0][0]
    expect(record.headers["dlq-attempts"]).toBe("3")
  })

  it("skips duplicates per ProcessedEventStore before invoking the handler", async () => {
    const args = baseArgs({ store: { hasProcessed: vi.fn().mockResolvedValue(true) } })
    const outcome = await processMessage(makePayload(OK_VALUE), args)
    expect(outcome).toBe("skipped-duplicate")
    expect(args.onMessage).not.toHaveBeenCalled()
  })

  it("returns processed on first-try success", async () => {
    const args = baseArgs()
    const outcome = await processMessage(makePayload(OK_VALUE), args)
    expect(outcome).toBe("processed")
    expect(args.onMessage).toHaveBeenCalledTimes(1)
  })

  it("retries a transient handler failure in-process and then succeeds", async () => {
    const onMessage = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("db blip"))
      .mockResolvedValueOnce(undefined)
    const args = baseArgs({ onMessage })

    const outcome = await processMessage(makePayload(OK_VALUE), args)

    expect(outcome).toBe("processed")
    expect(onMessage).toHaveBeenCalledTimes(2)
    expect(args.produceToDlq).not.toHaveBeenCalled()
  })

  it("dead-letters after exhausting retries, preserving original bytes and error header", async () => {
    const onMessage = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("permanent boom"))
    const args = baseArgs({ onMessage }) // maxRetries=2 -> 3 total attempts

    const outcome = await processMessage(makePayload(OK_VALUE), args)

    expect(outcome satisfies MessageOutcome).toBe("dead-lettered-handler-error")
    expect(onMessage).toHaveBeenCalledTimes(3)
    expect(args.produceToDlq).toHaveBeenCalledTimes(1)
    const record = args.produceToDlq.mock.calls[0][0]
    expect(record.value).toBe(OK_VALUE)
    expect(record.headers["dlq-error"]).toContain("permanent boom")
    expect(record.headers["dlq-original-partition"]).toBe("0")
  })

  it("rethrows the ORIGINAL handler error when the DLQ publish also fails (no message loss)", async () => {
    const handlerError = new Error("permanent boom")
    const args = baseArgs({
      onMessage: vi.fn().mockRejectedValue(handlerError),
      produceToDlq: vi.fn().mockRejectedValue(new Error("broker down")),
    })

    await expect(processMessage(makePayload(OK_VALUE), args)).rejects.toBe(handlerError)
  })

  it("rethrows the handler error when DLQ is disabled entirely", async () => {
    const handlerError = new Error("boom")
    const args = baseArgs({
      onMessage: vi.fn().mockRejectedValue(handlerError),
      dlq: { enabled: false, maxRetries: 1, retryBackoffMs: 1 },
      produceToDlq: null,
    })

    await expect(processMessage(makePayload(OK_VALUE), args)).rejects.toBe(handlerError)
    // still retried in-process: 1 + maxRetries
    expect(args.onMessage).toHaveBeenCalledTimes(2)
  })

  it("propagates store.hasProcessed failures so Kafka redelivers (idempotency is safety-critical)", async () => {
    const storeError = new Error("processed_event table unreachable")
    const args = baseArgs({ store: { hasProcessed: vi.fn().mockRejectedValue(storeError) } })

    await expect(processMessage(makePayload(OK_VALUE), args)).rejects.toBe(storeError)
    expect(args.onMessage).not.toHaveBeenCalled()
  })
})
