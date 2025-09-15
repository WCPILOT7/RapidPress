// @ts-nocheck
import type { Express, Response } from 'express';
import { requireAuth } from '../lib/auth.js';
import { drainMetrics } from '../ai/instrumentation.js';
import { getRateLimitMetrics } from '../middleware/rateLimit.js';

interface AuthenticatedRequest extends Request { user?: { id: number }; }

const FREE_PLAN_MONTHLY_TOKENS = parseInt(process.env.FREE_PLAN_MONTHLY_TOKENS || '200000', 10);

export function registerUsageRoutes(app: Express) {
  // Внутренние AI метрики (dev only)
  app.get('/api/_internal/ai-metrics', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Disabled in production' });
    }
    res.json({ metrics: drainMetrics(), rateLimit: getRateLimitMetrics() });
  });

  // Сводка использования (простая агрегация)
  app.get('/api/usage/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { db } = await import('../db.js');
      const { usageEvents } = await import('@shared/schema');
      const sinceDay = new Date(Date.now() - 24*60*60*1000);
      const sinceMonth = new Date(Date.now() - 30*24*60*60*1000);
      const rows = await db.select().from(usageEvents).where(usageEvents.userId.eq ? usageEvents.userId.eq(userId) : undefined as any);
      const day = { prompt: 0, completion: 0, events: 0 };
      const month = { prompt: 0, completion: 0, events: 0 };
      for (const r of rows) {
        const created = (r as any).createdAt as Date;
        if (created >= sinceMonth) {
          month.prompt += r.tokensPrompt || 0; month.completion += r.tokensCompletion || 0; month.events += 1;
        }
        if (created >= sinceDay) {
          day.prompt += r.tokensPrompt || 0; day.completion += r.tokensCompletion || 0; day.events += 1;
        }
      }
      res.json({ day, month, planLimit: FREE_PLAN_MONTHLY_TOKENS });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
