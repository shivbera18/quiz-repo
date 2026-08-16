---
name: contracts-and-events
description: Design or change shared Zod DTOs, Kafka event schemas, topics, producers, consumers, and transactional outbox behavior. Use whenever an API payload or asynchronous message crosses app or service boundaries.
---

# Contracts and Events

Treat `packages/contracts` as the source of truth for data crossing boundaries.

## Relevant areas

- `packages/contracts/src/dto/`: API request/response schemas.
- `packages/contracts/src/events/`: event envelope, event schemas, and topics.
- `packages/kafka-kit/`: Kafka client, consumers, and outbox helpers.
- Service `outbox-store.ts` files: transactionally persisted events.
- Worker/consumer files in catalog, analytics, assessment, and notification.

## Workflow

1. Find every producer, consumer, HTTP caller, handler, and test for the shape being changed.
2. Update the Zod schema and inferred TypeScript type together; export it from the package index where needed.
3. Prefer backward-compatible evolution: optional/defaulted additive fields before required or renamed fields.
4. For a breaking event change, introduce a versioned event name/schema and support migration explicitly.
5. Produce events in the same database transaction as the domain write using the existing outbox pattern.
6. Parse and validate messages at the consumer boundary before side effects.
7. Make consumers idempotent. Assume duplicate delivery, retries, delayed delivery, and out-of-order events.
8. Update all producers, consumers, fixtures, and documentation before declaring completion.

## Event checklist

- Stable event ID and event type.
- Occurrence timestamp and schema/version strategy.
- Aggregate/entity identifiers needed by consumers.
- No secrets, passwords, tokens, or unnecessary personal data.
- Correlation/trace metadata preserved where supported.
- Retry behavior does not duplicate notifications, rollups, or exports.
- Poison messages fail observably rather than being silently ignored.

## Guardrails

- Do not publish Kafka messages directly after a database commit when loss between commit and publish is possible; use the outbox.
- Do not import service-internal Prisma models as public contracts.
- Do not casually rename topic constants or consumer group IDs; that can replay or strand data.
- Keep contracts transport-oriented and avoid embedding service implementation details.

## Verification

```bash
pnpm --filter @quiz/contracts typecheck
pnpm --filter @quiz/kafka-kit typecheck
pnpm --filter <producer-package> typecheck
pnpm --filter <consumer-package> typecheck
```

Add focused schema and idempotency tests where test infrastructure exists. Report compatibility assumptions and all producers/consumers reviewed.
