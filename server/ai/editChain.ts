import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { pressChatModel } from "./core";
import { attachTracing } from "./instrumentation";

/**
 * Edit chain: applies user instruction to a press release while preserving structure.
 * Future extension: return structured diff (added/removed segments) or JSON with sections.
 */
const template = `You are an expert press release editor.
Apply the user's instruction to improve the press release below.
Rules:
- Maintain professional press release style.
- Do not invent new facts.
- Preserve existing structure, unless instruction explicitly requests restructuring.
- Return ONLY the updated full press release content.

User instruction:
{instruction}

=== ORIGINAL START ===
{original}
=== ORIGINAL END ===`;

const prompt = new PromptTemplate({
  template,
  inputVariables: ["instruction", "original"],
});

const parser = new StringOutputParser();
const chain = attachTracing(prompt.pipe(pressChatModel).pipe(parser));

export async function editPressRelease(args: { instruction: string; original: string }): Promise<string> {
  return chain.invoke(args);
}
