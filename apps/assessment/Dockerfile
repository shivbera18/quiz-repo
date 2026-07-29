# Build context is the REPO ROOT. Build with:
#   docker build -f apps/assessment/Dockerfile -t quiz-assessment-svc .
# Same tsx-runtime simplicity trade-off as identity-svc's Dockerfile.
FROM node:22-alpine

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/assessment ./apps/assessment

RUN pnpm install --frozen-lockfile
RUN pnpm --filter assessment-svc prisma:generate

ENV NODE_ENV=production
EXPOSE 4003

CMD ["pnpm", "--filter", "assessment-svc", "start"]
