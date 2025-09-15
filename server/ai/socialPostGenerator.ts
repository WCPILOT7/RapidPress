import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { pressChatModel } from "./core";
import { attachTracing } from "./instrumentation";

/**
 * Generate social network posts (LinkedIn, Twitter/X, Facebook) from press release text.
 * Strong guarantees: JSON shape validated by zod via JsonOutputParser.
 */

const SocialSchema = z.object({
  linkedin: z.string().describe("Профессиональный пост (tone: authoritative, value-driven)."),
  twitter: z.string().max(280).describe("Короткий пост до 280 символов."),
  facebook: z.string().describe("Более дружелюбный пост для широкой аудитории."),
});
export type SocialPosts = z.infer<typeof SocialSchema>;

const parser = new JsonOutputParser<{ linkedin: string; twitter: string; facebook: string }>({ zodSchema: SocialSchema });

const prompt = new PromptTemplate({
  template: `На основе следующего пресс-релиза создай посты для соцсетей.

=== ПРЕСС-РЕЛИЗ ===
{press_release}
=== КОНЕЦ ===

Требования:
- НЕ добавляй лишних пояснений
- Учитывай ограничения платформ
- Используй разнообразие лексики, не повторяй дословно заголовок

{format_instructions}
`,
  inputVariables: ["press_release"],
  partialVariables: { format_instructions: parser.getFormatInstructions() },
});

const chain = attachTracing(prompt.pipe(pressChatModel).pipe(parser));

export async function generateSocialPosts(press_release: string): Promise<SocialPosts> {
  return chain.invoke({ press_release });
}
