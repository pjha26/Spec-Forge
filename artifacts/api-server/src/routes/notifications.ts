import { Router, type Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const notifClients = new Map<string, Set<Response>>();

export function broadcastNotification(userId: string, notification: object) {
  const clients = notifClients.get(userId);
  if (!clients?.size) return;
  const payload = `data: ${JSON.stringify({ notification })}\n\n`;
  for (const client of clients) client.write(payload);
}

export async function createNotification(
  userId: string,
  data: {
    type: "sync_complete" | "sync_failed" | "share_viewed";
    title: string;
    message: string;
    specId?: number;
  }
) {
  try {
    const [notif] = await db
      .insert(notificationsTable)
      .values({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        specId: data.specId ?? null,
        read: false,
      })
      .returning();
    if (notif) broadcastNotification(userId, notif);
  } catch {}
}

router.get("/notifications/stream", (req, res) => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!notifClients.has(user.id)) notifClients.set(user.id, new Set());
  notifClients.get(user.id)!.add(res);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    notifClients.get(user.id)?.delete(res);
    if (!notifClients.get(user.id)?.size) notifClients.delete(user.id);
  });
});

router.get("/notifications", async (req, res) => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(20);

  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unreadCount });
});

router.put("/notifications/read-all", async (req, res) => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, user.id));

  res.json({ success: true });
});

router.put("/notifications/:id/read", async (req, res) => {
  const user = req.user;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, user.id)
      )
    );

  res.json({ success: true });
});

export default router;
