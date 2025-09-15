// Simple in-memory rate limiter (per userId or API key hash surrogate)
// NOTE: This is a best-effort dev implementation; for production use Redis or a distributed store.

declare const process: { env: Record<string,string|undefined> };

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets: Record<string, Bucket> = {};

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 min default
const MAX_CALLS = parseInt(process.env.RATE_LIMIT_MAX_CALLS || '60', 10); // 60 req / window

// Metrics (in-memory)
const metrics = {
  bypassRequests: 0,
  softModeRequests: 0,
  enforcedRequests: 0,
  softExceeded: 0,
  hardBlocked: 0,
};

export function rateLimit(identifierResolver?: (req: any) => string | undefined) {
  return function(req: any, res: any, next: any) {
    try {
      const modeEnv = process.env.DISABLE_LIMITS; // '1' (full bypass) | 'soft' | undefined/0
      if (modeEnv === '1') {
        metrics.bypassRequests++;
        res.setHeader('X-Limits-Mode', 'bypass');
        res.setHeader('X-Limits-Bypass', '1');
        return next(); // global bypass
      } else if (modeEnv === 'soft') {
        metrics.softModeRequests++;
        res.setHeader('X-Limits-Mode', 'soft');
      } else {
        metrics.enforcedRequests++;
        res.setHeader('X-Limits-Mode', 'enforced');
      }
      const id = identifierResolver?.(req) || (req.user ? `u:${req.user.id}` : undefined);
      if (!id) return next(); // unauthenticated will be blocked later by requireAuth
      const now = Date.now();
      let bucket = buckets[id];
      if (!bucket || bucket.resetAt < now) {
        bucket = { count: 0, resetAt: now + WINDOW_MS };
        buckets[id] = bucket;
      }
      bucket.count += 1;
      if (bucket.count > MAX_CALLS) {
        const retryMs = bucket.resetAt - now;
        if (modeEnv === 'soft') {
          // Soft mode: не блокируем, но помечаем заголовком
          res.setHeader('X-RateLimit-SoftExceeded', '1');
          metrics.softExceeded++;
        } else {
          res.setHeader('Retry-After', Math.ceil(retryMs / 1000));
          metrics.hardBlocked++;
          return res.status(429).json({ error: 'Rate limit exceeded', resetInMs: retryMs });
        }
      }
      res.setHeader('X-RateLimit-Limit', MAX_CALLS.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_CALLS - bucket.count).toString());
      res.setHeader('X-RateLimit-Reset', bucket.resetAt.toString());
      next();
    } catch (e) {
      // fail open
      next();
    }
  };
}

export function getRateLimitConfig() {
  return { windowMs: WINDOW_MS, maxCalls: MAX_CALLS };
}

export function getRateLimitMetrics() {
  return { ...metrics };
}
