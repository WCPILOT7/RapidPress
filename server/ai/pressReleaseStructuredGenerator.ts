import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { pressChatModel } from "./core";
import { attachTracing } from "./instrumentation";

/**
 * Structured press release generator.
 * Returns deterministic JSON shape for downstream usage & UI rendering.
 */

export const PressReleaseSchema = z.object({
  headline: z.string().min(10).max(160),
  subheadline: z.string().min(10).max(220).optional().default(""),
  body: z.string().min(200),
  quote: z.string().optional().default(""),
  boilerplate: z.string().optional().default(""),
  contact: z.object({
    name: z.string().optional().default(""),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
  }).optional().default({}),
});
export type StructuredPressRelease = z.infer<typeof PressReleaseSchema>;

const parser = new JsonOutputParser<StructuredPressRelease>({ zodSchema: PressReleaseSchema });

const template = `Ты — профессиональный PR-редактор. На основе вводных данных сгенерируй структуру пресс-релиза в JSON.

Ввод:
Компания: {company_name}
Основная новость: {main_story}
Тон бренда: {brand_tone}
Boilerplate (если пусто — не придумывай): {company_boilerplate}
Цитата спикера (если пусто — не придумывай): {quote}

Требования:
- НЕ выдумывай данных
- headline до 160 символов, без кавычек
- subheadline раскрывает headline (если невозможен — верни пустую строку)
- body: структурированный текст (абзацы) без markdown
- quote если отсутствует входной — верни пустую строку
- boilerplate: только если был указан
- contact оставь пустые поля (не выдумывай лица и email)

{format_instructions}`;

const prompt = new PromptTemplate({
  template,
  inputVariables: ["company_name", "main_story", "brand_tone", "company_boilerplate", "quote"],
  partialVariables: { format_instructions: parser.getFormatInstructions() },
});
// Internal mutable chain reference to allow test injection
let chain = attachTracing(prompt.pipe(pressChatModel).pipe(parser));

// Test hook: replace internal chain (e.g., with a fake runnable that has invoke())
// Not part of public API in production usage.
export function __setTestChain(testChain: { invoke: (input: any) => Promise<any> }) {
  chain = testChain as any;
}

export async function generateStructuredPressRelease(args: {
  company_name: string;
  main_story: string;
  brand_tone?: string;
  company_boilerplate?: string;
  quote?: string;
}): Promise<StructuredPressRelease> {
  return chain.invoke({
    company_name: args.company_name,
    main_story: args.main_story,
    brand_tone: args.brand_tone || "Neutral professional",
    company_boilerplate: args.company_boilerplate || "",
    quote: args.quote || "",
  });
}
