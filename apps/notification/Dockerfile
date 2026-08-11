# Build context is the REPO ROOT. Both notification-svc processes (API +
# push-fanout worker) are built from this one file, sharing a `base` stage,
# so Docker's content-addressable layer store keeps exactly ONE copy of
# node_modules and the generated Prisma client on disk instead of a
# near-duplicate per process -- the two final images differ only in their
# (layer-free) CMD.
#   docker build -f apps/notification/Dockerfile --target svc    -t quiz-notification-svc .
#   docker build -f apps/notification/Dockerfile --target worker -t quiz-notification-worker .
#
# Manifests are copied -- and `pnpm install` run -- BEFORE the app/package
# source. A source-only commit (the overwhelming majority) then reuses the
# install layer completely instead of reinstalling every dependency again.
#
# This is also the one service that hosts long-lived SSE connections and can
# never run on a serverless platform (see ARCHITECTURE.md).
FROM node:22-alpine AS base

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/kafka-kit/package.json ./packages/kafka-kit/package.json
COPY packages/observability/package.json ./packages/observability/package.json
COPY packages/redis-kit/package.json ./packages/redis-kit/package.json
COPY apps/notification/package.json ./apps/notification/package.json

ENV TMPDIR=/app/tmp
RUN mkdir -p /app/tmp
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/notification ./apps/notification

RUN pnpm --filter notification-svc prisma:generate

ENV NODE_ENV=production

FROM base AS svc
EXPOSE 4005
CMD ["pnpm", "--filter", "notification-svc", "start"]

FROM base AS worker
CMD ["pnpm", "--filter", "notification-svc", "worker:start"]
