---
name: frontend-feature
description: Master skill for building and modifying Next.js 15 App Router pages, React components, Tailwind styling, web app API forwarders, client state, and UI features in apps/web. Trigger whenever editing files in apps/web, creating App Router routes in app/, modifying components/, styling with Tailwind/shadcn, or wiring frontend API routes to the gateway.
---

# Next.js Frontend Development (`apps/web`)

`apps/web` is a Next.js 15.5.21 App Router application (`output: "standalone"`). It provides the user interface and thin API forwarders. **It contains NO database code and imports NO `@quiz/*` packages or Prisma models.**

## Architecture & Single Egress Point

```
Browser  ──▶  Next.js Page / app/api/** Forwarder  ──▶  lib/gateway-client.ts (proxyToGateway)
                                                                 │
                                                                 ▼
                                                    API Gateway (GATEWAY_URL:4000)
```

1. **The Single Egress Point:** `apps/web/lib/gateway-client.ts` exports **`proxyToGateway(request, gatewayPath)`**.
   - Reads `GATEWAY_URL` (default `http://localhost:4000`).
   - Copies `authorization` and `content-type` headers.
   - Sets `cache: "no-store"`.
   - Returns `503 Service Unavailable` if upstream gateway is unreachable.
2. **Rule:** NEVER add Prisma, a database client, or direct service URLs (`localhost:4001`) to `apps/web`. New backend capabilities MUST go through the gateway proxy.
3. **Stateless Gemini Exceptions:** `app/api/ai/generate-questions/route.ts` and `app/api/generate-flashcards/route.ts` call Gemini directly and persist nothing.

## Next.js 15 Conventions

- **Async Params:** Route handlers and pages MUST await `params`:
  ```tsx
  export default async function QuizPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    // ...
  }
  ```
- **Dynamic Route Handlers:** All route forwarders in `app/api/**` MUST export `export const dynamic = "force-dynamic"`.
- **Asymmetric Admin Updates:** Quizzes use `PATCH` (requires `version` for optimistic locking), while subjects & chapters use `PUT`.

## Key Directory Structure

- `app/`: 35 page routes, single `app/layout.tsx`.
- `app/api/**`: 37 forwarder route files (52 HTTP handlers) proxying to gateway paths `/v1/*`.
- `lib/`: `gateway-client.ts`, `json-upload-processor.ts`, `math-symbol-processor.ts`, `utils.ts` (`cn`).
- `hooks/`: `use-auth.tsx` (display-only session hint), `use-mobile.tsx`, `use-push-notifications.tsx`.
- `components/`:
  - `layout/`: `app-shell.tsx`, `sidebar.tsx`, `top-header.tsx`, `footer.tsx`.
  - `ui/`: 53 shadcn/ui primitives.
  - `quiz/`, `landing/`, `analytics/`.
- `public/`: `sw.js` (service worker), `manifest.ts`, `offline.html`, `icons/`.

## Verification Checklist

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build             # Test production standalone build
```

- Verify no Prisma or backend package imports exist in `apps/web`.
- Verify Next.js 15 `await props.params` is used on dynamic pages/routes.
- Verify `app/api/**` route handler exports `export const dynamic = "force-dynamic"`.
