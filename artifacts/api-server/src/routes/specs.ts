import { Router, type Request, type Response } from "express";
import { db, specsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db as dbClient, conversations as conversationsTable } from "@workspace/db";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";
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
    shareToken: s.shareToken ?? null,
    webhookSecret: undefined,
    lastSyncedAt: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function getWebhookUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  return `${proto}://${host}/api/webhooks/github`;
}

async function runSpecGeneration(specId: number): Promise<void> {
  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) return;

  await db.update(specsTable).set({ status: "generating", updatedAt: new Date() }).where(eq(specsTable.id, specId));

  try {
    const systemPrompt = SPEC_PROMPTS[spec.specType] || SPEC_PROMPTS.feature_spec;
    const userMessage = spec.inputType === "github_url"
      ? `Generate a ${spec.specType.replace(/_/g, " ")} for this GitHub repository: ${spec.inputValue}\n\nAnalyze the repository URL and make reasonable assumptions about the project based on the URL structure and naming. Create a detailed, professional document.`
      : `Generate a ${spec.specType.replace(/_/g, " ")} for this project:\n\n${spec.inputValue}\n\nCreate a detailed, professional document based on this description.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content[0];
    const fullContent = block.type === "text" ? block.text : "";

    const [analysis, diagram] = await Promise.allSettled([
      generateComplexityAnalysis(fullContent, spec.specType),
      generateMermaidDiagram(fullContent, spec.specType),
    ]);

    await db.update(specsTable).set({
      content: fullContent,
      status: "completed",
      complexityScore: analysis.status === "fulfilled" ? analysis.value?.score ?? null : null,
      techDebtRisks: analysis.status === "fulfilled" ? analysis.value?.risks ?? null : null,
      complexitySummary: analysis.status === "fulfilled" ? analysis.value?.summary ?? null : null,
      mermaidDiagram: diagram.status === "fulfilled" ? diagram.value ?? null : null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(specsTable.id, specId));
  } catch {
    await db.update(specsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(specsTable.id, specId));
  }
}

function verifyGitHubSignature(payload: Buffer, secret: string, signature: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

const router = Router();

const SPEC_PROMPTS: Record<string, string> = {
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

const MERMAID_PROMPTS: Record<string, string> = {
  system_design: "Generate a Mermaid.js flowchart (graph TD) showing the system architecture. Include the main components, services, databases, and their connections. Use clear node labels.",
  api_design: "Generate a Mermaid.js sequence diagram showing the key API interactions between client, server, and any external services. Show authentication flow and main request/response cycles.",
  database_schema: "Generate a Mermaid.js entity relationship diagram (erDiagram) showing all tables, their fields (with types), and relationships. Use proper ER notation.",
  feature_spec: "Generate a Mermaid.js flowchart (graph TD) showing the user journey and feature flow from start to completion. Include decision points and key states.",
};

async function generateComplexityAnalysis(specContent: string, specType: string) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: `You are a senior software architect analyzing technical design documents. 
Return ONLY valid JSON with no markdown formatting, no code blocks, no explanation.
Return exactly this structure:
{
  "score": <integer 1-10>,
  "label": "<Low|Medium|High|Very High>",
  "risks": [
    { "title": "<short title>", "severity": "<high|medium|low>", "description": "<1-2 sentence description>" }
  ],
  "summary": "<2-3 sentence overall assessment>"
}`,
    messages: [
      {
        role: "user",
        content: `Analyze this ${specType.replace(/_/g, " ")} for complexity and technical debt risks:

${specContent.slice(0, 6000)}

Provide a complexity score from 1-10 where:
1-3 = Simple, straightforward implementation
4-6 = Moderate complexity, manageable with care  
7-8 = High complexity, significant risks
9-10 = Very high complexity, major concerns

Identify 2-4 specific technical debt risks. Be concrete and actionable.`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  try {
    return JSON.parse(block.text.trim());
  } catch {
    const match = block.text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse complexity analysis JSON");
  }
}

async function generateMermaidDiagram(specContent: string, specType: string) {
  const prompt = MERMAID_PROMPTS[specType] || MERMAID_PROMPTS.system_design;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: `You generate Mermaid.js diagrams based on technical specifications.
Return ONLY the raw Mermaid diagram syntax. No markdown code fences, no explanation, no \`\`\`mermaid prefix.
Start directly with the diagram type (e.g., "graph TD" or "sequenceDiagram" or "erDiagram").
Keep it readable — max 15-20 nodes. Use short, clear labels.`,
    messages: [
      {
        role: "user",
        content: `${prompt}

Based on this specification:

${specContent.slice(0, 5000)}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  let diagram = block.text.trim();
  diagram = diagram.replace(/^```mermaid\n?/, "").replace(/\n?```$/, "").trim();
  return diagram;
}

router.get("/recent", async (req, res) => {
  try {
    const specs = await db
      .select()
      .from(specsTable)
      .orderBy(desc(specsTable.createdAt))
      .limit(10);

    const countRows = await db
      .select({
        specType: specsTable.specType,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(specsTable)
      .groupBy(specsTable.specType);

    const totalCount = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(specsTable);

    const byType: Record<string, number> = {};
    for (const row of countRows) {
      byType[row.specType] = row.count;
    }

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

router.get("/share/:token", async (req, res) => {
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

    await db
      .update(specsTable)
      .set({ viewCount: (spec.viewCount ?? 0) + 1, updatedAt: new Date() })
      .where(eq(specsTable.id, spec.id));

    res.json(serializeSpec({ ...spec, viewCount: (spec.viewCount ?? 0) + 1 }));
  } catch (err) {
    req.log.error({ err }, "Failed to get spec by share token");
    res.status(500).json({ error: "Failed to get spec by share token" });
  }
});

router.get("/", async (req, res) => {
  try {
    const specs = await db
      .select()
      .from(specsTable)
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

  try {
    const [spec] = await db
      .insert(specsTable)
      .values({
        title,
        specType,
        inputType,
        inputValue,
        content: "",
        status: "pending",
      })
      .returning();

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

    runSpecGeneration(spec.id).catch(() => {});

    res.json({ id: spec.id, status: "generating", lastSyncedAt: null });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger sync");
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

router.get("/:id/webhook", async (req: Request, res: Response) => {
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
    const [spec] = await db
      .select()
      .from(specsTable)
      .where(eq(specsTable.id, parsed.data.id));

    if (!spec) {
      res.status(404).json({ error: "Spec not found" });
      return;
    }

    let token = spec.shareToken;
    if (!token) {
      token = generateShareToken();
      await db
        .update(specsTable)
        .set({ shareToken: token, updatedAt: new Date() })
        .where(eq(specsTable.id, spec.id));
    }

    const host = req.headers.host ?? "localhost";
    const protocol = req.headers["x-forwarded-proto"] ?? "https";
    const shareUrl = `${protocol}://${host}/share/${token}`;

    res.json({ shareToken: token, shareUrl, viewCount: spec.viewCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to generate share link");
    res.status(500).json({ error: "Failed to generate share link" });
  }
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

    if (spec.conversationId) {
      const [existing] = await dbClient
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, spec.conversationId));

      if (existing) {
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
      .values({ title: `Ask: ${spec.title}` })
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

  const [spec] = await db
    .select()
    .from(specsTable)
    .where(eq(specsTable.id, parsed.data.id));

  if (!spec) {
    res.status(404).json({ error: "Spec not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await db
      .update(specsTable)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(specsTable.id, spec.id));

    const systemPrompt =
      SPEC_PROMPTS[spec.specType] || SPEC_PROMPTS.feature_spec;
    const userMessage =
      spec.inputType === "github_url"
        ? `Generate a ${spec.specType.replace(/_/g, " ")} for this GitHub repository: ${spec.inputValue}\n\nAnalyze the repository URL and make reasonable assumptions about the project based on the URL structure and naming. Create a detailed, professional document.`
        : `Generate a ${spec.specType.replace(/_/g, " ")} for this project:\n\n${spec.inputValue}\n\nCreate a detailed, professional document based on this description.`;

    let fullContent = "";

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullContent += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db
      .update(specsTable)
      .set({ content: fullContent, status: "generating", updatedAt: new Date() })
      .where(eq(specsTable.id, spec.id));

    res.write(`data: ${JSON.stringify({ phase: "analyzing" })}\n\n`);

    const [analysis, diagram] = await Promise.allSettled([
      generateComplexityAnalysis(fullContent, spec.specType),
      generateMermaidDiagram(fullContent, spec.specType),
    ]);

    const analysisData =
      analysis.status === "fulfilled" ? analysis.value : null;
    const diagramData =
      diagram.status === "fulfilled" ? diagram.value : null;

    if (analysisData) {
      res.write(`data: ${JSON.stringify({ analysis: analysisData })}\n\n`);
    }
    if (diagramData) {
      res.write(`data: ${JSON.stringify({ diagram: diagramData })}\n\n`);
    }

    await db
      .update(specsTable)
      .set({
        content: fullContent,
        status: "completed",
        complexityScore: analysisData?.score ?? null,
        techDebtRisks: analysisData?.risks ?? null,
        complexitySummary: analysisData?.summary ?? null,
        mermaidDiagram: diagramData ?? null,
        updatedAt: new Date(),
      })
      .where(eq(specsTable.id, spec.id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to stream spec");
    await db
      .update(specsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(specsTable.id, spec.id));
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

export default router;
