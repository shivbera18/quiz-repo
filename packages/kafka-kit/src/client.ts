import { Kafka, logLevel, type Producer } from "kafkajs"

export function isKafkaDisabled(): boolean {
  const brokers = process.env.KAFKA_BROKERS
  if (process.env.DISABLE_KAFKA === "true") return true
  if (process.env.DISABLE_KAFKA === "false") return false
  if (brokers === "disabled" || brokers === "memory://" || brokers === "") return true
  // For local dev without Docker: no explicit brokers and not in production -> use no-op
  // This makes `pnpm dev` work without a running Redpanda; Docker sets KAFKA_BROKERS=redpanda:9092
  if (!process.env.KAFKA_BROKERS && process.env.NODE_ENV !== "production") return true
  return false
}

export function createKafka(clientId: string, brokers = (process.env.KAFKA_BROKERS || "localhost:19092").split(",")) {
  if (isKafkaDisabled()) {
    // Return a minimal mock that satisfies the Kafka interface for producers
    // Consumers will check isKafkaDisabled() before connecting
    return {
      producer: () => createNoopProducer(),
      consumer: () => ({
        connect: async () => {},
        subscribe: async () => {},
        run: async () => {},
        disconnect: async () => {},
      }),
    } as unknown as Kafka
  }
  return new Kafka({
    clientId,
    brokers,
    logLevel: logLevel.WARN,
    retry: {
      initialRetryTime: 300,
      retries: 15,
    },
  })
}

function createNoopProducer(): Producer {
  return {
    connect: async () => {},
    disconnect: async () => {},
    send: async () => [{ topicName: "", partition: 0, errorCode: 0, baseOffset: "0", logAppendTime: "-1", logStartOffset: "0" }],
    sendBatch: async () => [],
  } as unknown as Producer
}

let sharedProducer: Producer | null = null
let sharedNoopProducer: Producer | null = null

// One producer per process, reused across calls -- kafkajs producers are
// expensive to create and are explicitly designed to be long-lived.
export async function getProducer(kafka: Kafka): Promise<Producer> {
  if (isKafkaDisabled()) {
    if (!sharedNoopProducer) {
      sharedNoopProducer = createNoopProducer()
      console.warn("[kafka-kit] Kafka disabled (DISABLE_KAFKA=true or no KAFKA_BROKERS) - using no-op producer. Events will not be published, analytics/realtime features degraded.")
    }
    return sharedNoopProducer
  }
  if (!sharedProducer) {
    sharedProducer = kafka.producer({
      idempotent: true,
      // acks=all + idempotent producer -- see ARCHITECTURE.md's delivery
      // semantics note: Kafka is not the system of record, but a produced
      // record still shouldn't silently vanish on a broker hiccup.
      maxInFlightRequests: 5,
    })
    try {
      await sharedProducer.connect()
    } catch (err) {
      // For local dev without Kafka, don't crash the service - fallback to noop
      if (process.env.KAFKA_FALLBACK_NOOP === "true" || process.env.NODE_ENV !== "production") {
        console.warn("[kafka-kit] Failed to connect to Kafka, falling back to no-op producer:", (err as Error).message)
        sharedProducer = createNoopProducer()
        return sharedProducer
      }
      throw err
    }
  }
  return sharedProducer
}

export function isKafkaAvailable(): boolean {
  return !isKafkaDisabled()
}
