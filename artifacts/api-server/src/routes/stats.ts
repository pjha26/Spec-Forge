/**
 * GET /api/stats
 * Returns aggregate statistics about the user's specs and usage.
 * All queries run in parallel against real DB tables.
 */

import { Router, type Request, type Response } from "express";
import {
  db,
  specsTable,
  specVersionsTable,
  conversations,
  specAnnotationsTable,
} from "@workspace/db";
import { eq, sql, and, gte, or } from "drizzle-orm";
import type { AuthedRequest } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/stats", async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).user?.id ?? null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

  // Filter: user's own specs OR legacy unowned specs
  const ownerFilter = userId
    ? or(eq(specsTable.userId, userId), sql`${specsTable.userId} IS NULL`)
    : undefined;

  try {
    const [
      totalSpecs,
      byType,
      byModel,
      byStatus,
      recentActivity,
      complexityStats,
      versionStats,
      conversationStats,
      annotationStats,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(specsTable)
        .where(ownerFilter),

      db.select({
        specType: specsTable.specType,
        count: sql<number>`count(*)::int`,
      })
        .from(specsTable)
        .where(ownerFilter)
        .groupBy(specsTable.specType)
        .orderBy(sql`count(*) DESC`),

      db.select({
        aiModel: specsTable.aiModel,
        count: sql<number>`count(*)::int`,
      })
        .from(specsTable)
        .where(ownerFilter)
        .groupBy(specsTable.aiModel)
        .orderBy(sql`count(*) DESC`),

      db.select({
        status: specsTable.status,
        count: sql<number>`count(*)::int`,
      })
        .from(specsTable)
        .where(ownerFilter)
        .groupBy(specsTable.status),

      db.select({
        day: sql<string>`date_trunc('day', ${specsTable.createdAt})::date::text`,
        count: sql<number>`count(*)::int`,
      })
        .from(specsTable)
        .where(ownerFilter
          ? and(ownerFilter, gte(specsTable.createdAt, thirtyDaysAgo))
          : gte(specsTable.createdAt, thirtyDaysAgo))
        .groupBy(sql`date_trunc('day', ${specsTable.createdAt})`)
        .orderBy(sql`date_trunc('day', ${specsTable.createdAt})`),

      db.select({
        avg: sql<number>`round(avg(${specsTable.complexityScore})::numeric, 1)`,
        max: sql<number>`max(${specsTable.complexityScore})`,
        min: sql<number>`min(${specsTable.complexityScore})`,
        withScore: sql<number>`count(${specsTable.complexityScore})::int`,
      })
        .from(specsTable)
        .where(ownerFilter
          ? and(ownerFilter, eq(specsTable.status, "completed"))
          : eq(specsTable.status, "completed")),

      db.select({ count: sql<number>`count(*)::int` })
        .from(specVersionsTable)
        .where(ownerFilter
          ? sql`${specVersionsTable.specId} IN (
              SELECT id FROM specs WHERE user_id = ${userId} OR user_id IS NULL
            )`
          : sql`TRUE`),

      db.select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(userId ? eq(conversations.userId, userId) : sql`TRUE`),

      db.select({ count: sql<number>`count(*)::int` })
        .from(specAnnotationsTable)
        .where(userId ? eq(specAnnotationsTable.userId, userId) : sql`TRUE`),
    ]);

    const weekSpecs = recentActivity
      .filter(r => new Date(r.day) >= sevenDaysAgo)
      .reduce((sum, r) => sum + r.count, 0);

    res.json({
      totalSpecs: totalSpecs[0]?.count ?? 0,
      completedSpecs: byStatus.find(s => s.status === "completed")?.count ?? 0,
      failedSpecs: byStatus.find(s => s.status === "failed")?.count ?? 0,
      byType,
      byModel,
      byStatus,
      recentActivity,
      weekSpecs,
      complexity: {
        avg: complexityStats[0]?.avg ?? null,
        max: complexityStats[0]?.max ?? null,
        min: complexityStats[0]?.min ?? null,
        withScore: complexityStats[0]?.withScore ?? 0,
      },
      versions: versionStats[0]?.count ?? 0,
      conversations: conversationStats[0]?.count ?? 0,
      annotations: annotationStats[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Stats query failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;
