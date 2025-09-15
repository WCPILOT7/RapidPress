// Authentication & authorization helpers extracted from routes.ts
// Centralizes: requireAuth, supabaseAuth, attachApiKeyUser, attachUser (session)
// NOTE: Keep types lightweight to avoid circular deps.

import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage.js';
import { supabase } from '../supabase.js';
import { hashApiKey } from '../ai/usage.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; name: string };
  session?: any;
}

export const apiKeyHeaderName = 'x-api-key';

// Require user (session, supabase or api key already attached)
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// Legacy session attach (optional via DISABLE_SESSIONS flag in routes.ts)
export async function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    if (req.session?.userId) {
      const user = await storage.getUserById(req.session.userId);
      if (user) {
        req.user = { id: user.id, email: user.email, name: user.name };
      }
    }
  } catch {
    // ignore
  }
  next();
}

// Supabase JWT auth — idempotent linking logic
export async function supabaseAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const auth = req.header('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return next();
    const token = auth.slice(7).trim();
    if (!token) return next();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return next();

    let local = await storage.getUserBySupabaseUserId(user.id);
    if (!local && user.email) {
      local = await storage.getUserByEmail(user.email);
    }
    if (!local) {
      local = await storage.createUser({
        email: user.email || `no-email-${user.id}@example.com`,
        name: (user.user_metadata as any)?.full_name || 'Supabase User',
        password: '!'
      });
    }
    if (!(local as any).supabaseUserId) {
      try {
        await storage.setSupabaseUserId(local.id, user.id);
        local = await storage.getUserById(local.id) || local;
      } catch {
        // ignore linking error
      }
    }
    req.user = { id: local.id, email: local.email, name: local.name };
  } catch {
    // silent
  }
  next();
}

// API Key attach (does not override existing user)
export async function attachApiKeyUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    if (req.user) return next();
    const key = req.header(apiKeyHeaderName);
    if (!key) return next();
    const hash = hashApiKey(key);
    const apiKey = await storage.getApiKeyByHash(hash);
    if (!apiKey) return next();
    const user = await storage.getUserById(apiKey.userId);
    if (!user) return next();
    req.user = { id: user.id, email: user.email, name: user.name };
    await storage.touchApiKeyUsage(apiKey.id);
  } catch {
    // ignore
  }
  next();
}
