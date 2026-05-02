import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.post("/specs/:id/insights", async (req, res) => {
  const specId = Number(req.params["id"]);
  if (isNaN(specId)) { res.status(400).json({ error: "Invalid spec ID" }); return; }

  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  if (spec.status !== "completed") { res.status(400).json({ error: "Spec not ready yet" }); return; }

  try {
    const contentPreview = spec.content.slice(0, 5000);
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Analyze this "${spec.specType.replace(/_/g, " ")}" technical specification and return ONLY a valid JSON object with no markdown, no code fences, no explanation.

Required fields:
- completeness: integer 0-100 (overall completeness %)
- overallHealth: "excellent" | "good" | "fair" | "poor"
- missingAreas: string[] (up to 4 areas that should be covered but are missing)
- strengthAreas: string[] (up to 4 things the spec does well)
- suggestions: string[] (up to 5 specific, actionable improvements)
- estimatedImplementationDays: integer (realistic engineering effort)

SPECIFICATION TO ANALYZE:
${contentPreview}`,
      }],
    });

    const block = message.content[0];
    if (block?.type !== "text") throw new Error("No text response");
    const raw = block.text.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const insights = JSON.parse(raw);
    res.json(insights);
  } catch {
    res.status(500).json({ error: "Failed to analyze spec" });
  }
});

export default router;
