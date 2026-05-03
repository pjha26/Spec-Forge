import { createHmac } from "crypto";
import { db, outboundWebhooksTable, userPreferencesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger.js";

export async function fireUserWebhooks(
  userId: string,
  eventType: string,
  payload: object,
): Promise<void> {
  try {
    const hooks = await db
      .select()
      .from(outboundWebhooksTable)
      .where(
        and(
          eq(outboundWebhooksTable.userId, userId),
          eq(outboundWebhooksTable.eventType, eventType),
          eq(outboundWebhooksTable.enabled, true),
        ),
      );

    await Promise.allSettled(
      hooks.map(async (hook) => {
        const body = JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload,
        });

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "SpecForge-Webhook/1.0",
          "X-SpecForge-Event": eventType,
        };

        if (hook.secret) {
          const sig = createHmac("sha256", hook.secret).update(body).digest("hex");
          headers["X-SpecForge-Signature"] = `sha256=${sig}`;
        }

        let status = 0;
        try {
          const res = await fetch(hook.url, {
            method: "POST",
            headers,
            body,
            signal: AbortSignal.timeout(10_000),
          });
          status = res.status;
        } catch {
          status = 0;
        }

        await db
          .update(outboundWebhooksTable)
          .set({ lastTriggeredAt: new Date(), lastStatus: status })
          .where(eq(outboundWebhooksTable.id, hook.id));
      }),
    );
  } catch (err) {
    logger.error({ err }, "fireUserWebhooks failed");
  }
}

export async function fireSlackNotification(
  webhookUrl: string,
  title: string,
  body: string,
  specUrl?: string,
): Promise<void> {
  const blocks: object[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "⚡ SpecForge" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${title}*\n${body}` },
    },
  ];

  if (specUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open Spec →" },
          url: specUrl,
          style: "primary",
        },
      ],
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "Sent by <https://specforge.app|SpecForge>" }],
  });

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
    signal: AbortSignal.timeout(8_000),
  });
}

export async function notifySlackOnSpecGenerated(
  userId: string,
  specTitle: string,
  specType: string,
): Promise<void> {
  try {
    const [prefs] = await db
      .select({ slackWebhookUrl: userPreferencesTable.slackWebhookUrl })
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, userId));

    if (!prefs?.slackWebhookUrl) return;

    const typeLabel =
      specType === "system_design" ? "System Design"
      : specType === "api_design" ? "API Design"
      : specType === "database_schema" ? "Database Schema"
      : "Feature Spec";

    await fireSlackNotification(
      prefs.slackWebhookUrl,
      `New ${typeLabel} spec generated`,
      `_${specTitle}_ is ready to view.`,
    );
  } catch (err) {
    logger.error({ err }, "notifySlackOnSpecGenerated failed");
  }
}
