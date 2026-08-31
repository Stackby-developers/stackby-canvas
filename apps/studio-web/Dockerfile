FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/schema-types/package.json packages/schema-types/
COPY packages/ui/package.json packages/ui/
COPY apps/studio-web/package.json apps/studio-web/
RUN pnpm install --frozen-lockfile --filter @stackby/studio-web...

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=@stackby/studio-web

FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /repo/apps/studio-web/.next/standalone ./
COPY --from=builder /repo/apps/studio-web/.next/static ./.next/static
EXPOSE 3000
CMD ["server.js"]
