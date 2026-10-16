# Multi-stage Dockerfile for Donkey Play API
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Step 1: Install dependencies
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

# Step 2: Build API TypeScript code
FROM dependencies AS builder
COPY apps/api/ ./apps/api/
RUN pnpm --filter api build

# Step 3: Production runtime image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Copy dependencies, packages and compiled dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/health/readiness || exit 1

CMD ["node", "dist/server.js"]
