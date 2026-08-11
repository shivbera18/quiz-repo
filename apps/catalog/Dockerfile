# Build context is the REPO ROOT. Build with:
#   docker build -f apps/catalog/Dockerfile -t quiz-catalog-svc .
# Same tsx-runtime simplicity trade-off as identity-svc's Dockerfile.
FROM node:22-alpine

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/catalog ./apps/catalog

ENV TMPDIR=/app/tmp
RUN mkdir -p /app/tmp
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter catalog-svc prisma:generate

ENV NODE_ENV=production
EXPOSE 4002

CMD ["pnpm", "--filter", "catalog-svc", "start"]
