import { Router } from "express";
import { db, specsTable, specVersionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/:id/versions", async (req, res) => {
  const specId = Number(req.params.id);
  if (isNaN(specId)) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  const [spec] = await db.select({ id: specsTable.id }).from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) {
    res.status(404).json({ error: "Spec not found" });
    return;
  }

  const versions = await db
    .select({
      id: specVersionsTable.id,
      specId: specVersionsTable.specId,
      complexityScore: specVersionsTable.complexityScore,
      triggeredBy: specVersionsTable.triggeredBy,
      createdAt: specVersionsTable.createdAt,
    })
    .from(specVersionsTable)
    .where(eq(specVersionsTable.specId, specId))
    .orderBy(desc(specVersionsTable.createdAt));

  res.json({
    versions: versions.map(v => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    })),
  });
});

router.get("/:id/versions/:versionId", async (req, res) => {
  const specId = Number(req.params.id);
  const versionId = Number(req.params.versionId);

  if (isNaN(specId) || isNaN(versionId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [version] = await db
    .select()
    .from(specVersionsTable)
    .where(eq(specVersionsTable.id, versionId));

  if (!version || version.specId !== specId) {
    res.status(404).json({ error: "Version not found" });
    return;
  }

  res.json({
    ...version,
    createdAt: version.createdAt.toISOString(),
  });
});

export async function saveSpecVersion(
  specId: number,
  data: {
    content: string;
    complexityScore?: number | null;
    techDebtRisks?: string | null;
    complexitySummary?: string | null;
    mermaidDiagram?: string | null;
    triggeredBy?: string;
  }
) {
  await db.insert(specVersionsTable).values({
    specId,
    content: data.content,
    complexityScore: data.complexityScore ?? null,
    techDebtRisks: data.techDebtRisks ?? null,
    complexitySummary: data.complexitySummary ?? null,
    mermaidDiagram: data.mermaidDiagram ?? null,
    triggeredBy: data.triggeredBy ?? "manual",
  });
}

export default router;
