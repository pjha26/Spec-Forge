/**
 * Outbound webhook management (Zapier / Make.com / custom)
 * GET    /api/integrations/webhooks
 * POST   /api/integrations/webhooks
 * PUT    /api/integrations/webhooks/:id
 * DELETE /api/integrations/webhooks/:id
 * POST   /api/integrations/webhooks/:id/test
 */

import { Router, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { db, outboundWebhooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { fireUserWebhooks } from "../lib/fire-webhook.js";

const router = Router();

const VALID_EVENTS = [
  "spec.generated",
  "spec.shared",
  "spec.health_declined",
  "team.member_joined",
] as const;

router.get("/webhooks", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const hooks = await db.select().from(outboundWebhooksTable).where(eq(outboundWebhooksTable.userId, userId));
  res.json({ webhooks: hooks });
});

router.post("/webhooks", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { name, eventType, url, secret } = req.body as {
    name?: string; eventType?: string; url?: string; secret?: string;
  };

  if (!name || !eventType || !url) {
    res.status(400).json({ error: "name, eventType, and url are required" });
    return;
  }
  if (!(VALID_EVENTS as readonly string[]).includes(eventType)) {
    res.status(400).json({ error: `eventType must be one of: ${VALID_EVENTS.join(", ")}` });
    return;
  }
  try { new URL(url); } catch { res.status(400).json({ error: "Invalid URL" }); return; }

  const generatedSecret = secret || randomBytes(20).toString("hex");

  const [hook] = await db
    .insert(outboundWebhooksTable)
    .values({ userId, name, eventType, url, secret: generatedSecret })
    .returning();

  res.status(201).json({ webhook: hook });
});

router.put("/webhooks/:id", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = Number(req.params.id);
  const { name, url, enabled } = req.body as { name?: string; url?: string; enabled?: boolean };

  const [hook] = await db
    .update(outboundWebhooksTable)
    .set({
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(enabled !== undefined && { enabled }),
    })
    .where(and(eq(outboundWebhooksTable.id, id), eq(outboundWebhooksTable.userId, userId)))
    .returning();

  if (!hook) { res.status(404).json({ error: "Webhook not found" }); return; }
  res.json({ webhook: hook });
});

router.delete("/webhooks/:id", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = Number(req.params.id);
  await db
    .delete(outboundWebhooksTable)
    .where(and(eq(outboundWebhooksTable.id, id), eq(outboundWebhooksTable.userId, userId)));

  res.json({ success: true });
});

router.post("/webhooks/:id/test", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = Number(req.params.id);
  const [hook] = await db
    .select()
    .from(outboundWebhooksTable)
    .where(and(eq(outboundWebhooksTable.id, id), eq(outboundWebhooksTable.userId, userId)));

  if (!hook) { res.status(404).json({ error: "Webhook not found" }); return; }

  await fireUserWebhooks(userId, hook.eventType, {
    test: true,
    message: "This is a test webhook from SpecForge",
    spec: { id: 0, title: "Test Spec", type: "system_design" },
  });

  res.json({ success: true, message: "Test payload sent" });
});

export default router;
