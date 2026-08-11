# Build context is the REPO ROOT. Build with:
#   docker build -f apps/gateway/Dockerfile -t quiz-gateway .
# No Prisma here -- the gateway owns no data, only routes and auth-checks.
FROM node:22-alpine

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/gateway ./apps/gateway

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

ENV NODE_ENV=production
EXPOSE 4000

CMD ["pnpm", "--filter", "gateway", "start"]
