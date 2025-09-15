import { listDocuments } from './documents';
import { simpleSplit } from './splitter';
import { addChunks, naiveSearch } from './vectorIndex';

/**
 * Ensures documents are split & indexed (idempotent naive approach for MVP).
 */
let initialized = false;
export function buildNaiveIndex() {
  if (initialized) return;
  const all = listDocuments();
  for (const d of all) {
    const chunks = simpleSplit(d.id, d.content);
    addChunks(chunks);
  }
  initialized = true;
}

export interface RetrievedFragment {
  chunkId: string;
  parentId: string;
  snippet: string;
  position: number;
}

export function retrieve(query: string, k = 5): RetrievedFragment[] {
  buildNaiveIndex();
  const hits = naiveSearch(query, k);
  return hits.map(h => ({
    chunkId: h.id,
    parentId: h.parentId,
    snippet: h.content.slice(0, 400),
    position: h.index,
  }));
}
