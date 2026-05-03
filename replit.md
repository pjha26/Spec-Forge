# SpecForge

## Overview

AI-powered technical design document generator. Drop in a GitHub URL, text description, or upload an image to instantly generate professional specs.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (artifact: `specforge`)
- **Backend**: Express 5 + Node.js 24 (artifact: `api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **AI**: Claude Sonnet, GPT-5.x (OpenAI), Gemini 2.5 (Google) — via Replit AI integrations
- **Auth**: Replit Auth (OIDC + PKCE, sessions in DB) (`lib/replit-auth-web`)
- **API contracts**: OpenAPI → Orval codegen → React Query hooks + Zod schemas
- **Validation**: Zod (v4 in DB/server, inline in auth routes)

## Features

1. **Spec Generation** — System Design, API Design, DB Schema, Feature Spec from GitHub URL, text description, or uploaded image
2. **Multi-Agent Generation** — 4 parallel AI specialists (Architect, Security, Database, API) produce independent sections; a Coordinator agent merges them into a coherent document with live per-agent progress display
3. **Extended Thinking** — Claude-only: enables `thinking: { type: "enabled", budget_tokens: 10000 }` for deeper reasoning; thinking trace is displayed in a collapsible panel above the output
4. **Multimodal Image Input** — Upload JPEG/PNG/WebP diagrams/mockups/screenshots; base64-encoded and passed to Claude or GPT vision APIs; optional description field
5. **AI Memory / Preferences** — `user_preferences` table; Preferences modal lets users set preferred stack, domain, always-include sections, extra context; injected into every generation prompt automatically
6. **MCP Server** — Model Context Protocol endpoint at `GET/POST /api/mcp`; JSON-RPC 2.0; tools: `generate_spec`, `list_specs`, `get_spec`, `analyze_spec`; compatible with Cursor, Claude Code, Continue.dev
7. **Complexity Score** — AI-scored 1–10 with tech debt risks and recommendations
8. **Mermaid Diagrams** — Auto-generated architecture/sequence/ER diagrams
9. **Ask Your Doc (AI Chat)** — Claude-powered Q&A scoped to each spec
10. **Public Sharing** — Share tokens + view counter at `/share/:token` (no auth required); `POST /api/specs/:id/share` generates token; existing `SharedSpec` page handles display
11. **PDF Export** — `window.print()` + `@media print` CSS for clean PDF output; "Export PDF" button on spec-detail and shared-spec pages
12. **User Authentication** — Replit Auth OIDC with session cookies + user dropdown in sidebar
13. **GitHub Auto-sync** — Manual "Sync Now" re-generates spec from source; `POST /api/specs/:id/github-sync` (manual trigger); `POST /api/webhooks/github/:id` (push webhook with HMAC-SHA256 verification); auto-regenerates on push to default branch
14. **Real-time Presence** — SSE-based live viewer tracking per spec; shows colored avatar bar when 2+ people view simultaneously
15. **Intelligent Insights** — Claude-powered spec health analysis: completeness score, strengths, missing areas, improvement suggestions
16. **In-app Notifications** — SSE real-time notification stream; bell icon with unread badge
17. **Version History** — Every successful generation is snapshotted; timeline panel with diff view
18. **DOCX Export** — Full Markdown→DOCX converter; `.DOCX` button on spec-detail toolbar
19. **Team Workspaces** — `teams` + `team_members` tables; full CRUD; specs assignable to teams
20. **Multi-model AI** — Claude Sonnet, GPT-5.4, GPT-5.1, Gemini 2.5 Pro/Flash
21. **Notion Export** — `POST /api/specs/:id/export/notion` converts spec to Notion blocks via REST API using `NOTION_API_KEY` secret
22. **Team RAG Knowledge Base** — Teams upload past specs, ADRs, and decision docs to a `team_knowledge` table; `retrieveTeamKnowledge()` scores docs by keyword overlap with the incoming spec query and injects the top results (up to 6k chars) into every generation prompt as `[Team Knowledge Base]` context; ADRs and decision docs get a relevance boost; accessible via "Knowledge Base" tab in team detail; file upload (.md/.txt) and paste supported; 5 doc types: ADR, Spec, Decision, Runbook, Other

## Routes

- `/` — Landing page
- `/app` — Generator
- `/app/specs` — History
- `/app/specs/:id` — Spec detail (Document | Diagram | Chat | Insights tabs)
- `/share/:token` — Public read-only share page (no auth)

## API Endpoints (all prefixed `/api`)

- `GET /specs` — list all
- `POST /specs` — create spec (accepts `multiAgent`, `extendedThinking`, `imageInput` fields)
- `GET /specs/:id` — get spec
- `DELETE /specs/:id` — delete spec
- `POST /specs/:id/stream` — SSE generation stream (routes to extended-thinking / multi-agent / standard based on spec flags)
- `POST /specs/:id/sync` — trigger background re-generation
- `POST /specs/:id/share` — generate/get share link
- `GET /specs/share/:token` — public share lookup (no auth, increments viewCount)
- `POST /specs/:id/github-sync` — manual GitHub re-sync trigger
- `POST /webhooks/github/:id` — GitHub push webhook (HMAC-SHA256 verified, re-syncs on push to default branch)
- `GET /specs/:id/github-sync/status` — polling status endpoint
- `POST /specs/:id/chat` — get/create conversation for spec
- `GET /specs/:id/presence` — SSE live viewer stream
- `POST /specs/:id/insights` — Claude-powered spec health analysis
- `GET /specs/recent` — recent specs + stats
- `GET /preferences` — get user preferences (auth required)
- `PUT /preferences` — upsert user preferences (auth required)
- `GET /mcp` — MCP server manifest
- `POST /mcp` — MCP JSON-RPC 2.0 handler (tools: generate_spec, list_specs, get_spec, analyze_spec)
- `GET /auth/user` — current session user
- `GET /login` — OIDC login redirect
- `GET /callback` — OIDC callback
- `GET /logout` — clear session + OIDC end-session
- `GET /notifications` — list notifications with unread count
- `GET /notifications/stream` — SSE notification stream
- `PUT /notifications/read-all` — mark all read
- `PUT /notifications/:id/read` — mark single read
- `GET /teams/:id/knowledge` — list team knowledge docs (with excerpts)
- `POST /teams/:id/knowledge` — upload a knowledge doc (title, content, docType: spec|adr|decision|runbook|doc)
- `DELETE /teams/:id/knowledge/:docId` — delete a knowledge doc

## DB Schema

- `specs` — main table; includes `multiAgent` (bool), `extendedThinking` (bool), `thinkingContent` (text), `imageInput` (text), `shareToken`, `viewCount`, `webhookSecret`, `lastSyncedAt`, `aiModel`, `teamId`
- `user_preferences` — userId (PK), preferredStack, domain, alwaysIncludeSections (jsonb), preferredModel, defaultSpecType, extraContext
- `conversations` + `messages` — AI chat history
- `sessions` + `users` — Replit Auth
- `notifications` — in-app notifications
- `spec_versions` — version snapshots
- `teams` + `team_members` — team workspaces
- `team_knowledge` — teamId, title, content, docType (spec|adr|decision|runbook|doc), wordCount, uploadedBy, createdAt

## Key Files

- `artifacts/api-server/src/lib/model-router.ts` — unified model abstraction: `streamCompletion`, `generateCompletion`, `generateCompletionWithThinking` (extended thinking), `generateMultiAgent` (4 agents + coordinator)
- `artifacts/api-server/src/routes/specs.ts` — create route (new fields), stream route (3-mode branching: extended-thinking / multi-agent / standard), exports `SPEC_PROMPTS`
- `artifacts/api-server/src/routes/preferences.ts` — GET/PUT /api/preferences
- `artifacts/api-server/src/routes/mcp.ts` — MCP server (JSON-RPC 2.0)
- `artifacts/api-server/src/routes/share.ts` — share token generation + public lookup
- `artifacts/api-server/src/routes/github-sync.ts` — manual sync + webhook handler
- `artifacts/specforge/src/components/preferences-modal.tsx` — AI Memory preferences UI
- `artifacts/specforge/src/components/multi-agent-progress.tsx` — per-agent live progress panel
- `artifacts/specforge/src/pages/home.tsx` — Generator page with all new toggles
- `artifacts/specforge/src/index.css` — `@media print` styles for PDF export
- `lib/db/src/schema/team-knowledge.ts` — `team_knowledge` table schema
- `artifacts/api-server/src/routes/team-knowledge.ts` — CRUD routes + `retrieveTeamKnowledge()` RAG helper
- `artifacts/specforge/src/components/team-knowledge-panel.tsx` — upload/list/delete UI panel
- `artifacts/specforge/src/pages/team-detail.tsx` — tabbed layout with new "Knowledge Base" tab

## Key Commands

```bash
pnpm run typecheck                             # full typecheck
pnpm --filter @workspace/api-spec run codegen # regenerate API hooks + Zod schemas
pnpm --filter @workspace/db run push          # push DB schema changes
```

## Important Notes

- **OpenAI**: use `max_completion_tokens` (not `max_tokens`) for GPT-5 models
- **Extended Thinking**: Claude only; budget_tokens=10000, max_tokens=16000; non-Claude falls back to standard
- **Multi-Agent**: 4 parallel specialists via `Promise.all`; coordinator merges; SSE events emit `{ agent, chunk }` during agent phase then `{ content, chunk }` during final re-stream
- **Image input**: stored as base64 in `imageInput` column; passed to Claude/GPT vision; Gemini falls back to text-only
- **MCP**: GET /api/mcp returns manifest; POST /api/mcp is JSON-RPC 2.0; no auth on MCP endpoint by design
- **Preferences**: injected as `[User Preferences]` block into every generation prompt at stream time
- **Notion export**: use `NOTION_API_KEY` secret (Internal Integration token); must share Notion pages with the integration
- Auth middleware runs on every request; loads user from session
- `serializeSpec()` strips `webhookSecret` from all responses
- Presence tracking is in-memory; resets on server restart
- `createNotification()` + `broadcastNotification()` exported from `routes/notifications.ts`
