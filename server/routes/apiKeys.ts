// @ts-nocheck
import type { Express, Response } from 'express';
import { requireAuth } from '../lib/auth.js';
import { storage } from '../storage.js';
import { generateApiKeyRaw, hashApiKey } from '../ai/usage.js';

interface AuthenticatedRequest extends Request { user?: { id: number } }

export function registerApiKeyRoutes(app: Express) {
  // Создать API ключ (сырой ключ возвращается один раз)
  app.post('/api/api-keys', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id; const { name } = req.body || {};
      const raw = generateApiKeyRaw();
      const hash = hashApiKey(raw);
      const row = await storage.createApiKey(userId, { name, rawKeyHash: hash } as any);
      res.json({ id: row.id, name: row.name, createdAt: row.createdAt, key: raw });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Список ключей (без показа raw)
  app.get('/api/api-keys', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try { const userId = req.user!.id; const keys = await storage.listApiKeys(userId); res.json(keys.map(k => ({ id: k.id, name: k.name, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, revoked: k.revoked }))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Отзыв ключа
  app.post('/api/api-keys/:id/revoke', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try { const userId = req.user!.id; const id = parseInt(req.params.id); await storage.revokeApiKey(userId, id); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
