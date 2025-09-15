import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { pressChatModel, GenerationContextSchema, GenerationContext } from "./core";
import { attachTracing } from "./instrumentation";

/**
 * Chain: PromptTemplate -> ChatOpenAI -> StringOutputParser
 * Responsibility: generate full press release text (body only or full structured copy in natural text)
 */

const template = `Ты — профессиональный PR-менеджер.
Напиши пресс-релиз в стиле Associated Press.

Компания: {company_name}
Основная новость: {main_story}
Тон бренда: {brand_tone}
Boilerplate компании: {company_boilerplate}
Цитата спикера: {quote}

Требования:
- НЕ выдумывай фактов
- Сохраняй нейтральную профессиональную лексику
- Структура: Headline, Subheadline, Body, Quote, Boilerplate, Contact (оставь место для контактов если не дано)

Верни только текст пресс-релиза без дополнительных комментариев.`;

const prompt = PromptTemplate.fromTemplate(template);
const parser = new StringOutputParser();

const chain = attachTracing(prompt.pipe(pressChatModel).pipe(parser));

export async function generatePressRelease(input: GenerationContext) {
  const data = GenerationContextSchema.parse(input);
  return chain.invoke(data);
}
