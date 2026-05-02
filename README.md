# SpecForge

**AI-powered technical design document generator for developers, students, and hackathon builders.**

Drop in a GitHub URL or describe your project in plain text and SpecForge instantly produces a professional, structured technical specification — system design, API contracts, database schemas, or feature specs — powered by Claude AI.

---

## What it does

Most engineers skip writing specs because it takes too long. SpecForge eliminates that friction: describe your idea or paste a GitHub link and within seconds you have a complete, professional document you can share with your team, submit with a project, or use as a blueprint for implementation.

---

## Features

### Core Generation
- **4 document types** — System Design, API Design, Database Schema, Feature Spec
- **2 input modes** — GitHub repository URL (auto-analyzes repo name and structure) or plain-text description
- **Streaming output** — content appears token-by-token as Claude writes it, just like ChatGPT
- **Mermaid architecture diagrams** — automatically generated alongside the document (architecture diagrams, ER diagrams, sequence diagrams depending on spec type)
- **Complexity score** — AI-scored 1–10 rating with tech debt risk breakdown and a written summary

### Export & Sharing
- **PDF export** — clean print layout (sidebar, tabs, and UI chrome are hidden) via browser print dialog
- **Markdown download** — download the raw `.md` file for use in any editor or repository
- **Copy to clipboard** — one-click copy of the full document
- **Public share links** — generate a shareable URL (`/share/:token`) that anyone can read without logging in; tracks view count

### GitHub Integration
- **Manual sync** — re-generate the spec from the latest source with one click
- **GitHub webhook** — connect your repo so SpecForge auto-regenerates on every `git push` (HMAC-SHA256 verified)

### AI-Powered Extras
- **Ask Your Doc** — Claude-powered chat scoped to each spec; ask questions, request clarifications, get implementation advice
- **Intelligent Insights** — on-demand spec health analysis: completeness percentage, overall health rating (Excellent/Good/Fair/Poor), strengths, missing areas, improvement suggestions, and estimated implementation timeline

### Collaboration & Realtime
- **Real-time presence** — when multiple people view the same spec simultaneously, a live avatar bar appears showing who else is reading
- **Version history** — every generation is snapshotted; a timeline panel in the sidebar lets you browse past versions and open any historical document in a full preview modal
- **In-app notifications** — real-time bell icon with unread badge; get notified when a sync completes or fails, with a direct link back to the spec

### Platform
- **User authentication** — sign in with your Replit account; sessions persist across browser sessions
- **Spec history** — searchable, filterable list of all your generated documents
- **Keyboard shortcut** — `⌘K` / `Ctrl+K` opens the AI Assistant from anywhere in the app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js 24, Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| AI | Anthropic Claude Sonnet (claude-sonnet-4-6) |
| Auth | Replit Auth (OpenID Connect + PKCE) |
| Realtime | Server-Sent Events (SSE) |
| API contracts | OpenAPI 3.1 → Orval codegen → React Query hooks + Zod schemas |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
specforge/
├── artifacts/
│   ├── api-server/          # Express REST API (port 8080)
│   │   └── src/
│   │       ├── routes/      # specs, versions, presence, insights,
│   │       │                #   notifications, auth, webhooks
│   │       ├── lib/         # auth helpers, OIDC config
│   │       └── middlewares/ # auth middleware
│   └── specforge/           # React + Vite frontend
│       └── src/
│           ├── pages/       # home, spec generator, spec detail,
│           │                #   spec history, public share
│           └── components/  # layout, notification bell, presence bar,
│                            #   spec insights, version history, ...
├── lib/
│   ├── db/                  # Drizzle ORM schema + migrations
│   ├── api-spec/            # OpenAPI YAML + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validation schemas
│   ├── integrations-anthropic-ai/  # Anthropic SDK wrapper
│   └── replit-auth-web/     # Auth React hook + PKCE helpers
└── scripts/                 # Shared utility scripts
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
| `DATABASE_URL` | PostgreSQL connection string (auto-provisioned) |
| `SESSION_SECRET` | Secret for signing session cookies |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic proxy base URL |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key |
| `REPL_ID` | Replit app ID (auto-set) |
| `ISSUER_URL` | OIDC issuer (default: `https://replit.com/oidc`) |

---

## Database Schema

| Table | Purpose |
|---|---|
| `specs` | Core spec records — content, status, type, scores, tokens |
| `spec_versions` | Version snapshots of each generation |
| `conversations` | AI chat sessions linked to specs |
| `messages` | Individual chat messages |
| `notifications` | In-app notifications per user |
| `users` | Authenticated user profiles |
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
| `POST` | `/specs/:id/share` | Generate public share link |
| `GET` | `/specs/:id/webhook` | Get GitHub webhook config |
| `POST` | `/specs/:id/chat` | Get or create AI chat session |
| `GET` | `/specs/recent` | Recent specs + stats |
| `GET` | `/notifications` | List notifications |
| `GET` | `/notifications/stream` | SSE — real-time notification feed |
| `PUT` | `/notifications/read-all` | Mark all read |
| `PUT` | `/notifications/:id/read` | Mark one read |
| `POST` | `/webhooks/github` | GitHub push webhook receiver |
| `GET` | `/auth/user` | Current user session |
| `GET` | `/login` | OIDC login redirect |
| `GET` | `/callback` | OIDC callback |
| `GET` | `/logout` | End session |

---

## Roadmap — Advanced Features

### High Impact
- **DOCX / Word export** — convert Markdown to `.docx` so specs open directly in Microsoft Word or Google Docs
- **Diff viewer** — side-by-side comparison between any two versions in the history timeline
- **Team workspaces** — invite collaborators, assign roles (owner / editor / viewer), shared spec libraries
- **Spec templates** — community-contributed or custom templates pre-loaded for specific stacks (Next.js API, gRPC service, Kafka consumer, etc.)
- **Bulk generation** — paste a list of GitHub repos or feature descriptions and generate multiple specs in parallel

### AI Enhancements
- **Interactive spec editing** — inline AI suggestions as you edit sections, similar to Cursor for documents
- **Spec-to-code scaffold** — generate a project skeleton (file tree, boilerplate files) directly from a spec
- **Competitor analysis mode** — given a product description, generate a spec that benchmarks against known competitors
- **Spec Q&A with citations** — ask questions about the spec and get answers with line-level citations back to the source document
- **Multi-model support** — let users choose between Claude, GPT-4o, and Gemini for generation

### Collaboration
- **Live co-editing** — multiple users edit spec sections simultaneously with conflict resolution (like Google Docs)
- **Comments and annotations** — leave inline comments on specific sections, tag teammates
- **Approval workflow** — request sign-off from stakeholders; track who approved what and when
- **Slack / Teams integration** — post spec summaries or sync notifications to a channel
- **Export to Confluence / Notion** — push the generated document directly into your team's wiki

### Platform
- **CLI tool** — `npx specforge generate ./src` runs generation from the terminal and writes the spec to a file
- **VS Code extension** — generate or update specs from inside the editor, linked to the current file/project
- **GitHub Action** — automatically generate or refresh a `SPEC.md` in the repo on every PR
- **Spec quality score over time** — dashboard showing how completeness and complexity scores trend across versions
- **Usage analytics** — per-user and per-team metrics on generation volume, most-used spec types, average quality scores

---

## License

MIT
