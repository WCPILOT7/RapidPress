import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { z } from "zod";

/**
 * Central place to configure AI models and embeddings.
 * Future: add model registry, fallback strategies, tracing hooks.
 */

// Chat model (configurable via env)
export const pressChatModel = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL || "gpt-4o",
  temperature: 0.4,
});

// Embeddings (reserved for future RAG / semantic search use cases)
export const embeddings = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDINGS_MODEL || "text-embedding-3-small",
});

// Utility: ensure required env variables exist
const required = ["OPENAI_API_KEY"] as const;
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn("[AI Core] Missing environment variables:", missing.join(", "));
}

export const jsonError = (err: unknown) => {
  if (err instanceof Error) return { error: err.name, message: err.message };
  return { error: "UnknownError", message: String(err) };
};

export const GenerationContextSchema = z.object({
  brand_tone: z.string().optional().default("Neutral, professional"),
  company_name: z.string(),
  company_boilerplate: z.string().optional().default(""),
  main_story: z.string(),
  quote: z.string().optional().default(""),
});
export type GenerationContext = z.infer<typeof GenerationContextSchema>;
