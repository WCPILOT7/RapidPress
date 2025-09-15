// Centralized quota / limits helpers
import { storage } from '../storage.js';
import { estimateTokens } from '../ai/usage.js';

const FREE_PLAN_MONTHLY_TOKENS = parseInt(process.env.FREE_PLAN_MONTHLY_TOKENS || '200000', 10);

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  bypass?: boolean;
  soft?: boolean;
  softExceeded?: boolean;
  error?: string;
}

export async function ensureProfileAndCheckQuota(userId: number, estimatedTokens: number): Promise<QuotaResult> {
  try {
    if (process.env.DISABLE_LIMITS === '1') {
      return { allowed: true, used: 0, limit: FREE_PLAN_MONTHLY_TOKENS, bypass: true };
    }
    if (process.env.DISABLE_LIMITS === 'soft') {
      const profileSoft = await storage.ensureUserProfile(userId);
      const usedSoft = profileSoft.quotaMonthlyTokensUsed || 0;
      const willExceed = usedSoft + estimatedTokens > FREE_PLAN_MONTHLY_TOKENS;
      return { allowed: true, used: usedSoft, limit: FREE_PLAN_MONTHLY_TOKENS, soft: true, softExceeded: willExceed };
    }
    const profile = await storage.ensureUserProfile(userId);
    const used = profile.quotaMonthlyTokensUsed || 0;
    if (used + estimatedTokens > FREE_PLAN_MONTHLY_TOKENS) {
      return { allowed: false, used, limit: FREE_PLAN_MONTHLY_TOKENS };
    }
    return { allowed: true, used, limit: FREE_PLAN_MONTHLY_TOKENS };
  } catch (e) {
    return { allowed: true, used: 0, limit: FREE_PLAN_MONTHLY_TOKENS, error: 'profile_fetch_failed' };
  }
}

export { estimateTokens }; // re-export for convenience if modules want both
