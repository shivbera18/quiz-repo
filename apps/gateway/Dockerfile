# Build context is the REPO ROOT. Build with:
#   docker build -f apps/gateway/Dockerfile -t quiz-gateway .
# No Prisma here -- the gateway owns no data, only routes and auth-checks.
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
COPY apps/gateway/package.json ./apps/gateway/package.json

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/gateway ./apps/gateway

ENV NODE_ENV=production
EXPOSE 4000

CMD ["pnpm", "--filter", "gateway", "start"]
