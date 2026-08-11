# Build context is the REPO ROOT. Both assessment-svc processes (API +
# expiry-sweeper worker) are built from this one file, sharing a `base`
# stage, so Docker's content-addressable layer store keeps exactly ONE copy
# of node_modules and the generated Prisma client on disk instead of a
# near-duplicate per process -- the two final images differ only in their
# (layer-free) CMD.
#   docker build -f apps/assessment/Dockerfile --target svc    -t quiz-assessment-svc .
#   docker build -f apps/assessment/Dockerfile --target worker -t quiz-assessment-worker .
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
COPY apps/assessment/package.json ./apps/assessment/package.json

ENV TMPDIR=/app/tmp
RUN mkdir -p /app/tmp
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/assessment ./apps/assessment

RUN pnpm --filter assessment-svc prisma:generate

ENV NODE_ENV=production

FROM base AS svc
EXPOSE 4003
CMD ["pnpm", "--filter", "assessment-svc", "start"]

FROM base AS worker
CMD ["pnpm", "--filter", "assessment-svc", "worker:start"]
