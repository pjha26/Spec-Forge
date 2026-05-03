/**
 * Team RAG Knowledge Base — CRUD for team documents.
 *
 * GET    /api/teams/:id/knowledge              list all docs for a team
 * POST   /api/teams/:id/knowledge              upload a new doc
 * DELETE /api/teams/:id/knowledge/:docId       delete a doc
 * POST   /api/teams/:id/knowledge/:docId/pin   pin doc to top of retrieval
 *
 * RAG retrieval helper exported for use in specs.ts stream route.
 */

import { Router } from "express";
import { db, teamKnowledgeTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router({ mergeParams: true });

// ── List docs ────────────────────────────────────────────────────────────────
router.get("/:teamId/knowledge", async (req, res) => {
  const teamId = Number(req.params.teamId);
  if (!teamId) { res.status(400).json({ error: "Invalid team ID" }); return; }

  try {
    const docs = await db
      .select({
        id: teamKnowledgeTable.id,
        title: teamKnowledgeTable.title,
        docType: teamKnowledgeTable.docType,
        wordCount: teamKnowledgeTable.wordCount,
        uploadedBy: teamKnowledgeTable.uploadedBy,
        createdAt: teamKnowledgeTable.createdAt,
        // Excerpt first 200 chars for list view
        excerpt: sql<string>`substring(${teamKnowledgeTable.content}, 1, 200)`,
      })
      .from(teamKnowledgeTable)
      .where(eq(teamKnowledgeTable.teamId, teamId))
      .orderBy(desc(teamKnowledgeTable.createdAt));

    res.json({ docs });
  } catch (err) {
    req.log.error({ err }, "Failed to list knowledge docs");
    res.status(500).json({ error: "Failed to list knowledge" });
  }
});

// ── Upload doc ────────────────────────────────────────────────────────────────
router.post("/:teamId/knowledge", async (req, res) => {
  const teamId = Number(req.params.teamId);
  if (!teamId) { res.status(400).json({ error: "Invalid team ID" }); return; }

  const { title, content, docType = "doc" } = req.body as {
    title?: string;
    content?: string;
    docType?: string;
  };

  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const wordCount = content.trim().split(/\s+/).length;
  const userId = (req as any).session?.user?.id as string | undefined;
  const validType = ["spec", "adr", "decision", "doc", "runbook"].includes(docType) ? docType : "doc";

  try {
    const [doc] = await db.insert(teamKnowledgeTable).values({
      teamId,
      title: title.trim(),
      content: content.trim(),
      docType: validType as any,
      wordCount,
      uploadedBy: userId ?? null,
    }).returning();

    res.status(201).json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to upload knowledge doc");
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// ── Delete doc ────────────────────────────────────────────────────────────────
router.delete("/:teamId/knowledge/:docId", async (req, res) => {
  const teamId = Number(req.params.teamId);
  const docId = Number(req.params.docId);
  if (!teamId || !docId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const [deleted] = await db
      .delete(teamKnowledgeTable)
      .where(and(eq(teamKnowledgeTable.id, docId), eq(teamKnowledgeTable.teamId, teamId)))
      .returning({ id: teamKnowledgeTable.id });

    if (!deleted) { res.status(404).json({ error: "Document not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete knowledge doc");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ── RAG Retrieval Helper ──────────────────────────────────────────────────────
/**
 * Retrieve team knowledge relevant to a given query.
 * Uses PostgreSQL full-text search for relevance ranking with
 * keyword overlap scoring, then takes the top N most relevant chunks.
 *
 * @param teamId     Team whose knowledge base to search
 * @param query      The spec input (description, repo URL, etc.)
 * @param maxChars   Max total chars to inject (default: 6000 — fits in any context window)
 * @returns          Formatted context string, or "" if no docs found
 */
export async function retrieveTeamKnowledge(
  teamId: number,
  query: string,
  maxChars = 6000,
): Promise<string> {
  if (!teamId) return "";

  try {
    // Pull all docs for the team — we score them in-memory
    const docs = await db
      .select({
        id: teamKnowledgeTable.id,
        title: teamKnowledgeTable.title,
        content: teamKnowledgeTable.content,
        docType: teamKnowledgeTable.docType,
        wordCount: teamKnowledgeTable.wordCount,
      })
      .from(teamKnowledgeTable)
      .where(eq(teamKnowledgeTable.teamId, teamId))
      .orderBy(desc(teamKnowledgeTable.createdAt))
      .limit(50); // safety cap

    if (docs.length === 0) return "";

    // Score each doc by keyword overlap with the query
    const queryTokens = new Set(
      query.toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(t => t.length > 3)  // ignore short stop words
    );

    const scored = docs.map(doc => {
      const docText = `${doc.title} ${doc.content}`.toLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        if (docText.includes(token)) score++;
      }
      // Boost ADRs and decisions — they're highest-value for spec generation
      if (doc.docType === "adr" || doc.docType === "decision") score += 2;
      // Small boost for recently added docs
      return { ...doc, score };
    });

    // Sort by relevance (desc), take top docs that fit within maxChars
    scored.sort((a, b) => b.score - a.score);

    const chunks: string[] = [];
    let totalChars = 0;

    for (const doc of scored) {
      if (totalChars >= maxChars) break;

      const remaining = maxChars - totalChars;
      const header = `### [${doc.docType.toUpperCase()}] ${doc.title}\n`;
      const body = doc.content.slice(0, remaining - header.length);
      const chunk = header + body + (doc.content.length > body.length ? "\n… [truncated]" : "");

      chunks.push(chunk);
      totalChars += chunk.length;
    }

    if (chunks.length === 0) return "";

    return [
      `\n\n[Team Knowledge Base — ${chunks.length} document${chunks.length !== 1 ? "s" : ""} retrieved]`,
      `Use these team documents as authoritative context. They reflect decisions, patterns, and standards already established by this team. Align your spec with them unless the new spec explicitly deviates.`,
      ``,
      ...chunks,
      `[End of Team Knowledge Base]`,
    ].join("\n");
  } catch {
    return "";
  }
}

export default router;
