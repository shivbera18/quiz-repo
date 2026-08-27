import { Kafka, logLevel, type Producer } from "kafkajs"

export function createKafka(clientId: string, brokers = (process.env.KAFKA_BROKERS || "localhost:19092").split(",")) {
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

let sharedProducer: Producer | null = null

// One producer per process, reused across calls -- kafkajs producers are
// expensive to create and are explicitly designed to be long-lived.
export async function getProducer(kafka: Kafka): Promise<Producer> {
  if (!sharedProducer) {
    sharedProducer = kafka.producer({
      idempotent: true,
      // acks=all + idempotent producer -- see ARCHITECTURE.md's delivery
      // semantics note: Kafka is not the system of record, but a produced
      // record still shouldn't silently vanish on a broker hiccup.
      maxInFlightRequests: 5,
    })
    await sharedProducer.connect()
  }
  return sharedProducer
}
