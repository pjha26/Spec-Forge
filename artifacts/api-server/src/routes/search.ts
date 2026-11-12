import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { sql, eq, and, or } from "drizzle-orm";
import { visibleSpecs } from "../middlewares/resourceAccess";

const router = Router();

router.get("/search", async (req, res) => {
  const { q, type } = req.query as { q?: string; type?: string };

  if (typeof q !== "string" || q.trim().length < 2) {
    res.json({ results: [], total: 0, query: typeof q === "string" ? q : "" });
    return;
  }

  const query = q.trim();
  try {
    const ownerFilter = visibleSpecs(req.user!.id);
    const vector = sql`to_tsvector('english', ${specsTable.title} || ' ' || left(${specsTable.content}, 50000))`;
    const typeFilter = type && type !== "all"
      ? eq(specsTable.specType, type as "system_design" | "api_design" | "database_schema" | "feature_spec")
      : undefined;

    const conditions = [
      sql`${vector} @@ websearch_to_tsquery('english', ${query})`,
      ownerFilter,
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
        rank: sql<number>`ts_rank(${vector}, websearch_to_tsquery('english', ${query}))`,
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
        sql`ts_rank(${vector}, websearch_to_tsquery('english', ${query})) DESC`,
        sql`${specsTable.updatedAt} DESC`,
      )
      .limit(25);

    res.json({ results: rows, total: rows.length, query });
  } catch (err) {
    req.log.error({ err }, "Search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
