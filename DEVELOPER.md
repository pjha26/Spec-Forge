# SpecForge developer guide

SpecForge is a pnpm workspace. The Vite frontend lives in `artifacts/specforge`, the Express API in `artifacts/api-server`, and the PostgreSQL schema and migrations in `lib/db`. See [README.md](README.md) for setup and deployment commands.

## Generation

The frontend creates a spec, then starts its server-sent event stream at `POST /api/specs/:id/stream`. The server saves the draft and a version snapshot. Manual GitHub sync uses the same source lookup and saves a new version.

- Template mode is the default. It uses built-in sections and example diagrams, plus the submitted description or available public GitHub context.
- An optional same-host Ollama installation can generate prose and support manual AI tools. Disable cloud features in Ollama before enabling it. The API connects only to loopback.
- GitHub auto-sync requires `ENABLE_GITHUB_AUTO_SYNC=true`. Scheduled health and digest jobs are disabled.

## Access and deployment

Replit OIDC provides browser sessions backed by PostgreSQL. Local development can use `LOCAL_DEV=true`, which production rejects. Spec and team routes check membership or ownership. Public share links use owner-created tokens that can be revoked.

Keep one API instance for the demo while presence and notification subscriptions live in memory. Use `/api/healthz` for process health and `/api/readyz` for PostgreSQL readiness. Apply reviewed migrations before starting the deployment. CI runs the API integration tests against a disposable database.

Historical schema fields remain available for data created by earlier versions. Avoid deleting legacy columns or tables without checking the target database.
