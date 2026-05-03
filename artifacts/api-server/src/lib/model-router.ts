/**
 * Unified model router — abstracts Claude, GPT, and Gemini behind a single
 * streaming interface so route handlers stay model-agnostic.
 * Supports: standard completion, extended thinking (Claude), multimodal image input.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ai as gemini } from "@workspace/integrations-gemini-ai";

export type SupportedModel =
  | "claude-sonnet-4-6"
  | "gpt-5.4"
  | "gpt-5.1"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash";

export const MODEL_META: Record<SupportedModel, { label: string; provider: "anthropic" | "openai" | "gemini"; badge: string }> = {
  "claude-sonnet-4-6": { label: "Claude Sonnet",    provider: "anthropic", badge: "Anthropic" },
  "gpt-5.4":           { label: "GPT-5.4",          provider: "openai",    badge: "OpenAI"    },
  "gpt-5.1":           { label: "GPT-5.1",          provider: "openai",    badge: "OpenAI"    },
  "gemini-2.5-pro":    { label: "Gemini 2.5 Pro",   provider: "gemini",    badge: "Google"    },
  "gemini-2.5-flash":  { label: "Gemini 2.5 Flash", provider: "gemini",    badge: "Google"    },
};

export function isValidModel(model: unknown): model is SupportedModel {
  return typeof model === "string" && model in MODEL_META;
}

export interface CompletionOpts {
  model: SupportedModel;
  system: string;
  userMessage: string;
  maxTokens?: number;
  /** base64-encoded image (JPEG/PNG/WebP) — only supported on Claude and GPT */
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export interface ThinkingResult {
  thinking: string;
  text: string;
}

/** Standard non-streaming completion. */
export async function generateCompletion(opts: CompletionOpts): Promise<string> {
  const { model, system, userMessage, maxTokens = 8192, imageBase64, imageMediaType } = opts;
  const meta = MODEL_META[model];

  if (meta.provider === "anthropic") {
    const userContent: any[] = imageBase64
      ? [
          { type: "image", source: { type: "base64", media_type: imageMediaType ?? "image/jpeg", data: imageBase64 } },
          { type: "text", text: userMessage },
        ]
      : [{ type: "text", text: userMessage }];

    const msg = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    });
    const block = msg.content.find((b: any) => b.type === "text");
    return block?.type === "text" ? block.text : "";
  }

  if (meta.provider === "openai") {
    const userContent: any[] = imageBase64
      ? [
          { type: "text", text: userMessage },
          { type: "image_url", image_url: { url: `data:${imageMediaType ?? "image/jpeg"};base64,${imageBase64}` } },
        ]
      : [{ type: "text", text: userMessage }];

    const resp = await openai.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    } as any);
    return resp.choices[0]?.message?.content ?? "";
  }

  // Gemini — no image support yet, fall back to text-only
  const response = await gemini.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: `${system}\n\n${userMessage}` }] }],
    config: { maxOutputTokens: maxTokens },
  });
  return response.text ?? "";
}

/**
 * Extended thinking — Claude only.
 * Returns both the thinking process and the final answer.
 * Falls back to standard completion for non-Claude models.
 */
export async function generateCompletionWithThinking(opts: CompletionOpts & { thinkingBudget?: number }): Promise<ThinkingResult> {
  const { model, system, userMessage, maxTokens = 16000, thinkingBudget = 10000, imageBase64, imageMediaType } = opts;
  const meta = MODEL_META[model];

  if (meta.provider === "anthropic") {
    const userContent: any[] = imageBase64
      ? [
          { type: "image", source: { type: "base64", media_type: imageMediaType ?? "image/jpeg", data: imageBase64 } },
          { type: "text", text: userMessage },
        ]
      : [{ type: "text", text: userMessage }];

    const msg = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      thinking: { type: "enabled", budget_tokens: thinkingBudget },
      system,
      messages: [{ role: "user", content: userContent }],
    } as any);

    let thinking = "";
    let text = "";
    for (const block of msg.content as any[]) {
      if (block.type === "thinking") thinking += block.thinking;
      else if (block.type === "text") text += block.text;
    }
    return { thinking, text };
  }

  // Non-Claude: no extended thinking, return empty thinking + normal text
  const text = await generateCompletion(opts);
  return { thinking: "", text };
}

/** Streams tokens via an async generator — yields string chunks. */
export async function* streamCompletion(opts: CompletionOpts): AsyncGenerator<string> {
  const { model, system, userMessage, maxTokens = 8192, imageBase64, imageMediaType } = opts;
  const meta = MODEL_META[model];

  if (meta.provider === "anthropic") {
    const userContent: any[] = imageBase64
      ? [
          { type: "image", source: { type: "base64", media_type: imageMediaType ?? "image/jpeg", data: imageBase64 } },
          { type: "text", text: userMessage },
        ]
      : [{ type: "text", text: userMessage }];

    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  if (meta.provider === "openai") {
    const userContent: any[] = imageBase64
      ? [
          { type: "text", text: userMessage },
          { type: "image_url", image_url: { url: `data:${imageMediaType ?? "image/jpeg"};base64,${imageBase64}` } },
        ]
      : [{ type: "text", text: userMessage }];

    const stream = await openai.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    } as any);
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
    return;
  }

  // Gemini streaming
  const stream = await gemini.models.generateContentStream({
    model,
    contents: [{ role: "user", parts: [{ text: `${system}\n\n${userMessage}` }] }],
    config: { maxOutputTokens: maxTokens },
  });
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

/**
 * Multi-agent parallel generation.
 * Runs 4 specialist agents concurrently and merges their outputs with a coordinator.
 * Emits progress via an optional callback.
 */
export async function generateMultiAgent(opts: {
  model: SupportedModel;
  specType: string;
  userMessage: string;
  imageBase64?: string;
  imageMediaType?: string;
  onProgress?: (agent: string, chunk: string) => void;
}): Promise<string> {
  const { model, specType, userMessage, imageBase64, imageMediaType, onProgress } = opts;

  const agents: Array<{ name: string; role: string; focus: string }> = [
    {
      name: "architect",
      role: "Senior Software Architect",
      focus: `Focus ONLY on: system overview, high-level architecture, component breakdown, data flow, technology stack choices with justifications, scalability patterns, and deployment strategy. Be specific and technical. Use markdown with clear headings.`,
    },
    {
      name: "security",
      role: "Principal Security Engineer",
      focus: `Focus ONLY on: authentication and authorization design, data protection (encryption at rest/in transit), input validation and sanitization, API security (rate limiting, CORS, CSRF), secrets management, OWASP threat modeling, compliance considerations, and security testing approach. Be thorough and specific.`,
    },
    {
      name: "database",
      role: "Senior Database Architect",
      focus: `Focus ONLY on: data model design, table/collection schemas with field types and constraints, primary and foreign keys, indexes for query performance, relationships (1:1, 1:N, M:N), migration strategy, query optimization, caching layer design, and backup/recovery approach. Include SQL DDL examples.`,
    },
    {
      name: "api",
      role: "Senior API Architect",
      focus: `Focus ONLY on: API design philosophy, all endpoints with HTTP method, path, request/response schemas, error handling patterns, pagination, versioning strategy, rate limiting, API authentication flow, webhook design if applicable, and OpenAPI/SDK considerations. Include example request/response payloads.`,
    },
  ];

  const basePrompt = imageBase64
    ? `Analyze the provided image (which shows a project concept, mockup, or diagram) and the following context: ${userMessage}`
    : userMessage;

  const agentResults = await Promise.all(
    agents.map(async (agent) => {
      const system = `You are a ${agent.role} contributing one section to a comprehensive ${specType.replace(/_/g, " ")} document.
${agent.focus}
Format your output in clean, professional markdown starting with ## ${agent.name.charAt(0).toUpperCase() + agent.name.slice(1)} Analysis as the top-level heading.
Do not repeat information other specialists would cover. Be concise but complete.`;

      try {
        let text = "";
        for await (const chunk of streamCompletion({
          model,
          system,
          userMessage: `${basePrompt}\n\nGenerate your specialist section now.`,
          maxTokens: 4096,
          imageBase64,
          imageMediaType: imageMediaType as any,
        })) {
          text += chunk;
          onProgress?.(agent.name, chunk);
        }
        return { agent: agent.name, text };
      } catch {
        return { agent: agent.name, text: "" };
      }
    })
  );

  // Coordinator merge pass
  const sections = agentResults.map(r => r.text).filter(Boolean).join("\n\n---\n\n");
  const coordinatorSystem = `You are a technical writing coordinator. You have received ${agentResults.length} specialist sections for a ${specType.replace(/_/g, " ")} document.
Your job is to merge them into one cohesive, professional document:
1. Add a proper document title and Executive Summary at the top
2. Reorder sections logically (Overview → Architecture → Database → API → Security → Deployment)
3. Remove any redundancy between sections
4. Add smooth transitions between sections
5. Ensure consistent terminology throughout
6. Add a final "Decision Log" section summarizing key architectural choices and why alternatives were rejected
Return ONLY the final merged markdown document. No meta-commentary.`;

  let merged = "";
  for await (const chunk of streamCompletion({
    model,
    system: coordinatorSystem,
    userMessage: `Merge and refine these specialist sections into one coherent document:\n\n${sections}`,
    maxTokens: 8192,
  })) {
    merged += chunk;
    onProgress?.("coordinator", chunk);
  }

  return merged;
}
