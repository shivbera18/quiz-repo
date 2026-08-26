# Tech Stack

The Quiz Platform is a modern, event-driven microservices architecture managed as a Turborepo monorepo. Here is a detailed breakdown of the technologies used:

## 1. Frontend
* **Next.js 15 (App Router)**: The core framework for the frontend, providing React 18 capabilities, Server Components, and optimized routing.
* **React 18**: Used for building reusable UI components.
* **Tailwind CSS & Shadcn/ui**: For highly customizable, utility-first styling and accessible, pre-built components (buttons, modals, forms).
* **Framer Motion**: For smooth page transitions and micro-animations.
* **TypeScript**: Provides static typing across the entire frontend for better developer experience and bug prevention.

## 2. Backend (Microservices)
* **Node.js (v22)**: The runtime for all backend services.
* **Fastify**: High-performance web framework used across all microservices (`gateway`, `identity`, `catalog`, `assessment`, `analytics`, `notification`).
* **Prisma ORM**: Type-safe database access. Each service maintains its own Prisma schema and client to ensure database decoupling.
* **Zod**: Used heavily in the `packages/contracts` layer for runtime payload validation and DTO (Data Transfer Object) definitions.

## 3. Data & Storage
* **PostgreSQL (v16)**: The primary relational database. While it's a single instance, it uses a *schema-per-service* pattern (each service gets its own schema and restricted role) to enforce microservice boundaries without the overhead of 5 separate DB servers.
* **Redis**: Used for high-speed caching, rate limiting (via Fastify plugins in the gateway), and real-time leaderboards.
* **MinIO (S3-Compatible)**: Object storage used for handling CSV exports and media uploads.

## 4. Messaging & Event-Driven Architecture
* **Kafka (via Redpanda)**: Handles asynchronous communication between services (Event-Carried State Transfer). E.g., when a quiz is completed in the `assessment-svc`, it fires an event to Kafka, which the `analytics-svc` consumes to update leaderboards and the `notification-svc` consumes to alert the user.
* **Transactional Outbox Pattern**: Implemented in `packages/kafka-kit` for at-least-once event delivery -- the outbox row commits atomically with the domain write, and a publisher claims batches with `FOR UPDATE SKIP LOCKED`, sends to Kafka, and marks them published inside one transaction. Consumers deduplicate on `eventId`, so redelivery after a crash is safe.

## 5. Tooling & Infrastructure
* **Turborepo**: Manages the monorepo, providing intelligent caching and parallel execution for builds, linting, and testing.
* **pnpm**: Fast, disk-space efficient package manager used workspaces.
* **Docker & Docker Compose**: Containerizes all 11+ services and infrastructure components for local development (`infra/docker-compose.yml`) and production deployments.
* **GitHub Actions**: CI/CD pipelines for linting, testing, and automated deployment (e.g., to EC2/VPS).

## 6. Testing & Observability
* **Vitest**: Fast unit testing framework.
* **Playwright**: End-to-end (E2E) testing for critical user flows.
* **Pino**: High-performance structured logging.
* **Trace-ID propagation** (no OpenTelemetry yet): request-scoped `x-trace-id` is generated/propagated across the API Gateway and downstream services and injected into pino logs (`packages/observability`). Full OTel spans/exporters are not implemented.
