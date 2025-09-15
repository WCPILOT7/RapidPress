import { users, pressReleases, contacts, advertisements, aiDocuments, apiKeys, usageEvents, ragQueries, embeddingCache, userProfiles, type User, type InsertUser, type PressRelease, type InsertPressRelease, type Contact, type InsertContact, type Advertisement, type InsertAdvertisement, type AIDocument, type InsertAIDocument, type ApiKey, type InsertApiKey, type UsageEvent, type InsertUsageEvent, type RagQuery, type InsertRagQuery, type EmbeddingCache, type InsertEmbeddingCache, type UserProfile, type InsertUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserBySupabaseUserId(supabaseUserId: string): Promise<User | undefined>;
  
  // Press Release methods
  createPressRelease(userId: number, pressRelease: InsertPressRelease & { headline: string; release: string }): Promise<PressRelease>;
  getPressReleases(userId: number): Promise<PressRelease[]>;
  getPressReleaseById(id: number, userId: number): Promise<PressRelease | undefined>;
  updatePressRelease(id: number, userId: number, updates: Partial<PressRelease>): Promise<PressRelease>;
  deletePressRelease(id: number, userId: number): Promise<void>;
  
  // Contact methods
  createContact(userId: number, contact: InsertContact): Promise<Contact>;
  createContacts(userId: number, contacts: InsertContact[]): Promise<Contact[]>;
  getContacts(userId: number): Promise<Contact[]>;
  deleteContact(id: number, userId: number): Promise<void>;
  
  // Advertisement methods
  createAdvertisement(userId: number, advertisement: InsertAdvertisement): Promise<Advertisement>;
  getAdvertisements(userId: number): Promise<Advertisement[]>;
  getAdvertisementsByPressReleaseId(pressReleaseId: number, userId: number): Promise<Advertisement[]>;
  getAdvertisementById(id: number, userId: number): Promise<Advertisement | undefined>;
  updateAdvertisement(id: number, userId: number, updates: Partial<Advertisement>): Promise<Advertisement>;
  deleteAdvertisement(id: number, userId: number): Promise<void>;

  // AI Documents (RAG)
  createAIDocuments(userId: number, docs: InsertAIDocument[]): Promise<AIDocument[]>;
  listAIDocuments(userId: number, filter?: { source?: string }): Promise<AIDocument[]>;
  searchAIDocuments(userId: number, query: string, limit?: number): Promise<AIDocument[]>;

  // API Keys
  createApiKey(userId: number, data: Omit<InsertApiKey, 'userId'> & { rawKeyHash: string }): Promise<ApiKey>;
  listApiKeys(userId: number): Promise<ApiKey[]>;
  revokeApiKey(userId: number, id: number): Promise<void>;
  touchApiKeyUsage(id: number): Promise<void>;
  getApiKeyByHash(hash: string): Promise<ApiKey | undefined>;

  // Usage Events
  logUsageEvent(userId: number, data: Omit<InsertUsageEvent, 'userId'> & { tokensPrompt?: number; tokensCompletion?: number }): Promise<UsageEvent>;

  // RAG Queries
  logRagQuery(userId: number, data: Omit<InsertRagQuery, 'userId'>): Promise<RagQuery>;

  // Embedding Cache
  getOrInsertEmbeddingCache(userId: number, inputHash: string, model: string, embedding: string): Promise<EmbeddingCache>;

  // Profiles
  ensureUserProfile(userId: number): Promise<UserProfile>;
  incrementUserTokens(userId: number, delta: number): Promise<void>;
  setSupabaseUserId(userId: number, supabaseUserId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserBySupabaseUserId(supabaseUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId));
    return user || undefined;
  }

  async setSupabaseUserId(id: number, supabaseUserId: string): Promise<void> {
    await db.update(users).set({ supabaseUserId }).where(eq(users.id, id));
  }

  // Press Release methods
  async createPressRelease(userId: number, data: InsertPressRelease & { headline: string; release: string }): Promise<PressRelease> {
    const [pressRelease] = await db
      .insert(pressReleases)
      .values({
        ...data,
        userId,
        quote: data.quote || null,
        competitors: data.competitors || null,
      })
      .returning();
    return pressRelease;
  }

  async getPressReleases(userId: number): Promise<PressRelease[]> {
    const results = await db
      .select()
      .from(pressReleases)
      .where(eq(pressReleases.userId, userId))
      .orderBy(pressReleases.createdAt);
    return results.reverse(); // Newest first
  }

  async getPressReleaseById(id: number, userId: number): Promise<PressRelease | undefined> {
    const [pressRelease] = await db
      .select()
      .from(pressReleases)
      .where(and(eq(pressReleases.id, id), eq(pressReleases.userId, userId)));
    return pressRelease || undefined;
  }

  async updatePressRelease(id: number, userId: number, updates: Partial<PressRelease>): Promise<PressRelease> {
    const [updatedRelease] = await db
      .update(pressReleases)
      .set(updates)
      .where(and(eq(pressReleases.id, id), eq(pressReleases.userId, userId)))
      .returning();
    
    if (!updatedRelease) {
      throw new Error('Press release not found');
    }
    
    return updatedRelease;
  }

  async deletePressRelease(id: number, userId: number): Promise<void> {
    await db
      .delete(pressReleases)
      .where(and(eq(pressReleases.id, id), eq(pressReleases.userId, userId)));
  }

  // Contact methods
  async createContact(userId: number, contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values({ ...contact, userId })
      .returning();
    return newContact;
  }

  async createContacts(userId: number, contactsData: InsertContact[]): Promise<Contact[]> {
    const contactsWithUserId = contactsData.map(contact => ({ ...contact, userId }));
    const results = await db
      .insert(contacts)
      .values(contactsWithUserId)
      .returning();
    return results;
  }

  async getContacts(userId: number): Promise<Contact[]> {
    const results = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(contacts.createdAt);
    return results.reverse(); // Newest first
  }

  async deleteContact(id: number, userId: number): Promise<void> {
    await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
  }

  // Advertisement methods
  async createAdvertisement(userId: number, advertisement: InsertAdvertisement): Promise<Advertisement> {
    const [newAdvertisement] = await db
      .insert(advertisements)
      .values({
        ...advertisement,
        userId,
        imagePrompt: advertisement.imagePrompt || null,
        imageUrl: advertisement.imageUrl || null,
      })
      .returning();
    return newAdvertisement;
  }

  async getAdvertisements(userId: number): Promise<Advertisement[]> {
    const results = await db
      .select()
      .from(advertisements)
      .where(eq(advertisements.userId, userId))
      .orderBy(advertisements.createdAt);
    return results.reverse(); // Newest first
  }

  async getAdvertisementsByPressReleaseId(pressReleaseId: number, userId: number): Promise<Advertisement[]> {
    const results = await db
      .select()
      .from(advertisements)
      .where(and(eq(advertisements.pressReleaseId, pressReleaseId), eq(advertisements.userId, userId)))
      .orderBy(advertisements.createdAt);
    return results.reverse(); // Newest first
  }

  async getAdvertisementById(id: number, userId: number): Promise<Advertisement | undefined> {
    const [advertisement] = await db
      .select()
      .from(advertisements)
      .where(and(eq(advertisements.id, id), eq(advertisements.userId, userId)));
    return advertisement || undefined;
  }

  async updateAdvertisement(id: number, userId: number, updates: Partial<Advertisement>): Promise<Advertisement> {
    const [updatedAdvertisement] = await db
      .update(advertisements)
      .set(updates)
      .where(and(eq(advertisements.id, id), eq(advertisements.userId, userId)))
      .returning();
    
    if (!updatedAdvertisement) {
      throw new Error('Advertisement not found');
    }
    
    return updatedAdvertisement;
  }

  async deleteAdvertisement(id: number, userId: number): Promise<void> {
    await db
      .delete(advertisements)
      .where(and(eq(advertisements.id, id), eq(advertisements.userId, userId)));
  }

  // AI Documents (RAG)
  async createAIDocuments(userId: number, docs: InsertAIDocument[]): Promise<AIDocument[]> {
    const values = docs.map(d => ({ ...d, userId, metadata: d.metadata || null, embedding: d.embedding || null }));
    const inserted = await db.insert(aiDocuments).values(values).returning();
    return inserted;
  }

  async listAIDocuments(userId: number, filter?: { source?: string }): Promise<AIDocument[]> {
    let q = db.select().from(aiDocuments).where(eq(aiDocuments.userId, userId));
    // drizzle query builder lacks dynamic chaining example here kept simple; refine if needed
    const rows: AIDocument[] = await q as unknown as AIDocument[];
    return rows
      .filter((r: AIDocument) => !filter?.source || r.source === filter.source)
      .sort((a: AIDocument, b: AIDocument) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async searchAIDocuments(userId: number, query: string, limit = 10): Promise<AIDocument[]> {
    const all = await this.listAIDocuments(userId);
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = all.map(doc => {
      const text = (doc.title || '') + ' ' + doc.content;
      const lc = text.toLowerCase();
      let score = 0;
      for (const t of terms) if (lc.includes(t)) score += 1;
      return { doc, score };
    });
    return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.doc);
  }

  // API Keys
  async createApiKey(userId: number, data: Omit<InsertApiKey, 'userId'> & { rawKeyHash: string }): Promise<ApiKey> {
    const [row] = await db.insert(apiKeys).values({
      userId,
      keyHash: data.rawKeyHash,
      name: data.name || null,
    }).returning();
    return row;
  }

  async listApiKeys(userId: number): Promise<ApiKey[]> {
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
    return rows;
  }

  async revokeApiKey(userId: number, id: number): Promise<void> {
    await db.update(apiKeys).set({ revoked: true }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
  }

  async touchApiKeyUsage(id: number): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async getApiKeyByHash(hash: string): Promise<ApiKey | undefined> {
    const rows = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.revoked, false)));
    return rows[0] || undefined;
  }

  // Usage Events
  async logUsageEvent(userId: number, data: Omit<InsertUsageEvent, 'userId'> & { tokensPrompt?: number; tokensCompletion?: number }): Promise<UsageEvent> {
    const [row] = await db.insert(usageEvents).values({
      userId,
      eventType: data.eventType,
      tokensPrompt: data.tokensPrompt || null,
      tokensCompletion: data.tokensCompletion || null,
      costUsd: data.costUsd || null,
      latencyMs: data.latencyMs || null,
      model: data.model || null,
      meta: data.meta ? JSON.stringify(data.meta) : null,
    }).returning();
    return row;
  }

  // RAG Queries
  async logRagQuery(userId: number, data: Omit<InsertRagQuery, 'userId'>): Promise<RagQuery> {
    const [row] = await db.insert(ragQueries).values({
      userId,
      query: data.query,
      strategy: data.strategy,
      resultsCount: data.resultsCount || 0,
      usedInGeneration: data.usedInGeneration || false,
      latencyMs: data.latencyMs || null,
    }).returning();
    return row;
  }

  // Embedding Cache
  async getOrInsertEmbeddingCache(userId: number, inputHash: string, model: string, embedding: string): Promise<EmbeddingCache> {
    const existing = await db.select().from(embeddingCache).where(and(eq(embeddingCache.userId, userId), eq(embeddingCache.inputHash, inputHash), eq(embeddingCache.model, model)));
    if (existing.length) return existing[0];
    const [row] = await db.insert(embeddingCache).values({ userId, inputHash, model, embedding }).returning();
    return row;
  }

  // Profiles
  async ensureUserProfile(userId: number): Promise<UserProfile> {
    const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    if (existing.length) return existing[0];
    const [row] = await db.insert(userProfiles).values({ userId }).returning();
    return row;
  }

  async incrementUserTokens(userId: number, delta: number): Promise<void> {
    // naive approach: fetch then update (race conditions acceptable for now). Later: single SQL update with returning.
    const profile = await this.ensureUserProfile(userId);
    const newValue = (profile.quotaMonthlyTokensUsed || 0) + delta;
    await db.update(userProfiles).set({ quotaMonthlyTokensUsed: newValue }).where(eq(userProfiles.userId, userId));
  }
}

export const storage = new DatabaseStorage();
