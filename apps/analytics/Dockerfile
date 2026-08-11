# Build context is the REPO ROOT. All three analytics-svc processes (API +
# rollup consumer + export worker) are built from this one file, sharing a
# `base` stage, so Docker's content-addressable layer store keeps exactly
# ONE copy of node_modules and the generated Prisma client on disk instead
# of a near-duplicate per process -- the three final images differ only in
# their (layer-free) CMD.
#   docker build -f apps/analytics/Dockerfile --target svc              -t quiz-analytics-svc .
#   docker build -f apps/analytics/Dockerfile --target rollup-consumer   -t quiz-analytics-rollup-consumer .
#   docker build -f apps/analytics/Dockerfile --target export-worker     -t quiz-analytics-export-worker .
#
# Manifests are copied -- and `pnpm install` run -- BEFORE the app/package
# source. A source-only commit (the overwhelming majority) then reuses the
# install layer completely instead of reinstalling every dependency again.
FROM node:22-alpine AS base

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/kafka-kit/package.json ./packages/kafka-kit/package.json
COPY packages/observability/package.json ./packages/observability/package.json
COPY packages/redis-kit/package.json ./packages/redis-kit/package.json
COPY apps/analytics/package.json ./apps/analytics/package.json

ENV TMPDIR=/app/tmp
RUN mkdir -p /app/tmp
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/analytics ./apps/analytics

RUN pnpm --filter analytics-svc prisma:generate

ENV NODE_ENV=production

FROM base AS svc
EXPOSE 4004
CMD ["pnpm", "--filter", "analytics-svc", "start"]

FROM base AS rollup-consumer
CMD ["pnpm", "--filter", "analytics-svc", "rollup-consumer:start"]

FROM base AS export-worker
CMD ["pnpm", "--filter", "analytics-svc", "export-worker:start"]
