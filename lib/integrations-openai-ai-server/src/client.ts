import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI credentials are missing");
  return client ??= new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_API_KEY ? undefined : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    timeout: 120_000,
    maxRetries: 1,
  });
}
