FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/schema-types/package.json packages/schema-types/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @stackby/api...

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/schema-types/node_modules ./packages/schema-types/node_modules
COPY . .
RUN pnpm turbo run build --filter=@stackby/api

FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/node_modules ./node_modules
EXPOSE 4000
CMD ["dist/index.js"]
