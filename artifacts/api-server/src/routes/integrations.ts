/**
 * Integration settings (Linear, Jira, Slack)
 * GET /api/integrations/settings
 * PUT /api/integrations/settings
 * POST /api/integrations/slack/test
 */

import { Router, type Request, type Response } from "express";
import { db, userPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { fireSlackNotification } from "../lib/fire-webhook.js";

const router = Router();

router.get("/integrations/settings", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [prefs] = await db.select({
    linearApiKey: userPreferencesTable.linearApiKey,
    linearTeamId: userPreferencesTable.linearTeamId,
    jiraApiKey: userPreferencesTable.jiraApiKey,
    jiraBaseUrl: userPreferencesTable.jiraBaseUrl,
    jiraProjectKey: userPreferencesTable.jiraProjectKey,
    slackWebhookUrl: userPreferencesTable.slackWebhookUrl,
  }).from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));

  // Mask API keys — only show last 4 chars
  const mask = (v: string | null | undefined) =>
    v ? `${"•".repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : null;

  res.json({
    linearApiKey: mask(prefs?.linearApiKey),
    linearApiKeySet: !!prefs?.linearApiKey,
    linearTeamId: prefs?.linearTeamId ?? null,
    jiraApiKey: mask(prefs?.jiraApiKey),
    jiraApiKeySet: !!prefs?.jiraApiKey,
    jiraBaseUrl: prefs?.jiraBaseUrl ?? null,
    jiraProjectKey: prefs?.jiraProjectKey ?? null,
    slackWebhookUrl: prefs?.slackWebhookUrl ?? null,
  });
});

router.put("/integrations/settings", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const {
    linearApiKey, linearTeamId,
    jiraApiKey, jiraBaseUrl, jiraProjectKey,
    slackWebhookUrl,
  } = req.body as Record<string, string | null>;

  // Only update fields that were explicitly provided (not undefined)
  const updates: Record<string, string | null> = {};
  if (linearApiKey !== undefined) updates.linearApiKey = linearApiKey;
  if (linearTeamId !== undefined) updates.linearTeamId = linearTeamId;
  if (jiraApiKey !== undefined) updates.jiraApiKey = jiraApiKey;
  if (jiraBaseUrl !== undefined) updates.jiraBaseUrl = jiraBaseUrl;
  if (jiraProjectKey !== undefined) updates.jiraProjectKey = jiraProjectKey;
  if (slackWebhookUrl !== undefined) updates.slackWebhookUrl = slackWebhookUrl;

  await db
    .insert(userPreferencesTable)
    .values({ userId, ...updates, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferencesTable.userId,
      set: { ...updates, updatedAt: new Date() },
    });

  res.json({ success: true });
});

router.post("/integrations/slack/test", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { webhookUrl } = req.body as { webhookUrl?: string };
  if (!webhookUrl) { res.status(400).json({ error: "webhookUrl required" }); return; }

  try {
    await fireSlackNotification(
      webhookUrl,
      "SpecForge connection successful!",
      "Your Slack integration is working. You'll receive notifications here when specs are generated.",
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Slack test failed");
    res.status(500).json({ error: "Failed to send test message — check your webhook URL" });
  }
});

export default router;
