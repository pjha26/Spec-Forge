/**
 * Unified model router — abstracts Claude, GPT, and Gemini behind a single
 * streaming interface so route handlers stay model-agnostic.
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

/** Generates a full (non-streaming) completion — used for background sync and analysis calls. */
export async function generateCompletion(opts: {
  model: SupportedModel;
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const { model, system, userMessage, maxTokens = 8192 } = opts;
  const meta = MODEL_META[model];

  if (meta.provider === "anthropic") {
    const msg = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content[0];
    return block.type === "text" ? block.text : "";
  }

  if (meta.provider === "openai") {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: userMessage },
      ],
    });
    return resp.choices[0]?.message?.content ?? "";
  }

  // Gemini
  const response = await gemini.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: `${system}\n\n${userMessage}` }] }],
    config: { maxOutputTokens: maxTokens },
  });
  return response.text ?? "";
}

/** Streams tokens via an async generator — yields string chunks. */
export async function* streamCompletion(opts: {
  model: SupportedModel;
  system: string;
  userMessage: string;
  maxTokens?: number;
}): AsyncGenerator<string> {
  const { model, system, userMessage, maxTokens = 8192 } = opts;
  const meta = MODEL_META[model];

  if (meta.provider === "anthropic") {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  if (meta.provider === "openai") {
    const stream = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: userMessage },
      ],
    });
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
