/**
 * Spec Health Monitoring
 * GET  /api/specs/:id/health
 * POST /api/specs/:id/health/analyze
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { specHealthTable } from "@workspace/db";
import { generateCompletion } from "../lib/model-router.js";

const router = Router();

export async function runHealthAnalysis(specId: number, triggeredBy = "manual"): Promise<void> {
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec || spec.status !== "completed") return;

  let repoContext = "";
  if (spec.inputType === "github_url") {
    try {
      const match = spec.inputValue.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
          headers: { "User-Agent": "SpecForge/1.0", Accept: "application/vnd.github.v3+json" },
        });
        if (treeRes.ok) {
          const tree = await treeRes.json() as { tree: Array<{ path: string; type: string }> };
          const files = (tree.tree ?? []).filter((f: any) => f.type === "blob").map((f: any) => f.path).slice(0, 120);
          repoContext = `\nCURRENT REPOSITORY FILE TREE:\n${files.join("\n")}`;

          const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, {
            headers: { "User-Agent": "SpecForge/1.0", Accept: "application/vnd.github.v3+json" },
          });
          if (commitsRes.ok) {
            const commits = await commitsRes.json() as Array<{ commit: { message: string } }>;
            const commitLog = commits.map((c: any) => `- ${c.commit.message.split("\n")[0]}`).join("\n");
            repoContext += `\n\nRECENT COMMITS (last 10):\n${commitLog}`;
          }
        }
      }
    } catch {}
  }

  const prompt = `You are a senior engineer auditing how well a codebase aligns with its technical specification.

Analyze the spec against ${spec.inputType === "github_url" ? "the repository structure and recent commits" : "typical implementation patterns"} and produce a health report.

Look for:
- Files or modules in the repo not mentioned in the spec
- Spec sections with no corresponding implementation evidence
- Naming inconsistencies between spec and code
- Features described in spec that seem incomplete based on recent commit activity

Return ONLY valid JSON:
{
  "alignmentScore": <integer 0-100, where 100 = perfectly aligned>,
  "summary": "<2-3 sentence executive summary of spec health>",
  "driftItems": [
    {
      "type": "missing_section|new_file_not_in_spec|implementation_differs|renamed",
      "title": "<short title>",
      "description": "<1-2 sentences>",
      "severity": "high|medium|low",
      "filePath": "<optional: relevant file path>",
      "specSection": "<optional: relevant spec section heading>"
    }
  ]
}

SPEC TITLE: ${spec.title}
SPEC TYPE: ${spec.specType.replace(/_/g, " ")}
GITHUB URL: ${spec.inputType === "github_url" ? spec.inputValue : "N/A (description-based spec)"}

SPEC CONTENT (first 5000 chars):
${spec.content.slice(0, 5000)}
${repoContext}`;

  const raw = await generateCompletion({
    model: "claude-sonnet-4-6",
    system: "You audit spec vs codebase alignment. Return only valid JSON.",
    userMessage: prompt,
    maxTokens: 3000,
  });

  let result: { alignmentScore: number; summary: string; driftItems: any[] };
  try {
    const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    result = JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) result = JSON.parse(match[0]);
    else throw new Error("Failed to parse health analysis");
  }

  await db.insert(specHealthTable).values({
    specId,
    alignmentScore: Math.max(0, Math.min(100, result.alignmentScore ?? 50)),
    driftItems: Array.isArray(result.driftItems) ? result.driftItems : [],
    summary: result.summary ?? "Analysis complete.",
    triggeredBy,
  });
}

router.get("/:id/health", async (req, res) => {
  const specId = Number(req.params.id);
  try {
    const [report] = await db
      .select()
      .from(specHealthTable)
      .where(eq(specHealthTable.specId, specId))
      .orderBy(desc(specHealthTable.createdAt))
      .limit(1);

    res.json({ report: report ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to get health report");
    res.status(500).json({ error: "Failed to get health report" });
  }
});

router.post("/:id/health/analyze", async (req, res) => {
  const specId = Number(req.params.id);
  try {
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
    if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
    if (spec.status !== "completed") { res.status(400).json({ error: "Spec must be completed before health analysis" }); return; }

    res.json({ message: "Health analysis started" });
    runHealthAnalysis(specId, "manual").catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to trigger health analysis");
    res.status(500).json({ error: "Failed to trigger analysis" });
  }
});

export default router;
