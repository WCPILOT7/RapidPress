// @ts-nocheck
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { supabaseAuth, attachApiKeyUser, attachUser } from './lib/auth.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerPressReleaseRoutes } from './routes/pressReleases.js';
import { registerAdvertisementRoutes } from './routes/advertisements.js';
import { registerContactRoutes } from './routes/contacts.js';
import { registerRagRoutes } from './routes/rag.js';
import { registerApiKeyRoutes } from './routes/apiKeys.js';
import { registerUsageRoutes } from './routes/usage.js';
const FREE_PLAN_MONTHLY_TOKENS = parseInt(process.env.FREE_PLAN_MONTHLY_TOKENS || '200000', 10); // ~200k tokens default
import bcrypt from "bcryptjs";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";

// (session typing moved to lib/auth if needed)

// Session configuration
const PgSession = ConnectPgSimple(session);


// Auth helpers moved to lib/auth.ts


export async function registerRoutes(app: Express): Promise<Server> {
  const sessionsDisabled = process.env.DISABLE_SESSIONS === '1';
  const limitsMode = process.env.DISABLE_LIMITS;
  if (process.env.NODE_ENV === 'production' && limitsMode && limitsMode !== '0') {
    console.warn(`[WARN] Production старт с ослабленными лимитами: DISABLE_LIMITS=${limitsMode}. Рекомендуется выключить для продакшена.`);
  }
  if (limitsMode === '1') {
    console.log('[INFO] Лимиты полностью отключены (bypass mode).');
  } else if (limitsMode === 'soft') {
    console.log('[INFO] Лимиты в soft режиме: превышения не блокируются, но помечаются заголовком X-RateLimit-SoftExceeded=1.');
  }

  if (!sessionsDisabled) {
    // Setup session middleware (legacy path)
    app.use(session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'session',
      }),
      secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
      resave: false,
      saveUninitialized: true,
      rolling: true,
      name: 'connect.sid',
      cookie: {
        secure: false,
        httpOnly: false,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: false,
        path: '/',
      },
    }));
  }

  // Auth stacking: Supabase JWT -> (optional session) -> API key
  app.use(supabaseAuth);
  if (!sessionsDisabled) {
    app.use(attachUser);
  }
  app.use(attachApiKeyUser);

  // Register modular endpoints
  registerAuthRoutes(app);
  registerPressReleaseRoutes(app);
  registerAdvertisementRoutes(app);
  registerContactRoutes(app);
  registerRagRoutes(app);
  registerApiKeyRoutes(app);
  registerUsageRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
