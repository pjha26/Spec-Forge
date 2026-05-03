/**
 * SpecForge MCP Server — Model Context Protocol over Streamable HTTP.
 * Exposes SpecForge as tools callable from Cursor, Claude Code, Continue.dev, etc.
 *
 * Transport: HTTP POST /api/mcp  (JSON-RPC 2.0)
 * Manifest:  GET  /api/mcp
 *
 * To add to Cursor: Settings → MCP → Add Server → URL: https://<your-domain>/api/mcp
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateCompletion, isValidModel } from "../lib/model-router.js";

const router = Router();

const TOOLS = [
  {
    name: "generate_spec",
    description: "Generate a technical specification document (System Design, API Design, Database Schema, or Feature Spec) from a description or GitHub URL.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the specification" },
        specType: {
          type: "string",
          enum: ["system_design", "api_design", "database_schema", "feature_spec"],
          description: "Type of spec to generate",
        },
        inputType: {
          type: "string",
          enum: ["github_url", "description"],
          description: "Whether the input is a GitHub URL or a text description",
        },
        inputValue: {
          type: "string",
          description: "The GitHub URL or project description to generate the spec from",
        },
        model: {
          type: "string",
          enum: ["claude-sonnet-4-6", "gpt-5.4", "gemini-2.5-pro", "gemini-2.5-flash"],
          description: "AI model to use (default: claude-sonnet-4-6)",
        },
      },
      required: ["title", "specType", "inputType", "inputValue"],
    },
  },
  {
    name: "list_specs",
    description: "List recently generated specifications from SpecForge.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of specs to return (default: 10)" },
      },
    },
  },
  {
    name: "get_spec",
    description: "Get the full content of a specific specification by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "The spec ID to retrieve" },
      },
      required: ["id"],
    },
  },
  {
    name: "analyze_spec",
    description: "Run an AI health analysis on a spec — returns completeness score, strengths, gaps, and improvement suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "The spec ID to analyze" },
      },
      required: ["id"],
    },
  },
];

// GET /api/mcp — server manifest (for discovery)
router.get("/", (_req, res) => {
  res.json({
    name: "SpecForge",
    version: "1.0.0",
    description: "AI-powered technical specification generator. Generate system designs, API docs, database schemas, and feature specs from any codebase or description.",
    tools: TOOLS,
    capabilities: { tools: {} },
  });
});

// POST /api/mcp — JSON-RPC 2.0 handler
router.post("/", async (req, res) => {
  const { jsonrpc, id, method, params } = req.body ?? {};

  if (jsonrpc !== "2.0") {
    res.status(400).json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } });
    return;
  }

  try {
    if (method === "initialize") {
      res.json({
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "SpecForge", version: "1.0.0" },
        },
      });
      return;
    }

    if (method === "tools/list") {
      res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
      return;
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params ?? {};
      const result = await handleTool(name, args ?? {}, req);
      res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: result }] } });
      return;
    }

    res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err: any) {
    req.log.error({ err }, "MCP handler error");
    res.json({ jsonrpc: "2.0", id, error: { code: -32603, message: err?.message ?? "Internal error" } });
  }
});

async function handleTool(name: string, args: Record<string, any>, req: any): Promise<string> {
  if (name === "list_specs") {
    const limit = Math.min(Number(args.limit) || 10, 50);
    const specs = await db.select({
      id: specsTable.id,
      title: specsTable.title,
      specType: specsTable.specType,
      status: specsTable.status,
      aiModel: specsTable.aiModel,
      createdAt: specsTable.createdAt,
    }).from(specsTable).orderBy(desc(specsTable.createdAt)).limit(limit);

    if (specs.length === 0) return "No specs found.";
    const lines = specs.map(s =>
      `• [${s.id}] ${s.title} (${s.specType.replace(/_/g, " ")}) — ${s.status} — ${s.createdAt.toISOString().slice(0, 10)}`
    );
    return `Found ${specs.length} specs:\n\n${lines.join("\n")}`;
  }

  if (name === "get_spec") {
    const specId = Number(args.id);
    if (!specId) throw new Error("id is required");
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
    if (!spec) throw new Error(`Spec ${specId} not found`);
    if (!spec.content) return `Spec "${spec.title}" exists but has no content yet (status: ${spec.status}).`;
    return `# ${spec.title}\n**Type:** ${spec.specType.replace(/_/g, " ")}\n**Model:** ${spec.aiModel}\n**Status:** ${spec.status}\n\n---\n\n${spec.content}`;
  }

  if (name === "get_spec_summary") {
    const specId = Number(args.id);
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
    if (!spec) throw new Error(`Spec ${specId} not found`);
    return `Spec "${spec.title}" — complexity score: ${spec.complexityScore ?? "N/A"}/10\n\n${spec.complexitySummary ?? "No summary yet."}`;
  }

  if (name === "analyze_spec") {
    const specId = Number(args.id);
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
    if (!spec) throw new Error(`Spec ${specId} not found`);
    if (!spec.content) throw new Error("Spec has no content to analyze");

    const analysis = await generateCompletion({
      model: "claude-sonnet-4-6",
      system: `You are a senior technical architect reviewing specification documents. Provide a concise, actionable analysis.`,
      userMessage: `Analyze this ${spec.specType.replace(/_/g, " ")} specification for completeness, quality, and gaps:\n\n${spec.content.slice(0, 6000)}\n\nProvide:\n1. Completeness score (0-100%)\n2. Overall health (Excellent/Good/Fair/Poor)\n3. Top 3 strengths\n4. Top 3 gaps or missing sections\n5. 3 specific improvement suggestions`,
      maxTokens: 2048,
    });
    return analysis;
  }

  if (name === "generate_spec") {
    const { title, specType, inputType, inputValue, model = "claude-sonnet-4-6" } = args;
    if (!title || !specType || !inputType || !inputValue) throw new Error("title, specType, inputType, inputValue are required");

    const PROMPTS: Record<string, string> = {
      system_design: "You are a senior software architect. Generate a comprehensive System Design Document. Include: Overview, Architecture, Components, Data Flow, Tech Stack, Scalability, Security, Deployment, and Trade-offs. Use professional markdown.",
      api_design: "You are a senior API architect. Generate a comprehensive API Design Document. Include: Overview, Base URL, Authentication, Core Endpoints (with request/response examples), Error Handling, Rate Limiting, and Data Models. Use professional markdown with code blocks.",
      database_schema: "You are a senior database architect. Generate a comprehensive Database Schema Design. Include: Overview, Entity Relationships, Tables with full column definitions, Indexes, Relationships, Migration Strategy. Include SQL DDL examples.",
      feature_spec: "You are a senior product engineer. Generate a comprehensive Feature Specification. Include: Overview, Problem Statement, Goals & Non-Goals, User Stories, Functional Requirements, Non-Functional Requirements, Technical Approach, Acceptance Criteria.",
    };

    const systemPrompt = PROMPTS[specType] ?? PROMPTS.feature_spec;
    const userMessage = inputType === "github_url"
      ? `Generate a ${specType.replace(/_/g, " ")} for this GitHub repository: ${inputValue}. Analyze the URL and create a detailed, professional document.`
      : `Generate a ${specType.replace(/_/g, " ")} for: ${inputValue}\n\nCreate a detailed, professional document.`;

    const modelToUse = isValidModel(model) ? model : "claude-sonnet-4-6";

    // Generate in background and save
    const [spec] = await db.insert(specsTable).values({
      title, specType, inputType, inputValue, content: "", status: "generating", aiModel: modelToUse,
    }).returning();

    // Run generation async and return the spec ID immediately
    generateCompletion({ model: modelToUse, system: systemPrompt, userMessage, maxTokens: 8192 })
      .then(async (content) => {
        await db.update(specsTable).set({ content, status: "completed", updatedAt: new Date() }).where(eq(specsTable.id, spec.id));
      })
      .catch(async () => {
        await db.update(specsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(specsTable.id, spec.id));
      });

    return `Spec generation started!\n\n**Spec ID:** ${spec.id}\n**Title:** ${title}\n**Type:** ${specType.replace(/_/g, " ")}\n**Model:** ${modelToUse}\n\nThe spec is generating in the background. Use \`get_spec\` with id=${spec.id} in ~30 seconds to retrieve the full content.\n\nView it in the browser at: /app/specs/${spec.id}`;
  }

  throw new Error(`Unknown tool: ${name}`);
}

export default router;
