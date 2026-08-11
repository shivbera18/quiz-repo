# Build context is the REPO ROOT. Build with:
#   docker build -f apps/notification/Dockerfile -t quiz-notification-svc .
# This is the one service that hosts long-lived SSE connections and can
# never run on a serverless platform (see ARCHITECTURE.md).
FROM node:22-alpine

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/notification ./apps/notification

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter notification-svc prisma:generate

ENV NODE_ENV=production
EXPOSE 4005

CMD ["pnpm", "--filter", "notification-svc", "start"]
