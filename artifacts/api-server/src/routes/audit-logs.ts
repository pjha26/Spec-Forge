/**
 * Audit Log — tamper-proof action log per team workspace.
 *
 * GET  /api/teams/:id/audit          list logs (filterable by userId, action, date)
 * GET  /api/teams/:id/audit/export   CSV download
 *
 * createAuditLog() is the exported helper called from every other route.
 */

import { Router, type Request } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, type SQL } from "drizzle-orm";

const router = Router({ mergeParams: true });

// ── List audit logs ───────────────────────────────────────────────────────────
router.get("/:teamId/audit", async (req, res) => {
  const teamId = Number(req.params.teamId);
  if (!teamId) { res.status(400).json({ error: "Invalid team ID" }); return; }

  const { userId, action, from, to, limit = "100" } = req.query as Record<string, string>;

  const conditions: SQL[] = [eq(auditLogsTable.teamId, teamId)];
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (from) conditions.push(gte(auditLogsTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(auditLogsTable.createdAt, new Date(to)));

  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(and(...conditions))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(Math.min(Number(limit) || 100, 500));

    res.json({ logs });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch audit logs");
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ── CSV export ────────────────────────────────────────────────────────────────
router.get("/:teamId/audit/export", async (req, res) => {
  const teamId = Number(req.params.teamId);
  if (!teamId) { res.status(400).json({ error: "Invalid team ID" }); return; }

  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.teamId, teamId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10000);

    const header = "id,timestamp,user_id,username,action,resource_type,resource_id,ip_address\n";
    const rows = logs.map(l =>
      [
        l.id,
        l.createdAt.toISOString(),
        l.userId ?? "",
        l.username ?? "",
        l.action,
        l.resourceType ?? "",
        l.resourceId ?? "",
        l.ipAddress ?? "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-log-team-${teamId}.csv"`);
    res.send(header + rows);
  } catch (err) {
    req.log.error({ err }, "Failed to export audit logs");
    res.status(500).json({ error: "Failed to export" });
  }
});

// ── Helper: called from any route that needs to log an action ─────────────────
export async function createAuditLog(params: {
  teamId?: number | null;
  userId?: string | null;
  username?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
  req?: Request;
}) {
  try {
    await db.insert(auditLogsTable).values({
      teamId: params.teamId ?? null,
      userId: params.userId ?? null,
      username: params.username ?? null,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId != null ? String(params.resourceId) : null,
      metadata: params.metadata ?? null,
      ipAddress: params.req
        ? (params.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
          ?? params.req.socket.remoteAddress
          ?? null
        : null,
      userAgent: params.req?.headers["user-agent"] ?? null,
    });
  } catch {
    // Never let audit logging crash a request
  }
}

export default router;
