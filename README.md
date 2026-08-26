# Quiz Platform

A comprehensive, AI-powered quiz management system built for educational institutions and organizations. This platform enables administrators to create, manage, and analyze quizzes while providing students with an intuitive interface for taking examinations.

## Features

### Core Functionality
- **User Management**: Role-based authentication for administrators and students
- **Quiz Management**: Create and manage quizzes with flexible configurations
- **AI-Powered Generation**: Automatically generate quizzes using Google Gemini AI
- **Question Bank**: Centralized repository for reusable questions
- **Real-time Analytics**: Comprehensive progress tracking and performance metrics

### Technical Features
- **Flexible Timing**: Configurable quiz durations with negative marking
- **Multi-section Support**: Organize quizzes into multiple subject areas
- **Advanced Filtering**: Search and filter questions by difficulty, subject, and tags
- **Question Bank**: Reusable question pool with sections, difficulty levels, and tags
- **Responsive Design**: Mobile-friendly interface with dark/light themes

## Technology Stack

A Turborepo/pnpm monorepo: an API gateway, five backend services, and a Next.js frontend, behind one shared Postgres (schema-per-service), Redis, and Kafka (via Redpanda). See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design rationale.

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript (`apps/web`) |
| **Styling** | Tailwind CSS, Shadcn/ui |
| **Gateway & services** | Fastify (`apps/gateway`, `apps/identity`, `apps/catalog`, `apps/assessment`, `apps/analytics`, `apps/notification`) |
| **Database** | PostgreSQL — one instance, one schema + role per service |
| **ORM** | Prisma (a separate client/schema per service) |
| **Messaging** | Kafka API (Redpanda) — event-carried state transfer + a transactional outbox per service |
| **Cache / rate limiting / leaderboards** | Redis |
| **Object storage** | MinIO (S3 API) — CSV export storage |
| **Authentication** | Custom opaque token, unchanged from the original design — verified centrally by identity-svc, never re-parsed by other services |
| **AI Integration** | Google Gemini API |
| **Testing** | Vitest (unit), Playwright (e2e) |
| **Local orchestration** | Docker Compose (`infra/docker-compose.yml`) |

## Prerequisites

- Node.js 22 and pnpm (the repo has a committed `pnpm-lock.yaml` — use pnpm, not npm/yarn)
- Docker Desktop — the realistic way to run 11+ processes plus Postgres/Redis/Kafka/MinIO locally
- Google Gemini API key (optional — only needed for AI generation features)

## Installation & Deployment

See **[HOSTING.md](HOSTING.md)** for the full setup guide — local development with Docker Compose, running the test suites, and deploying online. Deploying specifically to an Oracle VPS (backend) + Vercel (frontend) with auto-deploy on every push? See **[DEPLOYMENT.md](DEPLOYMENT.md)** instead. Quick start:

```bash
git clone https://github.com/shivbera18/quiz-repo.git
cd quiz-repo
pnpm install
pnpm compose:up                              # builds and starts all 11 backend processes + infra
# then, per service (see HOSTING.md Part 1 step 4):
docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:seed
# ...repeat db:migrate for catalog-svc, assessment-svc, analytics-svc, notification-svc
GATEWAY_URL=http://localhost:4000 pnpm --filter web dev
```

## Usage

### Default Accounts (after running `pnpm db:seed`)

**Administrator Account**
- Email: `admin@quizapp.com`
- Password: `admin123`

**Student Account**
- Email: `student@test.com`
- Password: `student123`

### Key Workflows

1. **Admin Login**: Access admin dashboard for quiz management
2. **Quiz Creation**: Use AI generator or manual creation
3. **Question Management**: Build and organize question bank
4. **Analytics Review**: Monitor student performance and quiz statistics
5. **Student Access**: Take quizzes through intuitive interface

## Project Structure

```
quiz-repo/
├── apps/
│   ├── web/                # Next.js frontend -- UI only; every app/api/** route
│   │   │                   # forwards to the gateway (apps/web/lib/gateway-client.ts)
│   │   ├── app/            # App Router pages + thin API-forward route handlers
│   │   ├── components/     # Reusable React components
│   │   └── hooks/
│   ├── gateway/             # Fastify: auth (via identity-svc introspection), routing, rate limiting
│   ├── identity/             # users, opaque tokens
│   ├── catalog/               # subjects/chapters/quizzes/question bank + AI quiz generation worker
│   ├── assessment/           # Attempt-based server-side scoring + legacy QuizResult reporting
│   ├── analytics/           # read models fed by Kafka (rollup consumer) + CSV export worker
│   └── notification/       # announcements, push notifications, SSE
├── packages/
│   ├── contracts/          # shared Zod DTOs + Kafka event types
│   ├── kafka-kit/           # producer/consumer/outbox helpers
│   ├── redis-kit/          # Redis client + typed key builders
│   └── observability/      # structured logging + trace-id propagation
└── infra/
    ├── docker-compose.yml  # the whole stack
    └── postgres/init/      # per-service schema + role setup
```

## Agentic Development with Pi

This repository includes project skills, specialist subagents, code diagnostics, browser automation, current documentation research, task tracking, and MCP servers for Pi. See **[docs/PI_AGENTIC_WORKFLOW.md](docs/PI_AGENTIC_WORKFLOW.md)** for setup, commands, recommended implementation/review loops, verification, and Git workflows.

Quick start:

```powershell
cd C:\path\to\quiz-repo
pi
```

Then run `/reload`, `/subagents-doctor`, and `/mcp status` inside Pi.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary. All rights reserved. (A LICENSE file has not been added yet.)

## Author

**Shivratan Bera**
- GitHub: [@shivbera18](https://github.com/shivbera18)

## Support

For support or questions, please open an issue on GitHub.
