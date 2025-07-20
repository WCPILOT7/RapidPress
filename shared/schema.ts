import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
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

export type InsertPressRelease = z.infer<typeof insertPressReleaseSchema>;
export type PressRelease = typeof pressReleases.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
