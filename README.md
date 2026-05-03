# SpecForge

**AI-powered technical design document generator for developers, students, and hackathon builders.**

Drop in a GitHub URL or describe your project in plain text and SpecForge instantly produces a professional, structured technical specification — system design, API contracts, database schemas, or feature specs — powered by your choice of Claude, GPT, or Gemini.

---

## What it does

Most engineers skip writing specs because it takes too long. SpecForge eliminates that friction: describe your idea or paste a GitHub link and within seconds you have a complete, professional document you can share with your team, submit with a project, or use as a blueprint for implementation.

---

## Features

### Core Generation
- **4 document types** — System Design, API Design, Database Schema, Feature Spec
- **2 input modes** — GitHub repository URL or plain-text description
- **Streaming output** — content appears token-by-token in real time as the AI writes it
- **Mermaid architecture diagrams** — auto-generated alongside the document (architecture, ER, sequence diagrams depending on spec type)
- **Complexity score** — AI-scored 1–10 rating with tech debt risk breakdown and a written summary
- **8 starter templates** — SaaS API, Mobile App, Real-time Chat, Data Pipeline, E-commerce Platform, Microservices, ML API, Multi-tenant Database; selecting one pre-fills the spec type and description

### Multi-Model AI
- **Claude Sonnet** (Anthropic) — default, best for long-form structured documents
- **GPT-5** (OpenAI) — alternative with strong reasoning
- **Gemini 2.5 Pro / Flash** (Google) — fastest option; Flash is optimized for speed
- Model selector on the generator page; choice is stored per spec and used for all AI operations on that spec

### Export & Sharing
- **Notion export** — push the full spec as a structured Notion page (headings, bullets, code blocks, quotes) directly into your workspace; a banner appears with a link to the new page
- **Word / DOCX export** — full Markdown-to-DOCX conversion via the `docx` package; downloads a formatted `.docx` file
- **PDF export** — clean browser-print layout (sidebar, nav, and UI chrome hidden) via `@media print` CSS
- **Markdown download** — raw `.md` file for use in any editor or repository
- **Copy to clipboard** — one-click copy of the full document
- **Public share links** — generate a shareable URL (`/share/:token`) that anyone can read without logging in; tracks view count
- **Code scaffold** — generate 8–15 real starter files (README, package.json, source files, config) from any spec and download as a ZIP

### GitHub Integration
- **Manual sync** — re-generate the spec from the latest source with one click
- **GitHub webhook** — auto-regenerates on every `git push`; HMAC-SHA256 verified; fires in-app notification on completion or failure

### AI-Powered Extras
- **Ask Your Doc** — Claude-powered chat scoped to each spec; ask questions, request clarifications, get implementation advice
- **Intelligent Insights** — on-demand spec health analysis: completeness %, overall health rating, strengths, missing areas, improvement suggestions, and estimated implementation timeline

### Collaboration & Realtime
- **Real-time presence** — when multiple people view the same spec simultaneously, a live avatar bar appears
- **Version history** — every generation is snapshotted; timeline panel in the sidebar lets you browse all past versions, preview any historical document in a full modal, and see a color-coded diff (`+`/`−`) on a Changes tab
- **In-app notifications** — real-time bell icon with unread badge; notified when sync completes/fails with a direct link back to the spec; mark single or all read
- **Team workspaces** — create teams, invite members with owner/editor/viewer roles, assign specs to teams, and manage a shared spec library

### Platform
- **User authentication** — sign in with your Replit account via OIDC + PKCE; sessions persist across browser sessions
- **Spec history** — full list of all your generated documents
- **Framer Motion animations** — spring physics throughout: spec-type selector, AI model picker, generate button states, share/sync/webhook banners, version history modals, scaffold slide-over panel

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui, Framer Motion |
| Backend | Node.js 24, Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| AI | Claude Sonnet (Anthropic), GPT-5 (OpenAI), Gemini 2.5 Pro/Flash (Google) |
| Auth | Replit Auth — OpenID Connect + PKCE, sessions in PostgreSQL |
| Realtime | Server-Sent Events (SSE) — presence, notifications, generation stream |
| API contracts | OpenAPI 3.1 → Orval codegen → React Query hooks + Zod schemas |
| Monorepo | pnpm workspaces |
| Export | `docx` (Word), `jszip` (scaffold ZIP), Notion REST API, `window.print()` (PDF) |

---

## Project Structure

```
specforge/
├── artifacts/
│   ├── api-server/              # Express REST API (port 8080)
│   │   └── src/
│   │       ├── routes/          # specs, versions, presence, insights,
│   │       │                    #   notifications, auth, webhooks
│   │       ├── lib/             # model-router (Claude/GPT/Gemini), auth helpers
│   │       └── middlewares/     # auth middleware (runs on every request)
│   └── specforge/               # React + Vite frontend
│       └── src/
│           ├── pages/           # landing, home (generator), spec-detail,
│           │                    #   specs (history), share, teams, team-detail
│           └── components/      # layout, notification-bell, presence-bar,
│                                #   spec-chat, spec-insights, spec-version-history,
│                                #   spec-scaffold, spec-templates-modal, mermaid-diagram,
│                                #   complexity-score-card, ai-chat
├── lib/
│   ├── db/                      # Drizzle ORM schema + push migrations
│   ├── api-spec/                # OpenAPI YAML + Orval codegen config
│   ├── api-client-react/        # Generated React Query hooks
│   ├── api-zod/                 # Generated Zod validation schemas
│   ├── integrations-anthropic-ai/       # Anthropic SDK wrapper
│   ├── integrations-openai-ai-server/   # OpenAI SDK wrapper
│   ├── integrations-gemini-ai/          # Google Gemini SDK wrapper
│   └── replit-auth-web/         # Auth React hook + PKCE helpers
└── scripts/                     # Shared utility scripts
```

---

## Getting Started (Development)

The app runs as two services behind a shared reverse proxy:

| Service | Port | Path |
|---|---|---|
| Frontend (Vite) | `$PORT` | `/` |
| API Server (Express) | `8080` | `/api` |

Both services start automatically via the configured workflows. The proxy routes `/api/*` to Express and everything else to Vite.

### Key commands

```bash
# Full typecheck (libs + all packages)
pnpm run typecheck

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes to PostgreSQL
pnpm --filter @workspace/db run push
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-provisioned by Replit) |
| `SESSION_SECRET` | Secret for signing session cookies |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic proxy base URL |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI proxy base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini proxy base URL |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini API key |
| `NOTION_API_KEY` | Notion Internal Integration token (from notion.so/my-integrations) |
| `REPL_ID` | Replit app ID (auto-set) |
| `ISSUER_URL` | OIDC issuer (default: `https://replit.com/oidc`) |

> **Notion setup:** Create an Internal Integration at [notion.so/my-integrations](https://www.notion.so/my-integrations), copy the secret, and share at least one Notion page with the integration. SpecForge will create exported specs as child pages of the first accessible page.

---

## Database Schema

| Table | Purpose |
|---|---|
| `specs` | Core spec records — content, status, type, scores, aiModel, shareToken, webhookSecret, teamId |
| `spec_versions` | Version snapshots of every generation with triggeredBy and complexityScore |
| `conversations` | AI chat sessions linked to specs |
| `messages` | Individual chat messages |
| `notifications` | In-app notifications per user (type, title, message, specId, read) |
| `teams` | Team workspaces with name and owner |
| `team_members` | User↔team membership with role (owner/editor/viewer) |
| `users` | Authenticated user profiles (Replit Auth) |
| `sessions` | Auth session store |

---

## API Reference

All endpoints are prefixed `/api`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/specs` | List all specs |
| `POST` | `/specs` | Create a new spec |
| `GET` | `/specs/:id` | Get spec by ID |
| `DELETE` | `/specs/:id` | Delete spec |
| `POST` | `/specs/:id/stream` | SSE — stream generation in real time |
| `POST` | `/specs/:id/sync` | Trigger background re-generation |
| `GET` | `/specs/:id/versions` | List version history |
| `GET` | `/specs/:id/versions/:vid` | Get a specific version |
| `GET` | `/specs/:id/presence` | SSE — live viewer presence |
| `POST` | `/specs/:id/insights` | AI health analysis |
| `POST` | `/specs/:id/share` | Generate or retrieve public share link |
| `GET` | `/specs/share/:token` | Public share lookup (no auth) |
| `GET` | `/specs/:id/webhook` | Get or create GitHub webhook config |
| `POST` | `/specs/:id/chat` | Get or create AI chat session |
| `POST` | `/specs/:id/scaffold` | Generate code scaffold (returns JSON with files array) |
| `POST` | `/specs/:id/export/notion` | Push spec to Notion as a structured page |
| `GET` | `/specs/:id/export/docx` | Download spec as a Word document |
| `GET` | `/specs/recent` | Recent specs + stats |
| `GET` | `/teams` | List user's teams |
| `POST` | `/teams` | Create a team |
| `GET` | `/teams/:id` | Get team details + members |
| `POST` | `/teams/:id/members` | Add a member |
| `DELETE` | `/teams/:id/members/:userId` | Remove a member |
| `POST` | `/teams/:id/specs/:specId` | Assign spec to team |
| `DELETE` | `/teams/:id/specs/:specId` | Remove spec from team |
| `GET` | `/notifications` | List notifications with unread count |
| `GET` | `/notifications/stream` | SSE — real-time notification feed |
| `PUT` | `/notifications/read-all` | Mark all notifications read |
| `PUT` | `/notifications/:id/read` | Mark one notification read |
| `POST` | `/webhooks/github` | GitHub push webhook receiver (HMAC-SHA256 verified) |
| `GET` | `/auth/user` | Current session user |
| `GET` | `/login` | OIDC login redirect |
| `GET` | `/callback` | OIDC callback |
| `GET` | `/logout` | End session + OIDC end-session |

---

## License

MIT
