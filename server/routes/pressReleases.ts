import type { Express, Response } from 'express';
import { requireAuth } from '../lib/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { storage } from '../storage.js';
import { insertPressReleaseSchema } from '@shared/schema';
import { generateStructuredPressRelease } from '../ai/pressReleaseStructuredGenerator.js';
import { editPressRelease } from '../ai/editChain.js';
import { translatePressRelease } from '../ai/translationChain.js';
import { ensureProfileAndCheckQuota, estimateTokens } from '../lib/limits.js';
import { logUsage } from '../ai/usage.js';

interface AuthedReq extends Express.Request {
  user?: { id: number };
  body: any;
  query: any;
}

export function registerPressReleaseRoutes(app: Express) {
  // Generate
  app.post('/api/generate', rateLimit(), requireAuth as any, async (req: AuthedReq, res: Response) => {
    try {
      const validatedData = insertPressReleaseSchema.parse(req.body);
      const userId = req.user!.id;
      const mode = (req.query?.mode || req.body?.mode || 'normal') as string;
      const t0 = Date.now();
      const preTokens = estimateTokens(validatedData.copy.length) || 0;
      const quota = await ensureProfileAndCheckQuota(userId, preTokens);
      if (!quota.allowed) return res.status(429).json({ error: 'Monthly token quota exceeded', quota });

      let augmentedStory = validatedData.copy;
      let _ragContext: any = null;
      if (mode === 'rag') {
        try {
          const { retrieveContext } = await import('../ai/rag/retrieveContext.js');
          const query = [validatedData.company, validatedData.copy].filter(Boolean).join(' ');
          const ctxChunks = await retrieveContext(userId, query, { limit: 6, maxChars: 6000 });
          if (ctxChunks.length) {
            const contextBlock = ctxChunks.map((c: any, i: number) => `[[CHUNK ${i+1} source=${c.source} score=${c.score ?? 'n/a'}]]\n${c.content}`).join('\n\n');
            augmentedStory = `Контекст (не выдумывай ничего вне его, если факт отсутствует - пропусти):\n---\n${contextBlock}\n---\n\nОсновная задача:\n${validatedData.copy}`;
            _ragContext = { used: true, chunks: ctxChunks.map((c: any) => ({ id: c.id, source: c.source, score: c.score })) };
          } else {
            _ragContext = { used: false, reason: 'no_chunks' };
          }
        } catch (e: any) {
          _ragContext = { used: false, error: e?.message || 'retrieve_failed' };
        }
      }

      const structured = await generateStructuredPressRelease({
        company_name: validatedData.company,
        main_story: augmentedStory,
        brand_tone: validatedData.brandTone,
        company_boilerplate: validatedData.competitors,
        quote: validatedData.quote,
      });

      const assembledRelease = [
        structured.headline,
        structured.subheadline ? structured.subheadline + "\n" : '',
        structured.body,
        structured.quote ? `\nQuote:\n${structured.quote}` : '',
        structured.boilerplate ? `\nBoilerplate:\n${structured.boilerplate}` : '',
      ].filter(Boolean).join("\n\n");

      const pressRelease = await storage.createPressRelease(userId, {
        ...validatedData,
        headline: structured.headline,
        release: assembledRelease,
      });
      const latencyMs = Date.now() - t0;
      logUsage({
        userId,
        eventType: 'ai_generate',
        promptChars: augmentedStory.length,
        completionChars: assembledRelease.length,
        latencyMs,
        model: 'structured_press_release_chain',
        meta: { rag: mode === 'rag', chunks: _ragContext?.chunks?.length || 0 }
      });
      const totalTokens = (estimateTokens(augmentedStory.length) || 0) + (estimateTokens(assembledRelease.length) || 0);
      storage.incrementUserTokens(userId, totalTokens).catch(()=>{});
      res.json({ ...pressRelease, _structured: structured, _rag: _ragContext, mode, _usage: { latencyMs } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List
  app.get('/api/releases', requireAuth as any, async (req: AuthedReq, res: Response) => {
    try {
      const releases = await storage.getPressReleases(req.user!.id);
      res.json(releases);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get by id
  app.get('/api/releases/:id', requireAuth as any, async (req: AuthedReq, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const release = await storage.getPressReleaseById(id, req.user!.id);
      if (!release) return res.status(404).json({ error: 'Press release not found' });
      res.json(release);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update
  app.put('/api/releases/:id', requireAuth as any, async (req: AuthedReq, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { release } = req.body;
      const existing = await storage.getPressReleaseById(id, req.user!.id);
      if (!existing) return res.status(404).json({ error: 'Press release not found' });
      const updated = await storage.updatePressRelease(id, req.user!.id, { release });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit
  app.post('/api/releases/:id/edit', requireAuth as any, async (req: AuthedReq, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { instruction, currentContent } = req.body;
      if (!instruction || !currentContent) return res.status(400).json({ error: 'instruction and currentContent are required' });
      const existing = await storage.getPressReleaseById(id, req.user!.id);
      if (!existing) return res.status(404).json({ error: 'Press release not found' });
      const edited = await editPressRelease({ instruction, original: currentContent });
      res.json({ release: edited });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Translate
  app.post('/api/releases/:id/translate', requireAuth as any, async (req: AuthedReq, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { language } = req.body;
      if (!language) return res.status(400).json({ error: 'language is required' });
      const existing = await storage.getPressReleaseById(id, req.user!.id);
      if (!existing) return res.status(404).json({ error: 'Press release not found' });
      const translatedBody = await translatePressRelease({ source: existing.release, target_language: language });
      const translatedHeadline = await translatePressRelease({ source: existing.headline, target_language: language });
      const { id: _skip, createdAt: _skip2, ...releaseData } = existing as any;
      const translated = await storage.createPressRelease(req.user!.id, {
        ...releaseData,
        headline: translatedHeadline,
        release: translatedBody,
        language,
        originalId: existing.originalId || existing.id,
      });
      res.json(translated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete
  app.delete('/api/releases/:id', requireAuth as any, async (req: AuthedReq, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePressRelease(id, req.user!.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
