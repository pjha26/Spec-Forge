/**
 * Spec dependency graph routes
 * POST /api/specs/dependencies/analyze  → AI extracts cross-spec dependencies
 * GET  /api/specs/dependencies           → return stored dependencies
 * DELETE /api/specs/dependencies         → clear and re-analyze
 */

import { Router } from "express";
import { db, specsTable, specDependenciesTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.get("/dependencies", async (req, res) => {
  try {
    const deps = await db.select().from(specDependenciesTable);
    const specs = await db
      .select({
        id: specsTable.id,
        title: specsTable.title,
        specType: specsTable.specType,
        status: specsTable.status,
      })
      .from(specsTable);

    res.json({ dependencies: deps, specs });
  } catch (err) {
    req.log.error({ err }, "Failed to get dependencies");
    res.status(500).json({ error: "Failed to get dependencies" });
  }
});

router.post("/dependencies/analyze", async (req, res) => {
  try {
    // Load all completed specs (titles + first 600 chars of content)
    const specs = await db
      .select({
        id: specsTable.id,
        title: specsTable.title,
        specType: specsTable.specType,
        content: specsTable.content,
      })
      .from(specsTable);

    const completedSpecs = specs.filter(s => s.content && s.content.length > 50);

    if (completedSpecs.length < 2) {
      res.json({ message: "Need at least 2 specs to analyze dependencies", dependencies: [] });
      return;
    }

    const specSummaries = completedSpecs
      .map(s => `ID:${s.id} TITLE:"${s.title}" TYPE:${s.specType}\nEXCERPT: ${s.content.slice(0, 600)}`)
      .join("\n\n---\n\n");

    const prompt = `You are analyzing technical specification documents to find dependencies and relationships between them.

Here are the specs:

${specSummaries}

Identify relationships between specs. For each relationship, output a JSON array item with:
- sourceSpecId: number (the spec that depends on or references the other)
- targetSpecId: number (the spec being depended upon)
- relationshipType: one of "depends_on" | "shares_data_model" | "uses_api" | "extends" | "conflicts_with"
- description: short string (max 80 chars) describing the relationship

Only include relationships that are clearly supported by the spec content. Output ONLY a JSON array, no markdown, no explanation:
[{"sourceSpecId": 1, "targetSpecId": 2, "relationshipType": "depends_on", "description": "Uses auth API defined here"}]

If no clear relationships exist, output: []`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { text: string }).text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      res.json({ dependencies: [], message: "No relationships found" });
      return;
    }

    const parsed: Array<{
      sourceSpecId: number;
      targetSpecId: number;
      relationshipType: string;
      description?: string;
    }> = JSON.parse(jsonMatch[0]);

    // Validate IDs exist
    const validIds = new Set(completedSpecs.map(s => s.id));
    const valid = parsed.filter(
      d => validIds.has(d.sourceSpecId) && validIds.has(d.targetSpecId) && d.sourceSpecId !== d.targetSpecId
    );

    // Clear old and insert new
    await db.delete(specDependenciesTable);
    if (valid.length > 0) {
      await db
        .insert(specDependenciesTable)
        .values(valid.map(d => ({
          sourceSpecId: d.sourceSpecId,
          targetSpecId: d.targetSpecId,
          relationshipType: d.relationshipType,
          description: d.description ?? null,
        })))
        .onConflictDoNothing();
    }

    const saved = await db.select().from(specDependenciesTable);
    res.json({ dependencies: saved, analyzed: completedSpecs.length });
  } catch (err) {
    req.log.error({ err }, "Dependency analysis failed");
    res.status(500).json({ error: "Dependency analysis failed" });
  }
});

export default router;
