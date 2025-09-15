import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { pressChatModel } from "./core";
import { attachTracing } from "./instrumentation";

/**
 * Ad generator chain: supports google_ads & facebook initial variants.
 * Future: extend with platform-specific constraints & scoring.
 */

export const AdSchema = z.object({
  platform: z.enum(["google_ads", "facebook"]),
  headline: z.string().min(5).max(60).describe("Primary ad headline"),
  primary_text: z.string().min(20).max(300).describe("Main ad copy / primary text"),
  description: z.string().min(10).max(160).optional().default(""),
  cta: z.string().min(2).max(25),
  variants: z.array(z.object({
    headline: z.string().min(5).max(60),
    primary_text: z.string().min(20).max(300),
  })).min(1).max(3).describe("Alternative variants for testing"),
});
export type AdStructured = z.infer<typeof AdSchema>;

const parser = new JsonOutputParser<AdStructured>({ zodSchema: AdSchema });

const template = `You are a performance marketing copywriter.
Create an advertisement JSON for platform: {platform} based on the press release content.
Rules:
- Do NOT invent facts.
- Keep tone persuasive but professional.
- Provide 1-3 alternative variants (variants array) targeting slightly different angles.
- CTA must be a short action phrase (e.g., "Learn More", "Get Started", "Request Demo").
- For google_ads keep headline <= 60 chars; for facebook remain concise.

Press Release:
{press_release}

{format_instructions}`;

const prompt = new PromptTemplate({
  template,
  inputVariables: ["platform", "press_release"],
  partialVariables: { format_instructions: parser.getFormatInstructions() },
});

const chain = attachTracing(prompt.pipe(pressChatModel).pipe(parser));

export async function generateAd(args: { platform: "google_ads" | "facebook"; press_release: string }): Promise<AdStructured> {
  return chain.invoke(args);
}
