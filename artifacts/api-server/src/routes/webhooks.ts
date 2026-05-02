import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

function verifyGitHubSignature(payload: Buffer, secret: string, signature: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function normalizeRepoUrl(url: string): string {
  return url.replace(/\.git$/, "").replace(/\/$/, "").toLowerCase();
}

async function regenerateSpec(specId: number): Promise<void> {
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) return;

  await db.update(specsTable).set({ status: "generating", updatedAt: new Date() }).where(eq(specsTable.id, specId));

  const SPEC_PROMPTS: Record<string, string> = {
    system_design: "You are a senior software architect. Generate a comprehensive System Design Document for the following project. Include: Overview, Architecture, Core Components, Data Flow, Technology Stack, Scalability, Security, Deployment, and Trade-offs. Format in clean professional markdown.",
    api_design: "You are a senior API architect. Generate a comprehensive API Design Document. Include: Overview, Base URL, Authentication, Core Endpoints, Error Handling, Rate Limiting, Data Models. Format in clean professional markdown with code blocks.",
    database_schema: "You are a senior database architect. Generate a comprehensive Database Schema Design. Include: Overview, ERD description, Tables with all columns, Relationships, Indexes, Migration strategy. Format with SQL CREATE TABLE statements.",
    feature_spec: "You are a senior product engineer. Generate a comprehensive Feature Specification Document. Include: Overview, Problem Statement, Goals, User Stories, Functional Requirements, Non-Functional Requirements, Technical Approach, API Changes, Data Model, Acceptance Criteria. Format in professional markdown.",
  };

  try {
    const systemPrompt = SPEC_PROMPTS[spec.specType] || SPEC_PROMPTS.feature_spec;
    const userMessage = spec.inputType === "github_url"
      ? `Generate a ${spec.specType.replace(/_/g, " ")} for this GitHub repository: ${spec.inputValue}\n\nCreate a detailed, professional document.`
      : `Generate a ${spec.specType.replace(/_/g, " ")} for:\n\n${spec.inputValue}\n\nCreate a detailed, professional document.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content[0];
    const content = block.type === "text" ? block.text : "";

    await db.update(specsTable).set({
      content,
      status: "completed",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(specsTable.id, specId));
  } catch {
    await db.update(specsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(specsTable.id, specId));
  }
}

router.post(
  "/webhooks/github",
  async (req, res) => {
    const signature = req.headers["x-hub-signature-256"];
    const event = req.headers["x-github-event"];

    if (!signature || typeof signature !== "string") {
      res.status(400).json({ error: "Missing signature" });
      return;
    }

    if (event !== "push") {
      res.json({ processed: 0 });
      return;
    }

    const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    const payload = req.body as { repository?: { html_url?: string; clone_url?: string } };
    const repoUrl = payload?.repository?.html_url ?? payload?.repository?.clone_url ?? "";

    if (!repoUrl) {
      res.status(400).json({ error: "No repository URL in payload" });
      return;
    }

    const normalizedIncoming = normalizeRepoUrl(repoUrl);

    const allSpecs = await db
      .select()
      .from(specsTable)
      .where(eq(specsTable.inputType, "github_url"));

    const matchingSpecs = allSpecs.filter((spec) => {
      if (!spec.webhookSecret) return false;
      const normalized = normalizeRepoUrl(spec.inputValue);
      if (normalized !== normalizedIncoming) return false;
      return verifyGitHubSignature(rawBody, spec.webhookSecret, signature);
    });

    for (const spec of matchingSpecs) {
      regenerateSpec(spec.id).catch(() => {});
    }

    res.json({ processed: matchingSpecs.length });
  }
);

export default router;
