import { z } from 'zod';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { pressChatModel } from './core';
import { attachTracing } from './instrumentation';

/**
 * Specialized headline generator focusing on brevity, clarity and media style.
 */

export const HeadlineSchema = z.object({
  headline: z.string().min(10).max(120),
  reasoning: z.string().optional().default(''),
  quality: z.object({
    length_ok: z.boolean(),
    style_ok: z.boolean(),
    avoids_hype: z.boolean(),
  })
});
export type HeadlineResult = z.infer<typeof HeadlineSchema>;

const parser = new JsonOutputParser<HeadlineResult>({ zodSchema: HeadlineSchema });

const template = `Ты — опытный редактор деловых новостей.
На основе контекста сгенерируй лаконичный headline (<=120 символов), избегая маркетингового хайпа.

Контекст:
{context}

Требования:
- Не используй восклицательные знаки.
- Избегай субъективных эпитетов ("инновационный", "революционный") если они не подтверждены.
- Стиль: нейтральный, новостной.

{format_instructions}`;

const prompt = new PromptTemplate({
  template,
  inputVariables: ['context'],
  partialVariables: { format_instructions: parser.getFormatInstructions() }
});

const chain = attachTracing(prompt.pipe(pressChatModel).pipe(parser));

export async function generateHeadline(context: string): Promise<HeadlineResult> {
  return chain.invoke({ context });
}
