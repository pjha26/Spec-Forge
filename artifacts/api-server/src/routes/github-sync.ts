
import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { claimGeneration, runSpecGeneration } from "./specs";

const router = Router();

// Manual re-sync trigger
router.post("/:id/github-sync", async (req, res) => {
  const specId = Number(req.params.id);
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  if (spec.inputType !== "github_url") { res.status(400).json({ error: "Spec is not backed by a GitHub URL" }); return; }

  if (!await claimGeneration(spec.id, spec.userId)) { res.status(409).json({ error: "A generation is already running for this spec or the account is at its limit" }); return; }
  res.json({ status: "syncing", message: "Re-generation started", specId: spec.id });

  // Fire-and-forget regeneration
  runSpecGeneration(spec.id, req.user!.id).catch(err => req.log.error({ err }, "Sync failed"));
});

// Polling status endpoint
router.get("/:id/github-sync/status", async (req, res) => {
  const specId = Number(req.params.id);
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  res.json({
    status: spec.status,
    lastSyncedAt: spec.lastSyncedAt,
    inputType: spec.inputType,
    inputValue: spec.inputValue,
  });
});

export default router;
