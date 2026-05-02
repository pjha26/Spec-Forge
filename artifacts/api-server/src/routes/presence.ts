import { Router, type Request, type Response } from "express";
import { randomBytes } from "crypto";

const router = Router();

interface PresenceViewer {
  sessionId: string;
  name: string;
  color: string;
  joinedAt: string;
}

const specViewers = new Map<number, Map<string, PresenceViewer>>();
const sseClients = new Map<number, Set<Response>>();

const VIEWER_COLORS = [
  "#7C3AED", "#06B6D4", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6",
];

function broadcast(specId: number) {
  const viewers = Array.from(specViewers.get(specId)?.values() ?? []);
  const clients = sseClients.get(specId);
  if (!clients?.size) return;
  const payload = `data: ${JSON.stringify({ viewers })}\n\n`;
  for (const client of clients) client.write(payload);
}

router.get("/specs/:id/presence", (req: Request, res: Response) => {
  const specId = Number(req.params["id"]);
  if (isNaN(specId)) { res.status(400).json({ error: "Invalid spec ID" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sessionId = randomBytes(6).toString("hex");
  const user = (req as any).session?.user;
  const name = user?.firstName
    ? user.firstName
    : user?.email?.split("@")[0] ?? "Visitor";
  const color = VIEWER_COLORS[Math.floor(Math.random() * VIEWER_COLORS.length)]!;

  if (!specViewers.has(specId)) specViewers.set(specId, new Map());
  if (!sseClients.has(specId)) sseClients.set(specId, new Set());

  specViewers.get(specId)!.set(sessionId, {
    sessionId, name, color,
    joinedAt: new Date().toISOString(),
  });
  sseClients.get(specId)!.add(res);
  broadcast(specId);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    specViewers.get(specId)?.delete(sessionId);
    sseClients.get(specId)?.delete(res);
    broadcast(specId);
    if (!specViewers.get(specId)?.size) specViewers.delete(specId);
    if (!sseClients.get(specId)?.size) sseClients.delete(specId);
  });
});

export default router;
