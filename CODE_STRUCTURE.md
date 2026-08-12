# Code Structure

This project uses a monorepo structure managed by **Turborepo** and **pnpm workspaces**. The codebase is split into three main directories: `apps` (runnable services), `packages` (shared libraries), and `infra` (deployment and local setup).

## `apps/`
Contains all the deployable frontend and backend applications.

### `apps/web/`
The Next.js 15 frontend application. It contains no direct database logic; all data is fetched via the API Gateway.
* `app/`: Next.js App Router pages (`page.tsx`, `layout.tsx`) and API route handlers (`route.ts`) which act as thin proxies to the backend gateway.
* `components/`: Reusable React components (e.g., UI elements from shadcn, layout wrappers, specific feature components like `FlashQuestions`).
* `lib/`: Utility functions, including `gateway-client.ts` which handles all communication with the backend API Gateway.

### `apps/gateway/`
The Fastify API Gateway. It acts as the single entry point for all frontend requests.
* `src/index.ts`: Bootstraps the server.
* `src/plugins/`: Contains rate-limiting and authentication middleware. It introspects tokens by calling the `identity-svc` before forwarding requests to downstream services.

### `apps/identity/`
Manages users, authentication, and JWT/opaque tokens.
* `prisma/schema.prisma`: The database schema specific to users and sessions.
* `src/routes/`: Login, registration, and token validation endpoints.

### `apps/catalog/`
Manages the core domain models: subjects, quizzes, and the question bank.
* `src/routes/`: Endpoints for CRUD operations on quizzes and questions.
* `src/worker.ts`: A background worker process that listens for "generate quiz" jobs and uses the Google Gemini API to create AI-generated questions.

### `apps/assessment/`
Handles the logic for taking quizzes (attempts, scoring, validation).
* `src/routes/`: Endpoints for starting a quiz attempt and submitting answers. Calculates scores server-side to prevent cheating.
* `src/worker.ts`: An expiry-sweeper worker that automatically closes quiz attempts that have run out of time.

### `apps/analytics/`
Handles reporting, dashboards, leaderboards, and CSV exports.
* `src/worker.ts`: Consumes Kafka events (e.g., `QuizCompleted`) to update read-models and leaderboards asynchronously. Also handles long-running CSV export jobs, uploading the results to MinIO.

### `apps/notification/`
Manages sending alerts and real-time updates (SSE) to users.

---

## `packages/`
Contains shared code used by multiple apps. None of these are deployable on their own.

### `packages/contracts/`
The single source of truth for all data shapes in the system.
* `src/dtos/`: Zod schemas defining API request and response payloads. Used by both the frontend (for form validation) and backend (for request validation).
* `src/events/`: Zod schemas defining the shape of Kafka events (e.g., `QuizAttemptCompletedEvent`).

### `packages/kafka-kit/`
A shared wrapper around `kafkajs`.
* `src/producer.ts` & `src/consumer.ts`: Standardized Kafka connectivity.
* `src/outbox.ts`: Utilities for implementing the Transactional Outbox pattern, ensuring events are reliably published after database transactions.

### `packages/redis-kit/`
Shared Redis utilities.
* `src/client.ts`: Standardized Redis client initialization.
* `src/keys.ts`: Centralized key-name builders to prevent cache key collisions across microservices.

### `packages/observability/`
* `src/logger.ts`: Configures `pino` for structured JSON logging.
* `src/tracing.ts`: Helpers for generating and propagating `x-trace-id` headers across microservice boundaries.

---

## `infra/`
Contains infrastructure-as-code and local development environments.

* `docker-compose.yml`: The main compose file that boots the entire local development environment (Postgres, Redis, Redpanda Kafka, MinIO, plus all 11 Node.js processes).
* `docker-compose.prod.yml`: Production overrides for deployment (e.g., adding a Caddy reverse proxy for SSL).
* `postgres/init/`: SQL scripts that automatically run when the Postgres container first boots. It creates the databases, the schemas (one for each service), and the restricted roles/passwords for each service.
