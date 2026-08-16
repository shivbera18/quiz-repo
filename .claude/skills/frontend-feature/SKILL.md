---
name: frontend-feature
description: Build or modify quiz-platform UI features in the Next.js web app. Use for pages, React components, forms, client state, styling, accessibility, PWA behavior, gateway calls, and browser-facing changes under apps/web.
---

# Frontend Feature

Implement frontend work in `apps/web` while preserving the gateway-only data boundary.

## Context

- Framework: Next.js 15 App Router, React, TypeScript.
- UI: Tailwind CSS, shadcn/ui conventions, Framer Motion.
- API access belongs in `apps/web/lib/gateway-client.ts` or thin App Router proxies.
- Shared request/response validation belongs in `@quiz/contracts`.
- The web app must never import Prisma clients or connect directly to a database.

## Workflow

1. Read the affected route, nearby components, `apps/web/lib/gateway-client.ts`, and related contract schemas before editing.
2. Decide the server/client boundary deliberately. Add `"use client"` only when hooks, browser APIs, or interaction require it.
3. Reuse existing components, hooks, utility classes, loading states, and error patterns before creating abstractions.
4. If the API shape changes, update `packages/contracts` and backend behavior first; do not invent a frontend-only duplicate type.
5. Handle loading, empty, error, disabled, and success states.
6. Preserve responsiveness, keyboard operation, semantic markup, labels, focus visibility, and reduced-motion usability.
7. Add or update Playwright coverage for a critical user flow when behavior changes.

## Guardrails

- Do not expose service URLs, secrets, database credentials, or privileged tokens to client bundles.
- Do not trust role or score checks performed only in the browser; backend services must enforce them.
- Avoid unrelated visual rewrites.
- Keep gateway-client errors actionable without leaking sensitive response details.
- When editing push/PWA behavior, inspect `app/manifest.ts`, `public/sw.js`, and the existing notification hooks/components together.

## Verification

Run the narrowest checks first, then broader checks when appropriate:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web test:e2e
```

Before finishing, report the affected routes/components, API or contract changes, checks run, and any checks blocked by missing services or environment variables.
