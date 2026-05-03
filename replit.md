# SpecForge

## Overview

AI-powered technical design document generator for students and hackathon builders. Drop in a GitHub URL or describe your project to instantly generate professional specs.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (artifact: `specforge`)
- **Backend**: Express 5 + Node.js 24 (artifact: `api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **AI**: Claude Sonnet, GPT-5.x (OpenAI), Gemini 2.5 (Google) — via Replit AI integrations (`lib/integrations-anthropic-ai`, `lib/integrations-openai-ai-server`, `lib/integrations-gemini-ai`)
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
8. **GitHub Auto-sync** — Manual "Sync Now" button re-generates spec from source; GitHub webhook endpoint (`POST /api/webhooks/github`) verifies HMAC-SHA256 and auto-regenerates on push; fires notifications on completion/failure
9. **Real-time Presence** — SSE-based live viewer tracking per spec; shows colored avatar bar when 2+ people view simultaneously (`PresenceBar` component)
10. **Intelligent Insights** — Claude-powered spec health analysis: completeness score, strengths, missing areas, improvement suggestions, estimated implementation days (`SpecInsights` tab)
11. **In-app Notifications** — SSE real-time notification stream; bell icon in sidebar with unread badge; `sync_complete` / `sync_failed` / `share_viewed` types; mark read / mark all read (`NotificationBell` component)
12. **Version History** — Every successful generation is snapshotted into `spec_versions` table; timeline panel in the spec detail sidebar lists all versions with trigger source (Initial / Manual Sync / GitHub Push) and complexity score; click any version to open full markdown preview in a modal with a **Changes** tab showing color-coded diff (`SpecVersionHistory` component)
13. **DOCX Export** — Full Markdown→DOCX converter via `docx` package; `.DOCX` button on spec-detail toolbar downloads a formatted Word document
14. **Team Workspaces** — `teams` + `team_members` tables; full CRUD via `/api/teams`; Teams page + Team Detail page; specs can be assigned to teams
15. **Multi-model AI** — Model selector on Generator page lets users pick Claude Sonnet (Anthropic), GPT-5.4 / GPT-5.1 (OpenAI), or Gemini 2.5 Pro / Flash (Google); selection stored on spec row as `aiModel`; model-router (`lib/model-router.ts`) abstracts streaming + completion across all providers

## Routes

- `/` — Landing page
- `/app` — Generator
- `/app/specs` — History
- `/app/specs/:id` — Spec detail (Document | Diagram | Chat | Insights tabs)
- `/share/:token` — Public read-only share page

## API Endpoints (all prefixed `/api`)

- `GET /specs` — list all
- `POST /specs` — create spec
- `GET /specs/:id` — get spec
- `DELETE /specs/:id` — delete spec
- `POST /specs/:id/stream` — SSE generation stream
- `POST /specs/:id/sync` — trigger background re-generation (fires notification)
- `GET /specs/:id/webhook` — get/create GitHub webhook config
- `POST /specs/:id/share` — generate/get share link
- `GET /specs/share/:token` — public share lookup
- `POST /specs/:id/chat` — get/create conversation for spec
- `GET /specs/:id/presence` — SSE stream of real-time viewers for a spec
- `POST /specs/:id/insights` — Claude-powered spec health analysis
- `GET /specs/recent` — recent specs + stats
- `POST /webhooks/github` — GitHub push webhook receiver (HMAC verified)
- `GET /auth/user` — current session user
- `GET /login` — OIDC login redirect
- `GET /callback` — OIDC callback
- `GET /logout` — clear session + OIDC end-session
- `GET /notifications` — list notifications with unread count
- `GET /notifications/stream` — SSE real-time notification stream
- `PUT /notifications/read-all` — mark all notifications read
- `PUT /notifications/:id/read` — mark single notification read

## DB Schema

- `specs` — main table (specType, inputType, inputValue, content, status, complexityScore, techDebtRisks, mermaidDiagram, shareToken, viewCount, webhookSecret, lastSyncedAt, aiModel, teamId)
- `conversations` + `messages` — AI chat history
- `sessions` — auth sessions (Replit Auth)
- `users` — authenticated users (Replit Auth)
- `notifications` — in-app notifications (userId, type, title, message, specId, read, createdAt)

## Key Commands

```bash
pnpm run typecheck                          # full typecheck
pnpm --filter @workspace/api-spec run codegen  # regenerate API hooks + Zod schemas
pnpm --filter @workspace/db run push       # push DB schema changes
```

## Important Notes

- Anthropic env vars: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- OpenAI env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`
- Gemini env vars: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`
- Default model: `claude-sonnet-4-6`; model-router in `artifacts/api-server/src/lib/model-router.ts`
- `@google/genai` and `openai` added as direct api-server deps (not externalized by esbuild) so they bundle correctly
- Auth middleware runs on every request via `authMiddleware.ts` — loads user from session
- `replit-auth-web` lib has composite TS config; must reference it from root `tsconfig.json`
- `@workspace/api-zod` doesn't generate schemas for redirect-only auth endpoints — those are defined inline in `routes/auth.ts`
- GitHub webhook needs deployed URL; use "Sync Now" button in development
- `serializeSpec()` strips `webhookSecret` from all responses
- Presence tracking is in-memory (Map per specId), not persisted — resets on server restart
- `createNotification(userId, { type, title, message, specId? })` + `broadcastNotification(userId, notification)` exported from `routes/notifications.ts`
- Notification SSE connections tracked in-memory Map keyed by userId
- **Notion export**: NOT using Replit integration (user dismissed OAuth). Use `NOTION_API_KEY` secret (Internal Integration token from https://www.notion.so/my-integrations) + call Notion REST API directly. Add route `POST /api/specs/:id/export/notion`.
