import { pgTable, text, serial, integer, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  supabaseUserId: text("supabase_user_id"), // nullable until linked
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pressReleases = pgTable("press_releases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  company: text("company").notNull(),
  headline: text("headline").notNull(),
  copy: text("copy").notNull(),
  contact: text("contact").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  date: text("date").notNull(),
  brandTone: text("brand_tone"),
  quote: text("quote"),
  competitors: text("competitors"),
  release: text("release").notNull(),
  language: text("language").default("English").notNull(),
  originalId: integer("original_id"), // Reference to original press release if this is a translation
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  publication: text("publication").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pressReleaseId: integer("press_release_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  platform: text("platform").notNull(), // "facebook", "twitter", "linkedin", "instagram", "google_ads"
  type: text("type").notNull(), // "social_media", "ad"
  imagePrompt: text("image_prompt"),
  imageUrl: text("image_url"),
  isCustomImage: boolean("is_custom_image").default(false), // true if user uploaded their own image
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Documents (RAG ingestion) — embeddings колонка пока текст (JSON или base64), позже заменим на vector в миграции.
export const aiDocuments = pgTable("ai_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  parentId: integer("parent_id"), // опциональная ссылка (например press_release id)
  source: text("source").notNull(), // company_profile | past_release | uploaded_file | note
  title: text("title"),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string
  embedding: text("embedding"), // временное хранилище
  // embedding_vector: отсутствует в типах drizzle (pgvector). Используем raw SQL миграцию.
  // Для удобства типизации можно добавить фиктивное поле через declaration merging при необходимости.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Дополнительные таблицы для Supabase миграции / аналитики / ключей ---

export const userProfiles = pgTable("user_profiles", {
  userId: integer("user_id").primaryKey(),
  displayName: text("display_name"),
  plan: text("plan").default("free"), // free | pro | enterprise
  quotaMonthlyTokensUsed: integer("quota_monthly_tokens_used").default(0).notNull(),
  quotaMonthlyResetsAt: timestamp("quota_monthly_resets_at"),
  defaultTone: text("default_tone"),
  defaultLanguage: text("default_language"),
  allowModelOverride: boolean("allow_model_override").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  keyHash: text("key_hash").notNull(), // SHA-256 хэш ключа
  name: text("name"),
  revoked: boolean("revoked").default(false).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  eventType: text("event_type").notNull(), // ai_generate | rag_search | doc_ingest | ad_generate | image_generate
  tokensPrompt: integer("tokens_prompt"),
  tokensCompletion: integer("tokens_completion"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
  latencyMs: integer("latency_ms"),
  model: text("model"),
  meta: text("meta"), // JSON string (облегчённо)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ragQueries = pgTable("rag_queries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  query: text("query").notNull(),
  strategy: text("strategy").notNull(), // pgvector | json | keyword
  resultsCount: integer("results_count").default(0).notNull(),
  usedInGeneration: boolean("used_in_generation").default(false).notNull(),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const embeddingCache = pgTable("embedding_cache", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  inputHash: text("input_hash").notNull(), // SHA-256 от нормализованного текста
  model: text("model").notNull(),
  embedding: text("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = insertUserSchema.omit({ name: true });

export const insertPressReleaseSchema = createInsertSchema(pressReleases).omit({
  id: true,
  userId: true,
  headline: true,
  release: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertAdvertisementSchema = createInsertSchema(advertisements).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertAIDocumentSchema = createInsertSchema(aiDocuments).omit({
  id: true,
  userId: true,
  createdAt: true,
  embedding: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  userId: true,
  createdAt: true,
  quotaMonthlyTokensUsed: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  userId: true,
  createdAt: true,
  lastUsedAt: true,
  revoked: true,
});

export const insertUsageEventSchema = createInsertSchema(usageEvents).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertRagQuerySchema = createInsertSchema(ragQueries).omit({
  id: true,
  userId: true,
  createdAt: true,
  resultsCount: true,
  usedInGeneration: true,
});

export const insertEmbeddingCacheSchema = createInsertSchema(embeddingCache).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type InsertPressRelease = z.infer<typeof insertPressReleaseSchema>;
export type PressRelease = typeof pressReleases.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;
export type Advertisement = typeof advertisements.$inferSelect;
export type InsertAIDocument = z.infer<typeof insertAIDocumentSchema>;
export type AIDocument = typeof aiDocuments.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertUsageEvent = z.infer<typeof insertUsageEventSchema>;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type InsertRagQuery = z.infer<typeof insertRagQuerySchema>;
export type RagQuery = typeof ragQueries.$inferSelect;
export type InsertEmbeddingCache = z.infer<typeof insertEmbeddingCacheSchema>;
export type EmbeddingCache = typeof embeddingCache.$inferSelect;
