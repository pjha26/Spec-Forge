/**
 * AI Spec Conflict Detector
 * POST /api/teams/:id/conflicts/analyze
 * GET  /api/teams/:id/conflicts
 * PATCH /api/teams/:id/conflicts/:conflictId
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { specConflictsTable } from "@workspace/db";
import { generateCompletion } from "../lib/model-router.js";

const router = Router();

interface ConflictPair {
  title: string;
  type: string;
  description: string;
  spec1Excerpt?: string;
  spec2Excerpt?: string;
  suggestion?: string;
  severity: "high" | "medium" | "low";
}

async function analyzeSpecPair(
  spec1: { id: number; title: string; content: string; specType: string },
  spec2: { id: number; title: string; content: string; specType: string },
): Promise<ConflictPair[]> {
  const prompt = `You are a senior architect auditing two technical specification documents for conflicts and inconsistencies.

Analyze these two specs and find ALL conflicts, inconsistencies, or integration risks between them.
Look for: data model conflicts (different field names/types for same entity), API contract mismatches, authentication assumption differences, naming convention clashes, duplicate responsibilities, missing cross-references.

Return ONLY valid JSON array (empty array if no conflicts found):
[
  {
    "title": "<short conflict title>",
    "type": "data_model|api_contract|auth|naming|responsibility|other",
    "description": "<2-3 sentences explaining the conflict and why it matters>",
    "spec1Excerpt": "<short excerpt from spec 1 showing the conflict>",
    "spec2Excerpt": "<short excerpt from spec 2 showing the conflict>",
    "suggestion": "<concrete suggestion to resolve>",
    "severity": "high|medium|low"
  }
]

SPEC 1 — "${spec1.title}" (${spec1.specType.replace(/_/g, " ")}):
${spec1.content.slice(0, 4000)}

SPEC 2 — "${spec2.title}" (${spec2.specType.replace(/_/g, " ")}):
${spec2.content.slice(0, 4000)}`;

  const raw = await generateCompletion({
    model: "claude-sonnet-4-6",
    system: "You are a senior architect. Find specification conflicts. Return only a JSON array.",
    userMessage: prompt,
    maxTokens: 3000,
  });

  try {
    const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const result = JSON.parse(cleaned);
    return Array.isArray(result) ? result : [];
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const result = JSON.parse(match[0]);
      return Array.isArray(result) ? result : [];
    }
    return [];
  }
}

router.post("/:id/conflicts/analyze", async (req, res) => {
  const teamId = Number(req.params.id);

  try {
    const specs = await db
      .select({ id: specsTable.id, title: specsTable.title, content: specsTable.content, specType: specsTable.specType })
      .from(specsTable)
      .where(eq(specsTable.teamId, teamId));

    if (specs.length < 2) {
      res.json({ message: "Need at least 2 specs in the team to detect conflicts", conflicts: [] });
      return;
    }

    // Delete old open conflicts for this team before re-analysis
    const { sql } = await import("drizzle-orm");
    await db.delete(specConflictsTable)
      .where(and(eq(specConflictsTable.teamId, teamId), eq(specConflictsTable.status, "open")));

    res.json({ message: "Analysis started", specCount: specs.length });

    // Fire-and-forget pairwise analysis
    (async () => {
      const pairs: [typeof specs[0], typeof specs[0]][] = [];
      for (let i = 0; i < specs.length; i++) {
        for (let j = i + 1; j < specs.length; j++) {
          pairs.push([specs[i], specs[j]]);
        }
      }

      for (const [s1, s2] of pairs) {
        try {
          const conflicts = await analyzeSpecPair(s1, s2);
          for (const c of conflicts) {
            await db.insert(specConflictsTable).values({
              teamId,
              spec1Id: s1.id,
              spec2Id: s2.id,
              conflictType: c.type,
              title: c.title,
              description: c.description,
              spec1Excerpt: c.spec1Excerpt ?? null,
              spec2Excerpt: c.spec2Excerpt ?? null,
              suggestion: c.suggestion ?? null,
              severity: c.severity,
              status: "open",
            });
          }
        } catch {}
      }
    })().catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Conflict analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.get("/:id/conflicts", async (req, res) => {
  const teamId = Number(req.params.id);
  try {
    const conflicts = await db
      .select()
      .from(specConflictsTable)
      .where(eq(specConflictsTable.teamId, teamId))
      .orderBy(desc(specConflictsTable.createdAt));

    res.json({ conflicts });
  } catch (err) {
    req.log.error({ err }, "Failed to list conflicts");
    res.status(500).json({ error: "Failed to list conflicts" });
  }
});

router.patch("/:id/conflicts/:conflictId", async (req, res) => {
  const teamId = Number(req.params.id);
  const conflictId = Number(req.params.conflictId);
  const { status } = req.body as { status?: "resolved" | "dismissed" };

  if (!status || !["resolved", "dismissed"].includes(status)) {
    res.status(400).json({ error: "status must be resolved or dismissed" });
    return;
  }

  try {
    await db.update(specConflictsTable).set({
      status,
      resolvedAt: new Date(),
    }).where(and(eq(specConflictsTable.id, conflictId), eq(specConflictsTable.teamId, teamId)));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update conflict");
    res.status(500).json({ error: "Failed to update conflict" });
  }
});

export default router;
