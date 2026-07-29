# Build context is the REPO ROOT, not this directory -- pnpm workspaces need
# the root lockfile and every workspace package.json to resolve correctly.
# Build with: docker build -f apps/identity/Dockerfile -t quiz-identity-svc .
#
# Runs via tsx rather than a compiled dist/ build -- a deliberate simplicity
# trade-off for this project's scale (see HOSTING.md's "known simplifications"
# section), not the most optimized production setup (a compiled build would
# have faster cold starts and no TS-transpile-at-runtime overhead).
FROM node:22-alpine

RUN npm install -g pnpm@10.12.3

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/identity ./apps/identity

RUN pnpm install --frozen-lockfile
RUN pnpm --filter identity-svc prisma:generate

ENV NODE_ENV=production
EXPOSE 4001

CMD ["pnpm", "--filter", "identity-svc", "start"]
