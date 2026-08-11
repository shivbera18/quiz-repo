# Build context is the REPO ROOT. Build with:
#   docker build -f apps/analytics/Dockerfile -t quiz-analytics-svc .
FROM node:22-alpine

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/analytics ./apps/analytics

ENV TMPDIR=/app/tmp
RUN mkdir -p /app/tmp
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter analytics-svc prisma:generate

ENV NODE_ENV=production
EXPOSE 4004

CMD ["pnpm", "--filter", "analytics-svc", "start"]
