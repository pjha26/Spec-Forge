FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Install dependencies ────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/integrations-anthropic-ai/package.json ./lib/integrations-anthropic-ai/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY lib/integrations-gemini-ai/package.json ./lib/integrations-gemini-ai/
COPY lib/replit-auth-web/package.json ./lib/replit-auth-web/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/specforge/package.json ./artifacts/specforge/
RUN pnpm install --frozen-lockfile

# ── Build frontend ──────────────────────────────────────────────────────────
FROM deps AS frontend-build
COPY . .
RUN pnpm --filter @workspace/specforge run build

# ── Build API server ────────────────────────────────────────────────────────
FROM deps AS api-build
COPY . .
RUN pnpm --filter @workspace/api-server run build

# ── Production image ────────────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests for production install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json ./lib/db/
COPY lib/integrations-anthropic-ai/package.json ./lib/integrations-anthropic-ai/
COPY lib/integrations-openai-ai-server/package.json ./lib/integrations-openai-ai-server/
COPY lib/integrations-gemini-ai/package.json ./lib/integrations-gemini-ai/

RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=api-build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=frontend-build /app/artifacts/specforge/dist ./artifacts/specforge/dist

# Copy DB schema for migrations
COPY --from=api-build /app/lib/db ./lib/db

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/artifacts/specforge/dist

CMD ["node", "artifacts/api-server/dist/index.js"]
