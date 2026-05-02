# SpecForge

## Overview

AI-powered technical design document generator for students and hackathon builders. Drop in a GitHub URL or describe your project to instantly generate professional specs.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (artifact: `specforge`)
- **Backend**: Express 5 + Node.js 24 (artifact: `api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **AI**: Claude Sonnet via Anthropic (`lib/integrations-anthropic-ai`)
- **Auth**: Replit Auth (OIDC + PKCE, sessions in DB) (`lib/replit-auth-web`)
- **API contracts**: OpenAPI → Orval codegen → React Query hooks + Zod schemas
- **Validation**: Zod (v4 in DB/server, inline in auth routes)

## Features

1. **Spec Generation** — System Design, API Design, DB Schema, Feature Spec from GitHub URL or description
2. **Complexity Score** — AI-scored 1–10 with tech debt risks and recommendations
3. **Mermaid Diagrams** — Auto-generated architecture/sequence/ER diagrams
4. **Ask Your Doc (AI Chat)** — Claude-powered Q&A scoped to each spec
5. **Public Sharing** — Share tokens + view counter at `/share/:token` (no auth required)
6. **PDF Export** — `window.print()` + `@media print` CSS for clean PDF output
7. **User Authentication** — Replit Auth OIDC with session cookies + user dropdown in sidebar
8. **GitHub Auto-sync** — Manual "Sync Now" button re-generates spec from source; GitHub webhook endpoint (`POST /api/webhooks/github`) verifies HMAC-SHA256 and auto-regenerates on push

## Routes

- `/` — Landing page
- `/app` — Generator
- `/app/specs` — History
- `/app/specs/:id` — Spec detail (Document | Diagram | Ask AI tabs)
- `/share/:token` — Public read-only share page

## API Endpoints (all prefixed `/api`)

- `GET /specs` — list all
- `POST /specs` — create spec
- `GET /specs/:id` — get spec
- `DELETE /specs/:id` — delete spec
- `POST /specs/:id/stream` — SSE generation stream
- `POST /specs/:id/sync` — trigger background re-generation
- `GET /specs/:id/webhook` — get/create GitHub webhook config
- `POST /specs/:id/share` — generate/get share link
- `GET /specs/share/:token` — public share lookup
- `POST /specs/:id/chat` — get/create conversation for spec
- `GET /specs/recent` — recent specs + stats
- `POST /webhooks/github` — GitHub push webhook receiver (HMAC verified)
- `GET /auth/user` — current session user
- `GET /login` — OIDC login redirect
- `GET /callback` — OIDC callback
- `GET /logout` — clear session + OIDC end-session

## DB Schema

- `specs` — main table (specType, inputType, inputValue, content, status, complexityScore, techDebtRisks, mermaidDiagram, shareToken, viewCount, webhookSecret, lastSyncedAt)
- `conversations` + `messages` — AI chat history
- `sessions` — auth sessions (Replit Auth)
- `users` — authenticated users (Replit Auth)

## Key Commands

```bash
pnpm run typecheck                          # full typecheck
pnpm --filter @workspace/api-spec run codegen  # regenerate API hooks + Zod schemas
pnpm --filter @workspace/db run push       # push DB schema changes
```

## Important Notes

- Anthropic env vars: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- Model: `claude-sonnet-4-6`
- Auth middleware runs on every request via `authMiddleware.ts` — loads user from session
- `replit-auth-web` lib has composite TS config; must reference it from root `tsconfig.json`
- `@workspace/api-zod` doesn't generate schemas for redirect-only auth endpoints — those are defined inline in `routes/auth.ts`
- GitHub webhook needs deployed URL; use "Sync Now" button in development
- `serializeSpec()` strips `webhookSecret` from all responses
- Actual spec IDs start at 4 (IDs 1–3 were seeded test data)
