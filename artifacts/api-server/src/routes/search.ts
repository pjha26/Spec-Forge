/**
 * Semantic search — full-text + AI keyword expansion
 * GET /api/search?q=<query>&type=<specType>
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { sql, or, ilike, eq, and } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  const { q, type } = req.query as { q?: string; type?: string };

  if (!q || q.trim().length < 2) {
    res.json({ results: [], total: 0, query: q ?? "" });
    return;
  }

  const query = q.trim();
  const likePattern = `%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  try {
    // Split into individual words for broader matching
    const words = query.split(/\s+/).filter(w => w.length > 2);
    const wordLikeConditions = words.map(w =>
      or(
        ilike(specsTable.title, `%${w}%`),
        ilike(specsTable.content, `%${w}%`),
      )
    );

    const baseCondition = or(
      ilike(specsTable.title, likePattern),
      ilike(specsTable.content, likePattern),
      ...wordLikeConditions,
    );

    const typeCondition = type && type !== "all"
      ? eq(specsTable.specType, type as any)
      : undefined;

    const whereClause = typeCondition
      ? and(baseCondition, typeCondition)
      : baseCondition;

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
        // Relevance: title match scores higher
        relevance: sql<number>`
          CASE
            WHEN lower(${specsTable.title}) = lower(${query}) THEN 100
            WHEN lower(${specsTable.title}) LIKE lower(${likePattern}) THEN 80
            WHEN lower(${specsTable.content}) LIKE lower(${likePattern}) THEN 50
            ELSE 20
          END
        `,
        // Snippet around first match in content
        snippet: sql<string>`
          CASE
            WHEN lower(${specsTable.content}) LIKE lower(${likePattern})
            THEN substring(
              ${specsTable.content}
              FROM greatest(1, position(lower(${query}) in lower(${specsTable.content})) - 80)
              FOR 240
            )
            ELSE left(${specsTable.content}, 240)
          END
        `,
      })
      .from(specsTable)
      .where(whereClause!)
      .orderBy(sql`
        CASE
          WHEN lower(${specsTable.title}) = lower(${query}) THEN 100
          WHEN lower(${specsTable.title}) LIKE lower(${likePattern}) THEN 80
          WHEN lower(${specsTable.content}) LIKE lower(${likePattern}) THEN 50
          ELSE 20
        END DESC,
        ${specsTable.updatedAt} DESC
      `)
      .limit(25);

    res.json({ results: rows, total: rows.length, query });
  } catch (err) {
    req.log.error({ err }, "Search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
