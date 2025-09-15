/**
 * Text splitter config placeholder.
 * Later: implement recursive character splitter with tokens limit aware strategy.
 */
export interface ChunkedDoc {
  id: string;
  parentId: string;
  content: string;
  index: number;
}

export function simpleSplit(parentId: string, text: string, maxLen = 800): ChunkedDoc[] {
  const parts: ChunkedDoc[] = [];
  let i = 0;
  for (let offset = 0; offset < text.length; offset += maxLen) {
    parts.push({ id: `${parentId}::${i}`, parentId, content: text.slice(offset, offset + maxLen), index: i });
    i++;
  }
  return parts;
}
