# Build context is the REPO ROOT, not this directory -- pnpm workspaces need
# the root lockfile and every workspace package.json to resolve correctly.
# Build with: docker build -f apps/identity/Dockerfile -t quiz-identity-svc .
#
# Runs via tsx rather than a compiled dist/ build -- a deliberate simplicity
# trade-off for this project's scale (see HOSTING.md's "known simplifications"
# section), not the most optimized production setup (a compiled build would
# have faster cold starts and no TS-transpile-at-runtime overhead).
#
# Manifests are copied -- and `pnpm install` run -- BEFORE the app/package
# source. A source-only commit (the overwhelming majority) then reuses the
# install layer completely instead of reinstalling every dependency again.
FROM node:22-alpine

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/kafka-kit/package.json ./packages/kafka-kit/package.json
COPY packages/observability/package.json ./packages/observability/package.json
COPY packages/redis-kit/package.json ./packages/redis-kit/package.json
COPY apps/identity/package.json ./apps/identity/package.json

ENV TMPDIR=/app/tmp
RUN mkdir -p /app/tmp
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/identity ./apps/identity
RUN pnpm --filter identity-svc prisma:generate

ENV NODE_ENV=production
EXPOSE 4001

CMD ["pnpm", "--filter", "identity-svc", "start"]
