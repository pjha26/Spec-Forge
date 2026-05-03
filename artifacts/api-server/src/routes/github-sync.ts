/**
 * T004: GitHub Auto-Sync
 *
 * POST /api/specs/:id/github-sync        → trigger manual re-sync from GitHub
 * POST /api/webhooks/github/:id          → GitHub push webhook (auto-regenerate)
 * GET  /api/specs/:id/github-sync/status → polling endpoint for sync status
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import { streamCompletion, isValidModel } from "../lib/model-router.js";
import { SPEC_PROMPTS } from "./specs.js";

const router = Router();

// Manual re-sync trigger
router.post("/:id/github-sync", async (req, res) => {
  const specId = Number(req.params.id);
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  if (spec.inputType !== "github_url") { res.status(400).json({ error: "Spec is not backed by a GitHub URL" }); return; }

  res.json({ status: "syncing", message: "Re-generation started", specId: spec.id });

  // Fire-and-forget regeneration
  regenerateFromGitHub(spec).catch(() => {});
});

// GitHub push webhook
router.post("/webhooks/github/:id", async (req, res) => {
  const specId = Number(req.params.id);
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }

  // Validate webhook signature if secret is configured
  if (spec.webhookSecret) {
    const sig = req.headers["x-hub-signature-256"] as string;
    if (!sig) { res.status(401).json({ error: "Missing signature" }); return; }
    const expected = "sha256=" + createHmac("sha256", spec.webhookSecret).update(JSON.stringify(req.body)).digest("hex");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).json({ error: "Invalid signature" }); return;
    }
  }

  // Only re-sync on push events to the default branch
  const event = req.headers["x-github-event"];
  if (event !== "push") { res.json({ ignored: true, reason: "Not a push event" }); return; }

  const payload = req.body;
  const ref = payload?.ref ?? "";
  const defaultBranch = payload?.repository?.default_branch ?? "main";
  if (ref !== `refs/heads/${defaultBranch}`) {
    res.json({ ignored: true, reason: `Push to ${ref}, not default branch` });
    return;
  }

  res.json({ status: "syncing", message: "Webhook received, re-generating…" });

  await db.update(specsTable).set({ lastSyncedAt: new Date(), updatedAt: new Date() }).where(eq(specsTable.id, specId));
  regenerateFromGitHub(spec).catch(() => {});
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

async function regenerateFromGitHub(spec: typeof specsTable.$inferSelect) {
  await db.update(specsTable).set({ status: "generating", updatedAt: new Date() }).where(eq(specsTable.id, spec.id));

  const model = isValidModel(spec.aiModel) ? spec.aiModel : "claude-sonnet-4-6";
  const system = SPEC_PROMPTS[spec.specType] ?? SPEC_PROMPTS.feature_spec;
  const userMessage = `Re-analyze and regenerate a ${spec.specType.replace(/_/g, " ")} for this GitHub repository: ${spec.inputValue}\n\nCreate a detailed, up-to-date professional document reflecting the latest codebase state.`;

  let content = "";
  try {
    for await (const chunk of streamCompletion({ model, system, userMessage, maxTokens: 8192 })) {
      content += chunk;
    }
    await db.update(specsTable).set({
      content,
      status: "completed",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(specsTable.id, spec.id));
  } catch {
    await db.update(specsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(specsTable.id, spec.id));
  }
}

export { regenerateFromGitHub };
export default router;
