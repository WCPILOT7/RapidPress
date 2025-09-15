import type { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { storage } from '../storage.js';
import { insertUserSchema, loginSchema } from '@shared/schema';
import { requireAuth } from '../lib/auth.js';

// Набор эндпоинтов /api/auth/*
export function registerAuthRoutes(app: Express) {
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(validated.email);
      if (existing) return res.status(409).json({ error: 'Email already registered' });
      const hashed = await bcrypt.hash(validated.password, 12);
      const user = await storage.createUser({ ...validated, password: hashed });
      // session (если активна)
      if ((req as any).session) {
        (req as any).session.userId = user.id;
        await new Promise(resolve => (req as any).session.save(() => resolve(null)));
      }
      const { password, ...safe } = user;
      res.json({ user: safe });
    } catch (e) {
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const validated = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(validated.email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const ok = await bcrypt.compare(validated.password, user.password);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      if ((req as any).session) {
        (req as any).session.userId = user.id;
        await new Promise(resolve => (req as any).session.save(() => resolve(null)));
      }
      const { password, ...safe } = user;
      res.json({ user: safe });
    } catch (e) {
      res.status(400).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    if ((req as any).session) {
      (req as any).session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
      });
    } else {
      res.json({ message: 'No session active' });
    }
  });

  app.get('/api/auth/me', requireAuth as any, (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user) return res.json({ user });
    res.status(401).json({ error: 'Not authenticated' });
  });
}
