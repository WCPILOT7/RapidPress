/**
 * Vector index adapter placeholder.
 * For now uses naive keyword scoring. Later: replace with pgvector similarity search.
 */

import type { ChunkedDoc } from './splitter';

interface IndexedChunk extends ChunkedDoc {
  // placeholder for embedding vector later
}

const index: IndexedChunk[] = [];

export function addChunks(chunks: ChunkedDoc[]) {
  index.push(...chunks);
}

export function clearIndex() {
  index.splice(0, index.length);
}

export function naiveSearch(query: string, k = 5): IndexedChunk[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = index.map(ch => {
    const text = ch.content.toLowerCase();
    let score = 0;
    for (const t of terms) if (text.includes(t)) score += 1;
    return { ch, score };
  });
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(s => s.ch);
}
