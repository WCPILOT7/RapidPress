import { semanticSearch } from './semanticSearch';
import { semanticSearchPg } from './semanticSearchPg';
import { embedTexts } from './embeddings';
import { storage } from '../../storage';

declare const process: { env: Record<string,string|undefined> };

interface RetrieveOptions {
  limit?: number;
  strategy?: 'auto' | 'semantic-only';
  minScore?: number;
  maxChars?: number; // truncate overall
}

/**
 * Возвращает top-k чанков для обогащения промпта.
 * Приоритет: semantic (pgvector/json) -> fallback keyword.
 */
export async function retrieveContext(userId: number, query: string, opts: RetrieveOptions = {}) {
  const { limit = 6, strategy = 'auto', minScore = 0, maxChars = 8000 } = opts;
  const vectorMode = (process.env.RAG_VECTOR_STRATEGY || 'json').toLowerCase();
  let chunks: any[] = [];

  // 1. Пытаемся semantic (pgvector)
  if (vectorMode === 'pgvector') {
    try {
      const sem = await semanticSearchPg(userId, query, { limit });
      chunks = sem.filter(c => c.score == null || c.score >= minScore);
    } catch { /* ignore */ }
  }

  // 2. Если пусто и json разрешён
  if (!chunks.length && strategy !== 'semantic-only') {
    const semJson = await semanticSearch(userId, query, { limit, minScore });
    chunks = semJson;
  }

  // 3. Fallback: keyword
  if (!chunks.length) {
    const keyword = await storage.searchAIDocuments(userId, query, limit);
    chunks = keyword.map(d => ({ ...d, score: null }));
  }

  // 4. Обрезаем суммарный размер
  let total = 0;
  const final: { content: string; id: number; score: number | null; source: string; title?: string }[] = [];
  for (const c of chunks) {
    const text = c.content || '';
    if (total + text.length > maxChars) break;
    total += text.length;
    final.push({ content: text, id: c.id, score: c.score ?? null, source: c.source, title: c.title });
  }
  return final;
}
