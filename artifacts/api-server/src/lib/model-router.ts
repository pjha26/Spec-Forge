import OpenAI from "openai";
import type { RequestHandler } from "express";

const modelName = process.env.OLLAMA_MODEL?.trim();
if (modelName && /(?:[:-]cloud|@)/i.test(modelName)) {
  throw new Error("OLLAMA_MODEL must be an installed local model");
}
export const localAIEnabled = Boolean(modelName);
export const localVisionEnabled = localAIEnabled && process.env.OLLAMA_VISION === "true";
let client: OpenAI | undefined;

export function getLocalAI() {
  if (!modelName) throw new Error("Configure OLLAMA_MODEL to use local AI");
  client ??= new OpenAI({
    baseURL: "http://127.0.0.1:11434/v1",
    apiKey: "ollama",
    timeout: 120_000,
    maxRetries: 0,
    fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
  });
  return { client, model: modelName };
}

export const requireLocalAI: RequestHandler = (_req, res, next) => {
  if (!localAIEnabled) {
    res.status(503).json({ error: "This action requires a local Ollama model" });
    return;
  }
  next();
};

interface CompletionOpts {
  system: string;
  userMessage: string;
  maxTokens?: number;
  imageBase64?: string;
  imageMediaType?: string;
}

function request(model: string, { system, userMessage, maxTokens = 8192, imageBase64, imageMediaType }: CompletionOpts) {
  const content = imageBase64 ? [
    { type: "text" as const, text: userMessage },
    { type: "image_url" as const, image_url: { url: "data:" + (imageMediaType ?? "image/jpeg") + ";base64," + imageBase64 } },
  ] : userMessage;
  return {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "system" as const, content: system }, { role: "user" as const, content }],
  };
}

export async function generateCompletion(opts: CompletionOpts) {
  const { client, model } = getLocalAI();
  const result = await client.chat.completions.create(request(model, opts));
  const text = result.choices[0]?.message?.content;
  if (!text?.trim()) throw new Error("The model returned an empty response");
  return text;
}

export async function* streamCompletion(opts: CompletionOpts) {
  const { client, model } = getLocalAI();
  const stream = await client.chat.completions.create({ ...request(model, opts), stream: true });
  let hasText = false;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) { hasText = true; yield delta; }
  }
  if (!hasText) throw new Error("The model returned an empty response");
}
