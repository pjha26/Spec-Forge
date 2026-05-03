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
23. **Voice-to-Spec** — Mic button on the Text input mode uses browser `SpeechRecognition` / `webkitSpeechRecognition` API (no backend needed); continuous + interim results; live "Recording…" indicator on the textarea; transcript feeds directly into the generation pipeline
24. **Spec-to-PR Auto-Description Agent** — `POST /api/specs/:id/pr-description`; fetches PR diff + metadata from GitHub API (public or token-authenticated); Claude compares diff against spec content and generates a structured PR description, a list of implemented spec sections, deviations with severity, and an alignment score 0–100; PrAgentPanel in the spec detail sidebar
25. **AI Spec Conflict Detector** — `POST /api/teams/:id/conflicts/analyze` triggers fire-and-forget pairwise Claude analysis of all team specs; finds data model, API contract, naming, auth, and responsibility conflicts; results stored in `spec_conflicts` table; SpecConflictsPanel in a "Conflicts" tab on team detail with resolve/dismiss workflow
26. **Spec Health Monitoring** — `spec_health_reports` table; `runHealthAnalysis()` fetches live GitHub file tree + recent commits and passes them to Claude to measure drift from the spec; alignment score 0–100 + categorised drift items; manual trigger via `POST /api/specs/:id/health/analyze`; nightly cron via `node-cron` (2 AM) for all GitHub-backed completed specs; SpecHealthCard in the spec detail sidebar
27. **Weekly/Daily Digest Emails** — `notifyEmail` + `digestFrequency` columns on `teams`; `sendTeamDigest()` builds a dark-themed HTML email with per-spec alignment scores, drift counts, and open conflict summary; teams can set Off/Weekly/Daily + recipient email in Team Settings → "Spec Health Digest"; cron fires weekly Sundays at 8 AM and daily at 8 AM; SMTP via Nodemailer (requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` env vars); silently skipped if SMTP not configured
28. **Linear / Jira Issue Sync** — AI (Claude) extracts actionable tasks from any completed spec and creates issues in Linear (GraphQL API) or Jira (REST API v3); API keys + team/project config stored in `user_preferences` (new columns: `linearApiKey`, `linearTeamId`, `jiraApiKey`, `jiraBaseUrl`, `jiraProjectKey`); synced issues stored in `spec_issues` table; `LinearSyncPanel` collapsible widget in spec detail sidebar lets users choose Linear or Jira and trigger sync; issues displayed with section grouping and external links; `GET /api/specs/:id/issues`, `POST /api/specs/:id/sync-issues`, `GET /api/specs/linear-teams`
29. **Slack Notifications** — Incoming Webhook URL stored per user in `user_preferences.slackWebhookUrl`; Block Kit message with header, spec title, and "Open Spec →" CTA button sent via `notifySlackOnSpecGenerated()` after every successful spec generation; test endpoint `POST /api/integrations/slack/test`; configured in Integrations → Slack tab
30. **Zapier / Make.com Outbound Webhooks** — `outbound_webhooks` table (per-user, event-scoped, with optional HMAC-SHA256 secret); 4 event types: `spec.generated`, `spec.shared`, `spec.health_declined`, `team.member_joined`; CRUD at `GET|POST /api/integrations/webhooks`, `PUT|DELETE /api/integrations/webhooks/:id`, `POST /api/integrations/webhooks/:id/test`; webhooks fire in `Promise.allSettled` after every spec generation; last HTTP status tracked per hook; Integrations → Zapier / Webhooks tab shows all hooks, last status badge, enable/pause toggle, and delete button

## Routes

- `/` — Landing page
- `/app` — Generator
- `/app/specs` — History
- `/app/specs/:id` — Spec detail (Document | Diagram | Chat | Insights tabs)
- `/app/integrations` — Integration hub (Linear/Jira, Slack, Zapier/Webhooks)
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
- `GET /integrations/settings` — masked integration settings (Linear, Jira, Slack)
- `PUT /integrations/settings` — save integration API keys and config
- `POST /integrations/slack/test` — send test Slack message
- `GET /integrations/webhooks` — list user's outbound webhooks
- `POST /integrations/webhooks` — register new outbound webhook
- `PUT /integrations/webhooks/:id` — update webhook (name, url, enabled)
- `DELETE /integrations/webhooks/:id` — delete webhook
- `POST /integrations/webhooks/:id/test` — fire test payload
- `GET /specs/:id/issues` — list Linear/Jira issues synced from spec
- `POST /specs/:id/sync-issues` — AI-extract tasks + create issues (body: `{platform: "linear"|"jira"}`)
- `GET /specs/linear-teams` — list teams from Linear using saved API key
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
