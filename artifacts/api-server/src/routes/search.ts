/**
 * Full-text search using PostgreSQL tsvector + ts_rank
 * GET /api/search?q=<query>&type=<specType>
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { sql, eq, and, or } from "drizzle-orm";
import type { AuthedRequest } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/search", async (req, res) => {
  const { q, type } = req.query as { q?: string; type?: string };

  if (!q || q.trim().length < 2) {
    res.json({ results: [], total: 0, query: q ?? "" });
    return;
  }

  const query = q.trim();
  const userId = (req as AuthedRequest).user?.id ?? null;

  try {
    const ownerFilter = userId
      ? or(eq(specsTable.userId, userId), sql`${specsTable.userId} IS NULL`)
      : undefined;

    const typeFilter = type && type !== "all"
      ? eq(specsTable.specType, type as "system_design" | "api_design" | "database_schema" | "feature_spec")
      : undefined;

    const conditions = [
      sql`search_vector @@ websearch_to_tsquery('english', ${query})`,
      ...(ownerFilter ? [ownerFilter] : []),
      ...(typeFilter ? [typeFilter] : []),
    ];

    const rows = await db
      .select({
        id: specsTable.id,
        title: specsTable.title,
        specType: specsTable.specType,
        inputType: specsTable.inputType,
        status: specsTable.status,
        complexityScore: specsTable.complexityScore,
        createdAt: specsTable.createdAt,
        updatedAt: specsTable.updatedAt,
        rank: sql<number>`ts_rank(search_vector, websearch_to_tsquery('english', ${query}))`,
        headline: sql<string>`ts_headline(
          'english',
          coalesce(left(content, 50000), ''),
          websearch_to_tsquery('english', ${query}),
          'MaxWords=20, MinWords=8, StartSel=<<, StopSel=>>, HighlightAll=false'
        )`,
      })
      .from(specsTable)
      .where(and(...conditions))
      .orderBy(
        sql`ts_rank(search_vector, websearch_to_tsquery('english', ${query})) DESC`,
        sql`${specsTable.updatedAt} DESC`,
      )
      .limit(25);

    res.json({ results: rows, total: rows.length, query });
  } catch (err) {
    req.log.error({ err }, "Full-text search failed, falling back to ILIKE");
    try {
      const like = `%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      const rows = await db
        .select({
          id: specsTable.id,
          title: specsTable.title,
          specType: specsTable.specType,
          inputType: specsTable.inputType,
          status: specsTable.status,
          complexityScore: specsTable.complexityScore,
          createdAt: specsTable.createdAt,
          updatedAt: specsTable.updatedAt,
          rank: sql<number>`0.5`,
          headline: sql<string>`left(${specsTable.content}, 240)`,
        })
        .from(specsTable)
        .where(or(
          sql`lower(${specsTable.title}) LIKE lower(${like})`,
          sql`lower(${specsTable.content}) LIKE lower(${like})`,
        ))
        .orderBy(sql`${specsTable.updatedAt} DESC`)
        .limit(25);
      res.json({ results: rows, total: rows.length, query });
    } catch {
      res.status(500).json({ error: "Search failed" });
    }
  }
});

export default router;
