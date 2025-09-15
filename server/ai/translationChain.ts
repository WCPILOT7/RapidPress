import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { pressChatModel } from "./core";
import { attachTracing } from "./instrumentation";

/**
 * Translation chain: preserves formatting and avoids hallucinating new facts.
 */
const template = `You are a professional translator specializing in business and press releases.
Translate the following press release into {target_language}.
Rules:
- Preserve meaning, tone and professional structure.
- Do NOT translate company names, product names, emails, phone numbers.
- Keep paragraph breaks.
- Do NOT add commentary.

=== SOURCE START ===
{source}
=== SOURCE END ===

Return only the translated press release content.`;

const prompt = new PromptTemplate({
  template,
  inputVariables: ["source", "target_language"],
});

const parser = new StringOutputParser();
const chain = attachTracing(prompt.pipe(pressChatModel).pipe(parser));

export async function translatePressRelease(args: { source: string; target_language: string }): Promise<string> {
  return chain.invoke(args);
}
