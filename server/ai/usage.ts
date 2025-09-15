// Usage logging helper
// Оценка токенов: упрощённая (по кол-ву символов / 4) до внедрения реального счетчика модели

import { storage } from '../storage.js';
import crypto from 'crypto';

export interface UsageEventInput {
  userId: number;
  eventType: 'ai_generate' | 'rag_search' | 'doc_ingest' | 'ad_generate' | 'image_generate';
  promptChars?: number;
  completionChars?: number;
  model?: string;
  latencyMs?: number;
  meta?: Record<string, any>;
  costUsd?: number; // можно вычислять позже из токенов и тарифов
}

export function estimateTokens(charCount: number | undefined): number | undefined {
  if (!charCount) return undefined;
  // простая эвристика: 1 токен ≈ 4 символа латиницы
  return Math.max(1, Math.ceil(charCount / 4));
}

export async function logUsage(event: UsageEventInput) {
  try {
    const tokensPrompt = estimateTokens(event.promptChars);
    const tokensCompletion = estimateTokens(event.completionChars);
    await storage.logUsageEvent(event.userId, {
      eventType: event.eventType,
      tokensPrompt,
      tokensCompletion,
      costUsd: event.costUsd,
      latencyMs: event.latencyMs,
      model: event.model,
      meta: event.meta || {},
    });
  } catch (e) {
    // не бросаем чтобы не ломать основной флоу
    console.warn('Usage logging failed', e);
  }
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateApiKeyRaw(): string {
  return 'rk_' + crypto.randomBytes(32).toString('base64url');
}
