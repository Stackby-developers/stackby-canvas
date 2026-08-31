FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/schema-types/package.json packages/schema-types/
COPY services/build/package.json services/build/
RUN pnpm install --frozen-lockfile --filter @stackby/build-service...

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/schema-types/node_modules ./packages/schema-types/node_modules
COPY . .
RUN pnpm turbo run build --filter=@stackby/build-service

FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app
COPY --from=builder /repo/services/build/dist ./dist
COPY --from=builder /repo/services/build/node_modules ./node_modules
EXPOSE 3004
CMD ["dist/index.js"]
