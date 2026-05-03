# SpecForge

**AI-powered technical spec generator for developers, students, and hackathon builders.**

Drop in a GitHub URL or describe your project in plain text and SpecForge instantly produces a professional, structured technical specification — system designs, API contracts, database schemas, or feature specs — powered by your choice of AI model.

---

## Features

### Core Generation
- **4 spec types** — System Design, API Design, Database Schema, Feature Spec
- **2 input modes** — GitHub repository URL or plain-text description
- **Streaming output** — content appears token-by-token in real time as the AI writes
- **Mermaid architecture diagrams** — auto-generated alongside the document (architecture, ER, sequence diagrams depending on spec type)
- **Complexity score** — AI-scored 1–10 rating with tech debt risk breakdown and written summary
- **8 starter templates** — SaaS API, Mobile App, Real-time Chat, Data Pipeline, E-commerce Platform, Microservices, ML API, Multi-tenant Database

### Multi-Model AI
- **Claude Sonnet** (Anthropic) — default, best for long-form structured documents
- **Claude Haiku** (Anthropic) — faster and lighter
- **GPT-5** (OpenAI) — alternative with strong reasoning
- **Gemini 2.5 Pro / Flash** (Google) — Flash optimised for speed
- Model selector on the generator page; choice is stored per spec

### Export & Sharing
- **Public share links** — generate a token-based URL (`/share/:token`) anyone can read without logging in; view count tracked
- **PDF export** — clean browser-print layout via `@media print` CSS; sidebar, nav, and UI chrome hidden automatically
- **Notion export** — push the full spec as a structured Notion page (headings, bullets, code blocks) directly into your workspace
- **Word / DOCX export** — full Markdown-to-DOCX conversion; downloads a formatted `.docx` file
- **Markdown download** — raw `.md` file for use in any editor or repo
- **Copy to clipboard** — one-click copy of the full document
- **Code scaffold** — generate 8–15 real starter files (README, package.json, source files, config) from any spec and download as a ZIP

### GitHub Integration
- **GitHub Auto-sync** — for specs generated from a GitHub repo, a manual sync button re-reads the latest source and regenerates the spec
- **GitHub Webhook** — auto-regenerates on every `git push`; HMAC-SHA256 verified; fires in-app notification on completion or failure

### AI-Powered Extras
- **Ask Your Doc** — Claude-powered chat scoped to each spec; ask questions, request clarifications, get implementation advice
- **Intelligent Insights** — on-demand spec health analysis: completeness %, overall health rating, strengths, missing areas, improvement suggestions, and estimated implementation timeline

### Collaboration & Realtime
- **Real-time presence** — when multiple people view the same spec simultaneously, a live avatar bar appears
- **Version history** — every generation is snapshotted; timeline panel lets you browse all past versions, preview any historical document in a full modal, and see a color-coded diff
- **In-app notifications** — real-time bell icon with unread badge; notified when sync completes or fails; mark single or all read
- **Team workspaces** — create teams, invite members with owner/editor/viewer roles, assign specs to teams

### Authentication
- **Replit Auth** — full session-based authentication via OpenID Connect + PKCE. All `/app/*` routes are protected behind an `AuthGate` that shows a branded login prompt to unauthenticated visitors. User info displayed in the layout header.

### Appearance
- **6 built-in themes** — Midnight (default), Ember, Verdant, Crimson, Gotham, and Daylight (light mode)
- **3 font options** — Inter, JetBrains Mono, Geist Mono
- **4 syntax highlight themes** — Dracula, Nord, Catppuccin, GitHub Dark
- **Live theme switching** — all preferences apply instantly without a page reload, persisted to `localStorage`

---

## Themes

| Theme | Mode | Primary Color | Vibe |
|---|---|---|---|
| Midnight | Dark | Electric teal `#00b4d8` | Deep space navy — the default |
| Ember | Dark | Amber gold `#f59e0b` | Warm forge charcoal |
| Verdant | Dark | Electric emerald `#10b981` | Obsidian green |
| Crimson | Dark | Electric rose `#f43f5e` | Dark with attitude |
| **Gotham** | **Dark** | **Bat-signal yellow `#F5C400`** | **Dark Knight — pure black & signal yellow** |
| Daylight | Light | Indigo `#4f6ef7` | Clean warm cream |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18+, Vite, TypeScript, Tailwind CSS v4 |
| UI Components | shadcn/ui, Radix UI primitives |
| Animation | Framer Motion, GSAP |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Replit-managed), Drizzle ORM |
| AI | Anthropic Claude, OpenAI GPT, Google Gemini |
| Auth | Replit Auth — OpenID Connect + PKCE, sessions in PostgreSQL |
| Realtime | Server-Sent Events (SSE) — presence, notifications, generation stream |
| API Contract | OpenAPI 3.1 → Orval codegen → React Query hooks + Zod schemas |
| Monorepo | pnpm workspaces |
| Export | `docx` (Word), `jszip` (scaffold ZIP), Notion REST API, `window.print()` (PDF) |

---

## Project Structure

```
specforge/
├── artifacts/
│   ├── api-server/              # Express REST API (port 8080, proxied at /api)
│   │   └── src/
│   │       ├── routes/          # specs, versions, share, github-sync, notifications,
│   │       │                    #   auth, webhooks, teams, preferences, stats
│   │       ├── middlewares/     # authMiddleware — injects user on every request
│   │       ├── db/              # Drizzle schema + migrations
│   │       └── lib/             # anthropic client, github client, model router
│   ├── specforge/               # React + Vite frontend (proxied at /)
│   │   └── src/
│   │       ├── pages/           # landing, home, spec-detail, specs, search,
│   │       │                    #   shared-spec, teams, team-detail
│   │       ├── components/      # layout, auth-gate, theme-provider, theme-switcher,
│   │       │                    #   preferences-modal, notification-bell, presence-bar,
│   │       │                    #   spec-chat, spec-insights, spec-version-history,
│   │       │                    #   spec-scaffold, mermaid-diagram, complexity-score-card
│   │       └── lib/             # theme.ts (6 themes), utils
│   └── mockup-sandbox/          # Isolated Vite server for Canvas design exploration
├── lib/
│   ├── db/                      # Shared Drizzle ORM schema + migrations
│   ├── api-spec/                # OpenAPI YAML + Orval codegen config
│   ├── api-client-react/        # Generated React Query hooks
│   ├── api-zod/                 # Generated Zod validation schemas
│   └── replit-auth-web/         # Shared useAuth() React hook
└── scripts/                     # Shared utility scripts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A Replit account (for Auth and PostgreSQL)
- An Anthropic API key (set as environment secret)

### Local Development

```bash
# Install all workspace dependencies
pnpm install
```

The API server and frontend each run as separate workflows. In Replit they start automatically. For local development without Replit Auth, set:

```
LOCAL_DEV=true
VITE_LOCAL_DEV=true
```

This bypasses authentication and injects a mock `local-dev-user` so the full app is accessible immediately (a "LOCAL DEV MODE" banner appears at the top of the UI as a reminder).

### Key Commands

```bash
# Full typecheck (libs + all packages)
pnpm run typecheck

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes to PostgreSQL
pnpm --filter @workspace/db run push
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-provisioned by Replit) |
| `SESSION_SECRET` | Yes | Secret for signing session cookies |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for spec generation |
| `NOTION_API_KEY` | Optional | Notion Internal Integration token for Notion export |
| `LOCAL_DEV` | Dev only | Set `true` to bypass Replit Auth |
| `VITE_LOCAL_DEV` | Dev only | Shows the LOCAL DEV MODE banner in the UI |

---

## API Reference

All endpoints are prefixed `/api` and require authentication unless noted.

### Auth
| Method | Path | Description |
|---|---|---|
| GET | `/auth/user` | Returns current session user |
| GET | `/login` | Initiates Replit Auth OAuth flow |
| GET | `/callback` | OAuth callback handler |
| GET | `/logout` | Clears session and ends OIDC session |

### Specs
| Method | Path | Description |
|---|---|---|
| GET | `/specs` | List all specs for the current user |
| GET | `/specs/recent` | Last 5 specs + usage stats |
| GET | `/specs/:id` | Get a single spec |
| POST | `/specs` | Create and trigger generation |
| DELETE | `/specs/:id` | Delete a spec |
| POST | `/specs/:id/stream` | SSE — stream generation in real time |
| POST | `/specs/:id/sync` | Trigger a background re-generation |
| GET | `/specs/:id/versions` | List version history |
| GET | `/specs/:id/versions/:vid` | Get a specific version |

### Sharing & Export
| Method | Path | Description |
|---|---|---|
| POST | `/specs/:id/share` | Generate or retrieve a public share token |
| GET | `/specs/share/:token` | Fetch a shared spec — no auth required |
| POST | `/specs/:id/export/notion` | Push spec to Notion as a structured page |
| GET | `/specs/:id/export/docx` | Download spec as a Word document |

### GitHub
| Method | Path | Description |
|---|---|---|
| POST | `/specs/:id/github-sync` | Manually trigger a resync from GitHub |
| GET | `/specs/:id/webhook` | Get or create GitHub webhook config |
| POST | `/webhooks/github` | GitHub push webhook receiver (HMAC-SHA256 verified) |

### AI Extras
| Method | Path | Description |
|---|---|---|
| POST | `/specs/:id/insights` | Run AI spec health analysis |
| POST | `/specs/:id/chat` | Get or create AI chat session for a spec |
| POST | `/specs/:id/scaffold` | Generate a code scaffold (returns JSON with files array) |

### Teams
| Method | Path | Description |
|---|---|---|
| GET | `/teams` | List the current user's teams |
| POST | `/teams` | Create a team |
| GET | `/teams/:id` | Get team details + members |
| POST | `/teams/:id/members` | Add a member |
| DELETE | `/teams/:id/members/:userId` | Remove a member |
| POST | `/teams/:id/specs/:specId` | Assign a spec to a team |
| DELETE | `/teams/:id/specs/:specId` | Remove a spec from a team |

### Notifications & Preferences
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List notifications with unread count |
| GET | `/notifications/stream` | SSE — real-time notification feed |
| PUT | `/notifications/read-all` | Mark all notifications read |
| PUT | `/notifications/:id/read` | Mark one notification read |
| GET | `/preferences` | Load user preferences |
| PUT | `/preferences` | Save user preferences |
| GET | `/stats` | Usage statistics |

---

## Database Schema

| Table | Purpose |
|---|---|
| `specs` | Core spec records — content, status, type, scores, aiModel, shareToken, webhookSecret, teamId |
| `spec_versions` | Version snapshots of every generation |
| `conversations` | AI chat sessions linked to specs |
| `messages` | Individual chat messages |
| `notifications` | In-app notifications per user |
| `teams` | Team workspaces with name and owner |
| `team_members` | User ↔ team membership with role (owner / editor / viewer) |
| `users` | Authenticated user profiles (Replit Auth) |
| `sessions` | Auth session store |

---

## Recommended Improvements

### High Impact
1. **Spec versioning UI** — the backend already snapshots every generation; surfacing a full diff view in the frontend with `+`/`-` color coding would let users track how their spec evolves over time.
2. **Webhook-triggered auto-sync completion** — complete the GitHub webhook flow so specs regenerate automatically on push with no manual step required.
3. **Semantic search** — replace the current text search with vector embeddings (pgvector) so users can find specs by meaning and concept, not just keywords.
4. **Custom section templates** — let users define reusable sections (e.g. "Our standard security checklist") injected at a fixed position in every new spec.

### Medium Impact
5. **Spec quality scoring** — after generation, run a secondary AI pass that scores completeness, consistency, and security coverage and surfaces specific gaps with suggested fixes.
6. **Mobile-responsive layout** — add a collapsible bottom tab bar for the sidebar on small screens so the app is usable on phones.
7. **Dark/light auto mode** — add a "System" option to the theme picker that follows `prefers-color-scheme` automatically.
8. **Keyboard shortcut palette** — `cmd+k` command palette for quick navigation, spec creation, and theme switching without reaching for the mouse.

### Polish
9. **Onboarding checklist** — a persistent first-run checklist (generate your first spec, try GitHub sync, share a spec) to help new users discover features.
10. **Spec tagging** — add free-form tags to specs and filter the spec list by tag, complementing the existing type and status filters.
11. **AI model comparison** — a side-by-side mode that runs the same prompt through two models simultaneously so users can compare output quality before committing to one.

---

## License

MIT
