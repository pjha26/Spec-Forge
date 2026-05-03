/**
 * Collaborative spec audit feature
 *
 * GET    /api/specs/:id/annotations          → list all annotations
 * POST   /api/specs/:id/annotations          → create annotation (owner/editor/auditor)
 * PATCH  /api/specs/:id/annotations/:aId     → update own annotation
 * DELETE /api/specs/:id/annotations/:aId     → delete (own or team-owner can delete any)
 *
 * POST   /api/specs/:id/audit                → run AI-assisted audit
 * GET    /api/specs/:id/audit/latest         → fetch latest audit run
 *
 * POST   /api/specs/:id/commit-to-github     → commit SPEC.md to repo (owner + GitHub-backed)
 */

import { Router, type Request, type Response } from "express";
import { db, specsTable, specAnnotationsTable, specAuditRunsTable, teamMembersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { AuthedRequest } from "../middlewares/authMiddleware.js";
import { streamCompletion } from "../lib/model-router.js";

const router = Router({ mergeParams: true });

function requireUser(req: Request, res: Response): req is Request & AuthedRequest {
  const ar = req as AuthedRequest;
  if (!ar.user) { res.status(401).json({ error: "Authentication required" }); return false; }
  return true;
}

async function getSpec(id: number) {
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, id));
  return spec ?? null;
}

async function getTeamRole(specId: number, userId: string): Promise<string | null> {
  const spec = await getSpec(specId);
  if (!spec) return null;
  if (!spec.teamId) return null;
  const [membership] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, spec.teamId), eq(teamMembersTable.userId, userId)));
  return membership?.role ?? null;
}

// ── List annotations ──────────────────────────────────────────────────────────
router.get("/:id/annotations", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const specId = Number(req.params.id);
  if (isNaN(specId)) { res.status(400).json({ error: "Invalid spec id" }); return; }

  const annotations = await db
    .select()
    .from(specAnnotationsTable)
    .where(eq(specAnnotationsTable.specId, specId))
    .orderBy(desc(specAnnotationsTable.createdAt));

  res.json(annotations.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })));
});

// ── Create annotation ─────────────────────────────────────────────────────────
router.post("/:id/annotations", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const username = (req as AuthedRequest).user!.name ?? userId;
  const specId = Number(req.params.id);
  if (isNaN(specId)) { res.status(400).json({ error: "Invalid spec id" }); return; }

  const role = await getTeamRole(specId, userId);
  if (role === "viewer") { res.status(403).json({ error: "Viewers cannot add annotations" }); return; }

  const { selectedText, sectionTitle, status, comment } = req.body as {
    selectedText?: string; sectionTitle?: string;
    status?: "verified" | "outdated" | "missing"; comment?: string;
  };

  if (!status || !["verified", "outdated", "missing"].includes(status)) {
    res.status(400).json({ error: "status must be verified, outdated, or missing" }); return;
  }

  const [annotation] = await db
    .insert(specAnnotationsTable)
    .values({
      specId,
      userId,
      username,
      selectedText: selectedText?.trim() ?? "",
      sectionTitle: sectionTitle?.trim() ?? "",
      status,
      comment: comment?.trim() ?? "",
    })
    .returning();

  res.status(201).json({ ...annotation, createdAt: annotation.createdAt.toISOString(), updatedAt: annotation.updatedAt.toISOString() });
});

// ── Update annotation ─────────────────────────────────────────────────────────
router.patch("/:id/annotations/:aId", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const specId = Number(req.params.id);
  const aId = Number(req.params.aId);
  if (isNaN(specId) || isNaN(aId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [annotation] = await db.select().from(specAnnotationsTable).where(eq(specAnnotationsTable.id, aId));
  if (!annotation || annotation.specId !== specId) { res.status(404).json({ error: "Annotation not found" }); return; }
  if (annotation.userId !== userId) { res.status(403).json({ error: "Can only edit your own annotations" }); return; }

  const { status, comment, sectionTitle } = req.body as { status?: string; comment?: string; sectionTitle?: string };
  const validStatus = (["verified", "outdated", "missing"] as const).includes(status as "verified") ? status as "verified" | "outdated" | "missing" : annotation.status;

  const [updated] = await db
    .update(specAnnotationsTable)
    .set({ status: validStatus, comment: comment?.trim() ?? annotation.comment, sectionTitle: sectionTitle?.trim() ?? annotation.sectionTitle, updatedAt: new Date() })
    .where(eq(specAnnotationsTable.id, aId))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// ── Delete annotation ─────────────────────────────────────────────────────────
router.delete("/:id/annotations/:aId", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const specId = Number(req.params.id);
  const aId = Number(req.params.aId);
  if (isNaN(specId) || isNaN(aId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [annotation] = await db.select().from(specAnnotationsTable).where(eq(specAnnotationsTable.id, aId));
  if (!annotation || annotation.specId !== specId) { res.status(404).json({ error: "Annotation not found" }); return; }

  const role = await getTeamRole(specId, userId);
  if (annotation.userId !== userId && role !== "owner") {
    res.status(403).json({ error: "Only the annotation author or team owner can delete it" }); return;
  }

  await db.delete(specAnnotationsTable).where(eq(specAnnotationsTable.id, aId));
  res.json({ success: true });
});

// ── AI-assisted audit ─────────────────────────────────────────────────────────
router.post("/:id/audit", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const specId = Number(req.params.id);
  if (isNaN(specId)) { res.status(400).json({ error: "Invalid spec id" }); return; }

  const spec = await getSpec(specId);
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  if (spec.status !== "completed" || !spec.content) {
    res.status(400).json({ error: "Spec must be completed before auditing" }); return;
  }

  const [run] = await db
    .insert(specAuditRunsTable)
    .values({ specId, triggeredBy: userId, status: "running" })
    .returning();

  res.status(202).json({ runId: run.id, status: "running" });

  (async () => {
    try {
      let context = "";
      if (spec.inputType === "github_url") {
        const ghToken = process.env.GITHUB_TOKEN ?? "";
        const match = spec.inputValue.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          const [, owner, repo] = match;
          const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
          if (ghToken) headers.Authorization = `Bearer ${ghToken}`;
          const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers });
          if (treeRes.ok) {
            const tree = await treeRes.json() as { tree: Array<{ path: string; type: string }> };
            const files = tree.tree.filter(f => f.type === "blob").map(f => f.path).slice(0, 200);
            const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`, { headers });
            let commitLog = "";
            if (commitsRes.ok) {
              const commits = await commitsRes.json() as Array<{ commit: { message: string; author: { date: string } }; sha: string }>;
              commitLog = commits.map(c => `[${c.sha.slice(0, 7)}] ${c.commit.message.split("\n")[0]}`).join("\n");
              await db.update(specAuditRunsTable).set({ commitSha: commits[0]?.sha ?? null }).where(eq(specAuditRunsTable.id, run.id));
            }
            context = `\n\nREPO FILE TREE (${files.length} files):\n${files.join("\n")}\n\nRECENT COMMITS:\n${commitLog}`;
          }
        }
      } else {
        context = `\n\nINPUT SOURCE:\n${spec.inputValue.slice(0, 2000)}`;
      }

      const systemPrompt = `You are a senior technical auditor. Your job is to compare a technical specification document against the actual state of a codebase and identify discrepancies, outdated information, and missing sections.

Return a JSON object with this exact shape:
{
  "summary": "2-3 sentence overall assessment",
  "discrepancies": [
    {
      "section": "section heading from the spec",
      "issue": "specific problem description",
      "severity": "high|medium|low",
      "suggestion": "how to fix it"
    }
  ]
}

Severity guide:
- high: spec describes something that contradicts the actual codebase
- medium: spec is partially outdated or incomplete
- low: minor inaccuracy or style/terminology issue

Return ONLY the JSON object, no markdown fences.`;

      const userMsg = `TECHNICAL SPEC:\n${spec.content.slice(0, 8000)}${context}`;

      let fullResponse = "";
      for await (const chunk of streamCompletion({ model: "claude-sonnet-4-6", system: systemPrompt, userMessage: userMsg, maxTokens: 2000 })) {
        fullResponse += chunk;
      }

      const parsed = JSON.parse(fullResponse.trim()) as { summary: string; discrepancies: Array<{ section: string; issue: string; severity: string; suggestion: string }> };

      await db.update(specAuditRunsTable)
        .set({ status: "completed", summary: parsed.summary, discrepancies: parsed.discrepancies as any, completedAt: new Date() })
        .where(eq(specAuditRunsTable.id, run.id));
    } catch {
      await db.update(specAuditRunsTable)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(specAuditRunsTable.id, run.id));
    }
  })();
});

// ── Latest audit run ──────────────────────────────────────────────────────────
router.get("/:id/audit/latest", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const specId = Number(req.params.id);
  if (isNaN(specId)) { res.status(400).json({ error: "Invalid spec id" }); return; }

  const [run] = await db
    .select()
    .from(specAuditRunsTable)
    .where(eq(specAuditRunsTable.specId, specId))
    .orderBy(desc(specAuditRunsTable.createdAt))
    .limit(1);

  if (!run) { res.status(404).json({ error: "No audit run found" }); return; }

  res.json({
    ...run,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  });
});

// ── Commit SPEC.md to GitHub ──────────────────────────────────────────────────
router.post("/:id/commit-to-github", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const specId = Number(req.params.id);
  if (isNaN(specId)) { res.status(400).json({ error: "Invalid spec id" }); return; }

  const spec = await getSpec(specId);
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  if (spec.inputType !== "github_url") { res.status(400).json({ error: "Spec must be backed by a GitHub URL" }); return; }
  if (!spec.content) { res.status(400).json({ error: "Spec has no content to commit" }); return; }

  const role = await getTeamRole(specId, userId);
  if (role !== "owner") { res.status(403).json({ error: "Only team owners can commit specs back to GitHub" }); return; }

  const token = process.env.GITHUB_TOKEN;
  if (!token) { res.status(500).json({ error: "GITHUB_TOKEN not configured on server" }); return; }

  const match = spec.inputValue.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) { res.status(400).json({ error: "Cannot parse GitHub owner/repo from spec URL" }); return; }
  const [, owner, repo] = match;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/SPEC.md`;

  let sha: string | undefined;
  const existingRes = await fetch(contentsUrl, { headers });
  if (existingRes.ok) {
    const existing = await existingRes.json() as { sha: string };
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message: `docs: update SPEC.md via SpecForge [${new Date().toISOString().slice(0, 10)}]`,
    content: Buffer.from(spec.content).toString("base64"),
    committer: JSON.stringify({ name: "SpecForge", email: "specforge@noreply" }),
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(contentsUrl, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!putRes.ok) {
    const err = await putRes.json() as { message?: string };
    res.status(putRes.status).json({ error: err.message ?? "GitHub API error" }); return;
  }

  const result = await putRes.json() as { commit: { sha: string; html_url: string } };
  res.json({ success: true, commitSha: result.commit.sha, commitUrl: result.commit.html_url });
});

export default router;
