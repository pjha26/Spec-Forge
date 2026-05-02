import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  CreateSpecBody,
  GetSpecParams,
  DeleteSpecParams,
  StreamSpecParams,
} from "@workspace/api-zod";

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

## WebSocket / Real-time (if applicable)
Real-time events and their payloads.

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

## Seed Data
Example seed data for development/testing.

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

## UI/UX Notes
Key interaction patterns and flows (no wireframes, just descriptions).

## API Changes
New or modified endpoints needed.

## Data Model Changes
Database schema additions or modifications.

## Acceptance Criteria
Specific, testable conditions for feature completion.

## Open Questions
Unresolved decisions that need answers before implementation.

Format in clean, professional markdown. Be thorough and specific.`,
};

async function generateSpecContent(
  specType: string,
  inputType: string,
  inputValue: string
): Promise<string> {
  const systemPrompt = SPEC_PROMPTS[specType] || SPEC_PROMPTS.feature_spec;

  const userMessage =
    inputType === "github_url"
      ? `Generate a ${specType.replace(/_/g, " ")} for this GitHub repository: ${inputValue}\n\nAnalyze the repository URL and make reasonable assumptions about the project based on the URL structure and naming. Create a detailed, professional document.`
      : `Generate a ${specType.replace(/_/g, " ")} for this project:\n\n${inputValue}\n\nCreate a detailed, professional document based on this description.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
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
      specs: specs.map((s) => ({
        ...s,
        specType: s.specType,
        inputType: s.inputType,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      totalCount: totalCount[0]?.count ?? 0,
      byType,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get recent specs");
    res.status(500).json({ error: "Failed to get recent specs" });
  }
});

router.get("/", async (req, res) => {
  try {
    const specs = await db
      .select()
      .from(specsTable)
      .orderBy(desc(specsTable.createdAt));

    res.json(
      specs.map((s) => ({
        ...s,
        specType: s.specType,
        inputType: s.inputType,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))
    );
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

    res.status(201).json({
      ...spec,
      createdAt: spec.createdAt.toISOString(),
      updatedAt: spec.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create spec");
    res.status(500).json({ error: "Failed to create spec" });
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

    res.json({
      ...spec,
      createdAt: spec.createdAt.toISOString(),
      updatedAt: spec.updatedAt.toISOString(),
    });
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

    const systemPrompt = SPEC_PROMPTS[spec.specType] || SPEC_PROMPTS.feature_spec;
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
      .set({ content: fullContent, status: "completed", updatedAt: new Date() })
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
