/**
 * Public sharing routes — T001: Public Sharing Links
 *
 * POST /api/specs/:id/share    → generate (or return existing) share token
 * GET  /api/specs/share/:token → public read, no auth required
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

// Generate / return existing share link for a spec
router.post("/:id/share", async (req, res) => {
  const specId = Number(req.params.id);
  if (!specId) { res.status(400).json({ error: "Invalid spec ID" }); return; }

  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }

  try {
    let shareToken = spec.shareToken;
    if (!shareToken) {
      shareToken = randomBytes(16).toString("hex");
      await db.update(specsTable).set({ shareToken, updatedAt: new Date() }).where(eq(specsTable.id, specId));
    }

    const origin = req.headers.origin ?? `https://${req.headers.host}`;
    const shareUrl = `${origin}/share/${shareToken}`;

    res.json({ shareUrl, shareToken, viewCount: spec.viewCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create share link");
    res.status(500).json({ error: "Failed to create share link" });
  }
});

// Public endpoint — no auth required
router.get("/share/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) { res.status(400).json({ error: "Invalid token" }); return; }

  const [spec] = await db.select().from(specsTable).where(eq(specsTable.shareToken, token));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }

  // Increment view count in background
  db.update(specsTable)
    .set({ viewCount: (spec.viewCount ?? 0) + 1, updatedAt: new Date() })
    .where(eq(specsTable.id, spec.id))
    .catch(() => {});

  res.json({
    id: spec.id,
    title: spec.title,
    specType: spec.specType,
    content: spec.content,
    mermaidDiagram: spec.mermaidDiagram,
    complexityScore: spec.complexityScore,
    complexitySummary: spec.complexitySummary,
    aiModel: spec.aiModel,
    createdAt: spec.createdAt,
    viewCount: (spec.viewCount ?? 0) + 1,
  });
});

export default router;
