import { storage } from '../../storage';
import { embedTexts, cosineSimilarity } from './embeddings';
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="node" />

// минимальная декларация чтобы TS не ругался в изолированном контексте
declare const process: { env: Record<string, string | undefined> };

interface SemanticSearchOptions {
  limit?: number; // number of top results to return
  fetchLimit?: number; // how many docs to pull from DB before ranking
  minScore?: number; // optional threshold
}

export async function semanticSearch(userId: number, query: string, opts: SemanticSearchOptions = {}) {
  const strategy = (process.env.RAG_VECTOR_STRATEGY || 'json').toLowerCase();
  if (strategy === 'pgvector') {
    try {
      const { semanticSearchPg } = await import('./semanticSearchPg.js');
      return await semanticSearchPg(userId, query, { limit: opts.limit });
    } catch (e) {
      // fallback silently to json mode
    }
  }
  const { limit = 8, fetchLimit = 200, minScore } = opts;
  // Pull a slice of documents; later we will add better filtering (by source, parentId etc.)
  const docs = await storage.listAIDocuments(userId); // fetchLimit currently unused; could slice
  const limitedDocs = docs.slice(0, fetchLimit);
  if (!docs.length) return [];

  const queryVec = (await embedTexts([query]))[0];

  const scored = limitedDocs.map(d => {
    let score = -1;
    if (d.embedding) {
      try {
        const vec = JSON.parse(d.embedding) as number[];
        score = cosineSimilarity(queryVec, vec);
      } catch {
        score = -1;
      }
    }
    return { ...d, score };
  }).filter(r => r.score >= 0);

  scored.sort((a, b) => b.score - a.score);
  const sliced = scored.slice(0, limit);
  return minScore != null ? sliced.filter(s => s.score >= minScore) : sliced;
}
