// @ts-nocheck
import type { Express, Response } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../lib/auth.js';
import { storage } from '../storage.js';
import { ensureProfileAndCheckQuota } from '../lib/limits.js';
import { estimateTokens, logUsage } from '../ai/usage.js';

interface AuthenticatedRequest extends Request { user?: { id: number }; }

export function registerRagRoutes(app: Express) {
  // Инжест документа (сырой текст)
  app.post('/api/rag/documents', rateLimit(), requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { source, title, content, parentId, metadata } = (req as any).body || {};
      if (!source || !content) return res.status(400).json({ error: 'source and content required' });
      const { ingestRawDocument } = await import('../ai/rag/ingest.js');
      const t0 = Date.now();
      const quota = await ensureProfileAndCheckQuota(userId, estimateTokens(content.length) || 0);
      if (!quota.allowed) return res.status(429).json({ error: 'Monthly token quota exceeded', quota });
      const inserted = await ingestRawDocument(userId, { source, title, content, parentId, metadata });
      const latencyMs = Date.now() - t0;
      logUsage({ userId, eventType: 'doc_ingest', promptChars: content.length, completionChars: 0, latencyMs, model: 'ingest_pipeline', meta: { source, chunks: inserted.length } });
      storage.incrementUserTokens(userId, estimateTokens(content.length) || 0).catch(()=>{});
      res.json({ inserted, _usage: { latencyMs } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Поиск (keyword или semantic=JSON embeddings fallback)
  app.get('/api/rag/search', rateLimit(), requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id; const { q, mode } = (req as any).query || {};
      if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q query param required' });
      const t0 = Date.now();
      if (mode === 'semantic') {
        const { semanticSearch } = await import('../ai/rag/semanticSearch.js');
        const semanticResults = await semanticSearch(userId, q, { limit: 10 });
        const latencyMs = Date.now() - t0;
        logUsage({ userId, eventType: 'rag_search', promptChars: q.length, completionChars: 0, latencyMs, model: 'semantic_json', meta: { results: semanticResults.length } });
        return res.json({ mode: 'semantic', results: semanticResults, _usage: { latencyMs } });
      }
      const results = await storage.searchAIDocuments(userId, q, 10);
      const latencyMs = Date.now() - t0;
      logUsage({ userId, eventType: 'rag_search', promptChars: q.length, completionChars: 0, latencyMs, model: 'keyword', meta: { results: results.length } });
      res.json({ mode: 'keyword', results, _usage: { latencyMs } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
