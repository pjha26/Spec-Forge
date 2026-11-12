import { getOpenAI } from "@workspace/integrations-openai-ai-server";

export type SupportedModel = "gpt-4o-mini";

export function isValidModel(model: unknown): model is SupportedModel {
  return model === "gpt-4o-mini";
}

interface CompletionOpts {
  model: SupportedModel;
  system: string;
  userMessage: string;
  maxTokens?: number;
  imageBase64?: string;
  imageMediaType?: string;
}

function request({ model, system, userMessage, maxTokens = 8192, imageBase64, imageMediaType }: CompletionOpts) {
  const content = imageBase64 ? [
    { type: "text" as const, text: userMessage },
    { type: "image_url" as const, image_url: { url: "data:" + (imageMediaType ?? "image/jpeg") + ";base64," + imageBase64 } },
  ] : userMessage;
  return {
    model,
    max_completion_tokens: maxTokens,
    messages: [{ role: "system" as const, content: system }, { role: "user" as const, content }],
  };
}

export async function generateCompletion(opts: CompletionOpts) {
  const result = await getOpenAI().chat.completions.create(request(opts));
  const text = result.choices[0]?.message?.content;
  if (!text?.trim()) throw new Error("The model returned an empty response");
  return text;
}

export async function* streamCompletion(opts: CompletionOpts) {
  const stream = await getOpenAI().chat.completions.create({ ...request(opts), stream: true });
  let hasText = false;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) { hasText = true; yield delta; }
  }
  if (!hasText) throw new Error("The model returned an empty response");
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
          imageMediaType,
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
  if (!sections) throw new Error("All generation agents failed");
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
