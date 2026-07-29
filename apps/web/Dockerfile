# Build context is the REPO ROOT. Build with:
#   docker build -f apps/web/Dockerfile -t quiz-web .
#
# Unlike every other service's Dockerfile in this repo, this one IS
# multi-stage. The other services are small Fastify apps run via tsx with no
# build step at all (a documented simplicity trade-off); Next.js's
# node_modules footprint (Next/React/Radix/etc.) is an order of magnitude
# bigger, so `output: "standalone"` (next.config.mjs) + extracting just the
# traced subset is worth the extra stage here in a way it wouldn't be for
# the others.
FROM node:22-alpine AS builder
RUN npm install -g pnpm@10.12.3
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
