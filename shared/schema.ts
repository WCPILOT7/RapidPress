import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pressReleases = pgTable("press_releases", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  headline: text("headline").notNull(),
  copy: text("copy").notNull(),
  contact: text("contact").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  quote: text("quote"),
  competitors: text("competitors"),
  release: text("release").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  publication: text("publication").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
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

export const insertPressReleaseSchema = createInsertSchema(pressReleases).omit({
  id: true,
  headline: true,
  release: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertAdvertisementSchema = createInsertSchema(advertisements).omit({
  id: true,
  createdAt: true,
});

export type InsertPressRelease = z.infer<typeof insertPressReleaseSchema>;
export type PressRelease = typeof pressReleases.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;
export type Advertisement = typeof advertisements.$inferSelect;
