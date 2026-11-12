import { Router, type Request, type Response } from "express";
import { db, githubWebhookDeliveries, specsTable, specVersionsTable } from "@workspace/db";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { buildSpecDraft, draftDiagram } from "../lib/spec-template";
import { githubSource, parseGitHubRepo } from "../lib/github-source";
import { visibleSpecs } from "../middlewares/resourceAccess";
import type { AuthedRequest } from "../middlewares/authMiddleware.js";
import { streamCompletion, generateCompletion, localAIEnabled, localVisionEnabled, requireLocalAI } from "../lib/model-router.js";
import { db as dbClient, conversations as conversationsTable } from "@workspace/db";
import { randomBytes } from "crypto";
import { createNotification } from "./notifications";
import { saveSpecVersion } from "./versions";
import { retrieveTeamKnowledge } from "./team-knowledge";
import { createAuditLog } from "./audit-logs";
import {
  CreateSpecBody,
  GetSpecParams,
  DeleteSpecParams,
  StreamSpecParams,
  GetOrCreateSpecChatParams,
} from "@workspace/api-zod";

function generateShareToken(): string {
  return randomBytes(12).toString("base64url");
}

function serializeSpec(s: typeof specsTable.$inferSelect) {
  return {
    ...s,
    techDebtRisks: s.techDebtRisks ?? null,
    shareToken: undefined,
    webhookSecret: undefined,
    lastSyncedAt: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function getWebhookUrl(req: Request): string {
  if (process.env.PUBLIC_URL) return new URL("/api/webhooks/github", process.env.PUBLIC_URL).href;
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  return `${proto}://${host}/api/webhooks/github`;
}

async function generationInput(spec: typeof specsTable.$inferSelect) {
  if (spec.inputType !== "github_url") return spec.inputValue;
  try {
    const source = await githubSource(spec.inputValue);
    return [source.url, source.description, source.language && "Primary language: " + source.language, source.readme]
      .filter(Boolean).join("\n\n");
  } catch (error) {
    if (localAIEnabled) throw error;
    return spec.inputValue + "\n\nRepository metadata is unavailable. Confirm details against the public repository.";
  }
}

export async function claimGeneration(specId: number, ownerId: string | null, deliveryDigest?: string) {
  if (!ownerId) return false;
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerId}))`);
    const active = await tx.select({ id: specsTable.id }).from(specsTable)
      .where(and(eq(specsTable.userId, ownerId), eq(specsTable.status, "generating"))).limit(2);
    if (active.length >= 2) return false;
    if (deliveryDigest) {
      const [delivery] = await tx.select({ specId: githubWebhookDeliveries.specId })
        .from(githubWebhookDeliveries)
        .where(and(eq(githubWebhookDeliveries.specId, specId), eq(githubWebhookDeliveries.digest, deliveryDigest)));
      if (delivery) return false;
    }
    const [claimed] = await tx.update(specsTable).set({ status: "generating", updatedAt: new Date() })
      .where(and(eq(specsTable.id, specId), eq(specsTable.userId, ownerId), ne(specsTable.status, "generating")))
      .returning({ id: specsTable.id });
    if (!claimed) return false;
    if (deliveryDigest) await tx.insert(githubWebhookDeliveries).values({ specId, digest: deliveryDigest });
    return true;
  });
}

export async function runSpecGeneration(specId: number, userId?: string): Promise<void> {
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) return;


  try {
    const systemPrompt = SPEC_PROMPTS[spec.specType] || SPEC_PROMPTS.feature_spec;
    const userMessage = await generationInput(spec);

    const fullContent = localAIEnabled ? await generateCompletion({

      system: systemPrompt,
      userMessage,
      maxTokens: 8192,
      imageBase64: localVisionEnabled ? spec.imageInput ?? undefined : undefined,
      imageMediaType: spec.imageInput?.startsWith("iVBOR") ? "image/png" : "image/jpeg",
    }) : buildSpecDraft(spec.specType, userMessage);
    const diagram = draftDiagram(spec.specType);

    await db.update(specsTable).set({
      content: fullContent,
      status: "completed",
      aiModel: localAIEnabled ? "local-ollama" : "template",
      complexityScore: null,
      techDebtRisks: null,
      complexitySummary: null,
      mermaidDiagram: diagram,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(specsTable.id, specId));

    await saveSpecVersion(specId, {
      content: fullContent,
      complexityScore: null,
      techDebtRisks: null,
      complexitySummary: null,
      mermaidDiagram: diagram,
      triggeredBy: "manual",
    });

    if (userId) {
      await Promise.allSettled([
        createNotification(userId, {
          type: "sync_complete",
          title: "Sync complete",
          message: `"${spec.title}" was successfully re-generated from source.`,
          specId,
        }),
      ]);
    }
  } catch {
    await db.update(specsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(specsTable.id, specId));
    if (userId) {
      await createNotification(userId, {
        type: "sync_failed",
        title: "Sync failed",
        message: `Failed to re-generate "${spec.title}". Please try again.`,
        specId,
      });
    }
  }
}

const router = Router();

export const SPEC_PROMPTS: Record<string, string> = {
  system_design: `You are a senior software architect. Generate a comprehensive System Design Document for the following project.

Include these sections:
# System Design Document

## Overview
Brief summary of the system and its goals.

## Architecture Overview
High-level architecture with components and their interactions.

## Core Components
Detailed breakdown of each major component.

## Data Flow
How data moves through the system.

## Technology Stack
Recommended technologies and justifications.

## Scalability & Performance
How the system scales, caching strategies, performance considerations.

## Security Considerations
Authentication, authorization, data protection.

## Deployment
Infrastructure, CI/CD pipeline, monitoring.

## Trade-offs & Decisions
Key architectural decisions and their rationale.

Format in clean, professional markdown. Be specific and technical. Use tables and diagrams described in text where helpful.`,

  api_design: `You are a senior API architect. Generate a comprehensive API Design Document for the following project.

Include these sections:
# API Design Document

## Overview
API purpose, audience, and design philosophy.

## Base URL & Versioning
API endpoint structure and versioning strategy.

## Authentication
Auth mechanism (JWT, API keys, OAuth, etc.) with examples.

## Core Endpoints
For each endpoint, provide:
- Method, path, description
- Request headers, params, body (with types)
- Response schema and status codes
- Example request/response

## Error Handling
Standard error format, error codes, and common errors.

## Rate Limiting
Rate limit policies and headers.

## Data Models
Core data schemas with field types and constraints.

Format in clean, professional markdown with code blocks for examples.`,

  database_schema: `You are a senior database architect. Generate a comprehensive Database Schema Design for the following project.

Include these sections:
# Database Schema Design

## Overview
Database choice rationale and design principles.

## Entity Relationship Diagram
Describe the ERD in text with relationships clearly stated.

## Tables / Collections

For each table/collection:
- Table name and purpose
- All columns with: name, type, constraints, description
- Primary and foreign keys
- Indexes
- Example rows

## Relationships
Detailed explanation of all relationships (1:1, 1:N, M:N).

## Indexes & Performance
Strategic indexes and query optimization.

## Migrations Strategy
How to handle schema evolution safely.

Format in clean markdown with SQL CREATE TABLE statements and descriptions.`,

  feature_spec: `You are a senior product engineer. Generate a comprehensive Feature Specification Document for the following project.

Include these sections:
# Feature Specification

## Overview
What this feature is, why it exists, and who it serves.

## Problem Statement
The specific problem being solved.

## Goals & Non-Goals
What success looks like and what's explicitly out of scope.

## User Stories
Detailed user stories in "As a [user], I want [feature] so that [benefit]" format.

## Functional Requirements
Numbered list of specific, testable requirements.

## Non-Functional Requirements
Performance, security, accessibility, scalability requirements.

## Technical Approach
Recommended implementation strategy with key components.

## API Changes
New or modified endpoints needed.

## Data Model Changes
Database schema additions or modifications.

## Acceptance Criteria
Specific, testable conditions for feature completion.

Format in clean, professional markdown. Be thorough and specific.`,
};

router.get("/recent", async (req, res) => {
  const ownerFilter = visibleSpecs(req.user!.id);

  try {
    const [specs, countRows, totalCount] = await Promise.all([
      db.select().from(specsTable)
        .where(ownerFilter)
        .orderBy(desc(specsTable.createdAt))
        .limit(10),

      db.select({
        specType: specsTable.specType,
        count: sql<number>`cast(count(*) as int)`,
      })
        .from(specsTable)
        .where(ownerFilter)
        .groupBy(specsTable.specType),

      db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(specsTable)
        .where(ownerFilter),
    ]);

    const byType: Record<string, number> = {};
    for (const row of countRows) byType[row.specType] = row.count;

    res.json({
      specs: specs.map(serializeSpec),
      totalCount: totalCount[0]?.count ?? 0,
      byType,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get recent specs");
    res.status(500).json({ error: "Failed to get recent specs" });
  }
});

export async function getSharedSpec(req: Request, res: Response) {
  res.set("Cache-Control", "no-store");
  const token = req.params.token;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Invalid share token" });
    return;
  }
  try {
    const [spec] = await db
      .select()
      .from(specsTable)
      .where(eq(specsTable.shareToken, token));

    if (!spec) {
      res.status(404).json({ error: "Spec not found" });
      return;
    }

    const [count] = await db
      .update(specsTable)
      .set({ viewCount: sql`${specsTable.viewCount} + 1` })
      .where(and(eq(specsTable.id, spec.id), eq(specsTable.shareToken, token))).returning({ viewCount: specsTable.viewCount });

    if (!count) { res.status(404).json({ error: "Spec not found" }); return; }
    res.json({
      id: spec.id, title: spec.title, specType: spec.specType, inputType: spec.inputType,
      content: spec.content, createdAt: spec.createdAt.toISOString(), viewCount: count.viewCount,
      mermaidDiagram: spec.mermaidDiagram, complexityScore: spec.complexityScore,
      techDebtRisks: spec.techDebtRisks, complexitySummary: spec.complexitySummary,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get spec by share token");
    res.status(500).json({ error: "Failed to get spec by share token" });
  }
}

router.get("/", async (req, res) => {
  const ownerFilter = visibleSpecs(req.user!.id);

  try {
    const specs = await db
      .select()
      .from(specsTable)
      .where(ownerFilter)
      .orderBy(desc(specsTable.createdAt));

    res.json(specs.map(serializeSpec));
  } catch (err) {
    req.log.error({ err }, "Failed to list specs");
    res.status(500).json({ error: "Failed to list specs" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateSpecBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { title, specType, inputType, inputValue } = parsed.data;
  if (inputType === "github_url" && !parseGitHubRepo(inputValue)) {
    res.status(400).json({ error: "Enter a public GitHub repository URL" });
    return;
  }
  const rawBody = req.body as {
    imageInput?: string;
    inputType?: string;
    imageDescription?: string;
  };
  const { imageInput } = rawBody;
  if (imageInput && !localVisionEnabled) { res.status(400).json({ error: "Image analysis requires a local vision model" }); return; }
  if (imageInput != null && (typeof imageInput !== "string" || imageInput.length > 2796204 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageInput))) {
    res.status(400).json({ error: "Invalid image or image exceeds 2 MB" });
    return;
  }
  const rawInputType: string = rawBody.inputType ?? inputType;

  const userId = (req as AuthedRequest).user?.id ?? undefined;

  try {
    const [spec] = await db
      .insert(specsTable)
      .values({
        userId: req.user!.id,
        title,
        specType,
        inputType: (rawInputType === "image" ? "description" : inputType) as any,
        inputValue: rawInputType === "image" ? (rawBody.imageDescription ?? "Generated from uploaded image") : inputValue,
        imageInput: imageInput ?? null,
        content: "",
        status: "pending",
        aiModel: localAIEnabled ? "local-ollama" : "template",
        multiAgent: false,
        extendedThinking: false,
      })
      .returning();

    // Fire notification + audit log on creation
    if (userId) {
      createNotification(userId, {
        type: "sync_complete",
        title: "Spec created",
        message: `"${title}" was added to your library.`,
        specId: spec.id,
      }).catch(() => {});
      createAuditLog({
        userId,
        action: "spec.created",
        resourceType: "spec",
        resourceId: spec.id,
        metadata: { title, specType, inputType: rawInputType, aiModel: localAIEnabled ? "local-ollama" : "template" },
        req,
      }).catch(() => {});
    }

    res.status(201).json(serializeSpec(spec));
  } catch (err) {
    req.log.error({ err }, "Failed to create spec");
    res.status(500).json({ error: "Failed to create spec" });
  }
});

router.post("/:id/sync", async (req: Request, res: Response) => {
  const parsed = GetSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  try {
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, parsed.data.id));
    if (!spec) {
      res.status(404).json({ error: "Spec not found" });
      return;
    }

    const userId = req.user?.id as string | undefined;
    if (!await claimGeneration(spec.id, spec.userId)) { res.status(409).json({ error: "A generation is already running for this spec or the account is at its limit" }); return; }
    runSpecGeneration(spec.id, userId).catch(err => req.log.error({ err }, "Sync failed"));

    res.json({ id: spec.id, status: "generating", lastSyncedAt: null });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger sync");
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

router.get("/:id/webhook", async (req: Request, res: Response) => {
  if (process.env.ENABLE_GITHUB_AUTO_SYNC !== "true") { res.status(503).json({ error: "GitHub auto-sync is disabled" }); return; }
  const parsed = GetSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  try {
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, parsed.data.id));
    if (!spec) {
      res.status(404).json({ error: "Spec not found" });
      return;
    }

    let secret = spec.webhookSecret;
    if (!secret) {
      secret = randomBytes(24).toString("hex");
      await db.update(specsTable).set({ webhookSecret: secret, updatedAt: new Date() }).where(eq(specsTable.id, spec.id));
    }

    const webhookUrl = getWebhookUrl(req);
    res.json({
      webhookUrl,
      secret,
      instructions: `In your GitHub repo, go to Settings → Webhooks → Add webhook. Set Payload URL to the webhook URL, Content type to application/json, Secret to the secret above, and select "Just the push event".`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get webhook config");
    res.status(500).json({ error: "Failed to get webhook config" });
  }
});

router.post("/:id/share", async (req, res) => {
  const parsed = GetSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  try {
    const [spec] = await db.update(specsTable)
      .set({ shareToken: sql`coalesce(${specsTable.shareToken}, ${generateShareToken()})` })
      .where(and(eq(specsTable.id, parsed.data.id), eq(specsTable.userId, req.user!.id)))
      .returning({ shareToken: specsTable.shareToken, viewCount: specsTable.viewCount });
    if (!spec?.shareToken) { res.status(404).json({ error: "Spec not found" }); return; }

    const origin = process.env.PUBLIC_URL ?? `${req.protocol}://${req.get("host")}`;
    const shareUrl = new URL("/share/" + spec.shareToken, origin).href;
    res.set("Cache-Control", "no-store").json({ ...spec, shareUrl });
  } catch (err) {
    req.log.error({ err }, "Failed to generate share link");
    res.status(500).json({ error: "Failed to generate share link" });
  }
});

router.delete("/:id/share", async (req, res) => {
  const [spec] = await db.update(specsTable).set({ shareToken: null, viewCount: 0 })
    .where(and(eq(specsTable.id, Number(req.params.id)), eq(specsTable.userId, req.user!.id)))
    .returning({ id: specsTable.id });
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  res.status(204).end();
});

router.post("/:id/chat", async (req, res) => {
  const parsed = GetOrCreateSpecChatParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  try {
    const [spec] = await db
      .select()
      .from(specsTable)
      .where(eq(specsTable.id, parsed.data.id));

    if (!spec) {
      res.status(404).json({ error: "Spec not found" });
      return;
    }

    if (spec.userId !== req.user!.id) { res.status(403).json({ error: "Only the spec owner can start its chat" }); return; }

    if (spec.conversationId) {
      const [existing] = await dbClient
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, spec.conversationId));

      if (existing && existing.userId === req.user!.id) {
        res.json({
          id: existing.id,
          title: existing.title,
          createdAt: existing.createdAt.toISOString(),
        });
        return;
      }
    }

    const [conv] = await dbClient
      .insert(conversationsTable)
      .values({ userId: req.user!.id, title: `Ask: ${spec.title}` })
      .returning();

    await db
      .update(specsTable)
      .set({ conversationId: conv.id, updatedAt: new Date() })
      .where(eq(specsTable.id, spec.id));

    res.json({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get or create spec chat");
    res.status(500).json({ error: "Failed to get or create spec chat" });
  }
});

router.get("/:id", async (req, res) => {
  const parsed = GetSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  try {
    const [spec] = await db
      .select()
      .from(specsTable)
      .where(eq(specsTable.id, parsed.data.id));

    if (!spec) {
      res.status(404).json({ error: "Spec not found" });
      return;
    }

    res.json(serializeSpec(spec));
  } catch (err) {
    req.log.error({ err }, "Failed to get spec");
    res.status(500).json({ error: "Failed to get spec" });
  }
});

router.patch("/:id/content", async (req, res) => {
  const { content, previousContent } = req.body ?? {};
  if (typeof content !== "string" || !content.trim() || content.length > 200_000 ||
      typeof previousContent !== "string" || previousContent.length > 200_000) {
    res.status(400).json({ error: "Enter a document between 1 and 200,000 characters" });
    return;
  }
  const specId = Number(req.params.id);
  const updated = await db.transaction(async tx => {
    const [spec] = await tx.update(specsTable).set({
      content, complexityScore: null, techDebtRisks: null, complexitySummary: null,
      updatedAt: new Date(),
    }).where(and(
      eq(specsTable.id, specId), eq(specsTable.userId, req.user!.id),
      eq(specsTable.status, "completed"), eq(specsTable.content, previousContent),
    )).returning();
    if (spec) {
      await tx.insert(specVersionsTable).values({
        specId, content, mermaidDiagram: spec.mermaidDiagram, triggeredBy: "edit",
      });
    }
    return spec;
  });
  if (!updated) {
    res.status(409).json({ error: "The spec changed while you were editing. Copy your edits and reload before saving." });
    return;
  }
  res.json(serializeSpec(updated));
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  try {
    const result = await db
      .delete(specsTable)
      .where(eq(specsTable.id, parsed.data.id))
      .returning();

    if (result.length === 0) {
      res.status(404).json({ error: "Spec not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete spec");
    res.status(500).json({ error: "Failed to delete spec" });
  }
});

router.post("/:id/stream", async (req, res) => {
  const parsed = StreamSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, parsed.data.id));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }

  if (!await claimGeneration(spec.id, spec.userId)) { res.status(409).json({ error: "A generation is already running for this spec or the account is at its limit" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {

    let systemPrompt = SPEC_PROMPTS[spec.specType] || SPEC_PROMPTS.feature_spec;

    // Inject team custom system prompt (prepended — team conventions override defaults)
    if (spec.teamId) {
      try {
        const { teamsTable: teamsT } = await import("@workspace/db");
        const [teamRow] = await db.select({ customSystemPrompt: teamsT.customSystemPrompt })
          .from(teamsT).where(eq(teamsT.id, spec.teamId));
        if (teamRow?.customSystemPrompt?.trim()) {
          systemPrompt = `[Team Conventions — follow these strictly]\n${teamRow.customSystemPrompt.trim()}\n\n[Default Spec Instructions]\n${systemPrompt}`;
        }
      } catch {}
    }

    // Load user preferences for context enrichment
    let prefContext = "";
    const userId = req.user?.id as string | undefined;
    if (userId) {
      try {
        const { userPreferencesTable } = await import("@workspace/db");
        const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
        if (prefs) {
          const parts: string[] = [];
          if (prefs.preferredStack) parts.push(`Preferred tech stack: ${prefs.preferredStack}`);
          if (prefs.domain) parts.push(`Working domain: ${prefs.domain}`);
          if (prefs.alwaysIncludeSections?.length) parts.push(`Always include these sections: ${(prefs.alwaysIncludeSections as string[]).join(", ")}`);
          if (prefs.extraContext) parts.push(prefs.extraContext);
          if (parts.length) prefContext = `\n\n[User Preferences]\n${parts.join("\n")}`;
        }
      } catch {}
    }

    // Load team RAG knowledge context if spec is assigned to a team
    let ragContext = "";
    if (spec.teamId) {
      ragContext = await retrieveTeamKnowledge(spec.teamId, spec.inputValue ?? "");
      if (ragContext) {
        res.write(`data: ${JSON.stringify({ phase: "rag", message: "Loading team knowledge base…" })}\n\n`);
      }
    }

    const baseUserMessage = (await generationInput(spec)) + prefContext + ragContext;

    const imageBase64 = localVisionEnabled ? spec.imageInput ?? undefined : undefined;
    const imageMediaType = imageBase64?.startsWith("iVBOR") ? "image/png" : "image/jpeg";

    let fullContent = "";


    if (!localAIEnabled) {
      fullContent = buildSpecDraft(spec.specType, baseUserMessage);
      res.write("data: " + JSON.stringify({ content: fullContent }) + "\n\n");
    } else {
      for await (const chunk of streamCompletion({

        system: systemPrompt,
        userMessage: baseUserMessage,
        maxTokens: 8192,
        imageBase64,
        imageMediaType,
      })) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    }

    const diagram = draftDiagram(spec.specType);
    await db.update(specsTable).set({
      content: fullContent,
      aiModel: localAIEnabled ? "local-ollama" : "template",
      thinkingContent: null,
      status: "completed",
      complexityScore: null,
      techDebtRisks: null,
      complexitySummary: null,
      mermaidDiagram: diagram,
      updatedAt: new Date(),
    }).where(eq(specsTable.id, spec.id));

    await saveSpecVersion(spec.id, {
      content: fullContent,
      complexityScore: null,
      techDebtRisks: null,
      complexitySummary: null,
      mermaidDiagram: diagram,
      triggeredBy: "initial",
    });

    res.write(`data: ${JSON.stringify({ diagram })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to stream spec");
    await db.update(specsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(specsTable.id, spec.id));
    res.write(`event: error\ndata: ${JSON.stringify({ message: err instanceof Error ? err.message : "Generation failed" })}\n\n`);
    res.end();
  }
});

router.post("/:id/export/notion", async (req, res) => {
  const parsed = GetSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid spec ID" }); return; }

  const notionToken = process.env.NOTION_API_KEY;
  if (!notionToken) { res.status(503).json({ error: "Notion API key not configured" }); return; }

  try {
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, parsed.data.id));
    if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
    if (!spec.content) { res.status(400).json({ error: "Spec has no content yet" }); return; }

    // Convert markdown content into Notion blocks
    const lines = spec.content.split("\n");
    const blocks: any[] = [];

    for (const line of lines) {
      if (line.startsWith("# ")) {
        blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2).trim() } }] } });
      } else if (line.startsWith("## ")) {
        blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3).trim() } }] } });
      } else if (line.startsWith("### ")) {
        blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: line.slice(4).trim() } }] } });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2).trim() } }] } });
      } else if (/^\d+\. /.test(line)) {
        blocks.push({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: [{ type: "text", text: { content: line.replace(/^\d+\. /, "").trim() } }] } });
      } else if (line.startsWith("```") || line.startsWith("    ")) {
        blocks.push({ object: "block", type: "code", code: { rich_text: [{ type: "text", text: { content: line.replace(/^```\w*/, "").trim() } }], language: "plain text" } });
      } else if (line.startsWith("> ")) {
        blocks.push({ object: "block", type: "quote", quote: { rich_text: [{ type: "text", text: { content: line.slice(2).trim() } }] } });
      } else if (line.trim() === "" || line.trim() === "---" || line.trim() === "***") {
        blocks.push({ object: "block", type: "divider", divider: {} });
      } else if (line.trim()) {
        // Parse inline bold/italic into rich_text
        const richText = parseInlineMarkdown(line.trim());
        blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: richText } });
      }
    }

    // Notion API allows max 100 blocks per request — chunk them
    const CHUNK = 100;
    const chunked: any[][] = [];
    for (let i = 0; i < blocks.length; i += CHUNK) chunked.push(blocks.slice(i, i + CHUNK));

    // Search for a parent page — use the first page accessible to the integration
    const searchRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { value: "page", property: "object" }, page_size: 1 }),
    });

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      req.log.error({ status: searchRes.status, body: errBody }, "Notion search failed");
      res.status(502).json({ error: "Could not access Notion workspace. Make sure your integration has access to at least one page." });
      return;
    }

    const searchData = await searchRes.json() as any;
    const parentPageId = searchData.results?.[0]?.id;

    if (!parentPageId) {
      res.status(502).json({ error: "No Notion pages found. Share at least one page with your integration in Notion." });
      return;
    }

    // Create the page
    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({
        parent: { page_id: parentPageId },
        icon: { type: "emoji", emoji: "📋" },
        properties: { title: { title: [{ type: "text", text: { content: spec.title } }] } },
        children: chunked[0] ?? [],
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      req.log.error({ status: createRes.status, body: errBody }, "Notion page creation failed");
      res.status(502).json({ error: "Failed to create Notion page" });
      return;
    }

    const page = await createRes.json() as any;
    const pageId = page.id;
    const pageUrl = page.url;

    // Append remaining chunks if any
    for (let i = 1; i < chunked.length; i++) {
      await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ children: chunked[i] }),
      });
    }

    res.json({ pageUrl, pageId, title: spec.title });
  } catch (err) {
    req.log.error({ err }, "Notion export failed");
    res.status(500).json({ error: "Notion export failed" });
  }
});

function parseInlineMarkdown(text: string): any[] {
  const result: any[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(.+?(?=\*\*|\*|`|$))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      result.push({ type: "text", text: { content: match[2] }, annotations: { bold: true } });
    } else if (match[3]) {
      result.push({ type: "text", text: { content: match[4] }, annotations: { italic: true } });
    } else if (match[5]) {
      result.push({ type: "text", text: { content: match[6] }, annotations: { code: true } });
    } else if (match[7]) {
      result.push({ type: "text", text: { content: match[7] } });
    }
  }
  return result.length > 0 ? result : [{ type: "text", text: { content: text } }];
}

router.post("/:id/scaffold", requireLocalAI, async (req, res) => {
  const parsed = GetSpecParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }

  try {
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, parsed.data.id));
    if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
    if (!spec.content) { res.status(400).json({ error: "Spec has no content yet" }); return; }

    const systemPrompt = `You are an expert software architect. Given a technical spec document, generate a complete project scaffold as a JSON object.
Return ONLY valid JSON with no markdown, no code fences, no explanation.
Return exactly this structure:
{
  "projectName": "<kebab-case-project-name>",
  "description": "<one line project description>",
  "stack": "<primary stack, e.g. Node.js + TypeScript + PostgreSQL>",
  "files": [
    { "path": "<relative path>", "content": "<file content>", "language": "<typescript|javascript|json|yaml|sql|markdown|bash|text>" }
  ]
}
Rules:
- Include 8-15 files that represent a working project skeleton
- Always include: README.md, package.json (or equivalent), main entry point, at least 2 source files, .gitignore, and a config file
- For API specs: include routes, controllers, middleware folders
- For DB schemas: include migration files and model definitions
- For system design: include docker-compose.yml and service entry points
- For feature specs: include component files and basic test scaffold
- File content should be real, usable starter code — not placeholders
- Use modern best practices (TypeScript, ESM, etc.)
- Keep each file focused and reasonably complete but concise`;

    const userMessage = `Generate a project scaffold for this specification:\n\n${spec.content.slice(0, 8000)}`;

    const raw = await generateCompletion({ system: systemPrompt, userMessage, maxTokens: 8192 });

    let scaffold;
    try {
      scaffold = JSON.parse(raw.trim());
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) scaffold = JSON.parse(match[0]);
      else throw new Error("Failed to parse scaffold JSON");
    }

    res.json(scaffold);
  } catch (err) {
    req.log.error({ err }, "Failed to generate scaffold");
    res.status(500).json({ error: "Failed to generate scaffold" });
  }
});

export default router;
