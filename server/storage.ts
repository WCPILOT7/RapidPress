import { pressReleases, contacts, type PressRelease, type InsertPressRelease, type Contact, type InsertContact } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Press Release methods
  createPressRelease(pressRelease: InsertPressRelease & { headline: string; release: string }): Promise<PressRelease>;
  getPressReleases(): Promise<PressRelease[]>;
  getPressReleaseById(id: number): Promise<PressRelease | undefined>;
  updatePressRelease(id: number, updates: Partial<PressRelease>): Promise<PressRelease>;
  deletePressRelease(id: number): Promise<void>;
  
  // Contact methods
  createContact(contact: InsertContact): Promise<Contact>;
  createContacts(contacts: InsertContact[]): Promise<Contact[]>;
  getContacts(): Promise<Contact[]>;
  deleteContact(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createPressRelease(data: InsertPressRelease & { headline: string; release: string }): Promise<PressRelease> {
    const [pressRelease] = await db
      .insert(pressReleases)
      .values({
        ...data,
        quote: data.quote || null,
        competitors: data.competitors || null,
      })
      .returning();
    return pressRelease;
  }

  async getPressReleases(): Promise<PressRelease[]> {
    const results = await db.select().from(pressReleases).orderBy(pressReleases.createdAt);
    return results.reverse(); // Newest first
  }

  async getPressReleaseById(id: number): Promise<PressRelease | undefined> {
    const [pressRelease] = await db.select().from(pressReleases).where(eq(pressReleases.id, id));
    return pressRelease || undefined;
  }

  async updatePressRelease(id: number, updates: Partial<PressRelease>): Promise<PressRelease> {
    const [updatedRelease] = await db
      .update(pressReleases)
      .set(updates)
      .where(eq(pressReleases.id, id))
      .returning();
    
    if (!updatedRelease) {
      throw new Error('Press release not found');
    }
    
    return updatedRelease;
  }

  async deletePressRelease(id: number): Promise<void> {
    await db.delete(pressReleases).where(eq(pressReleases.id, id));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async createContacts(contactsData: InsertContact[]): Promise<Contact[]> {
    const results = await db
      .insert(contacts)
      .values(contactsData)
      .returning();
    return results;
  }

  async getContacts(): Promise<Contact[]> {
    const results = await db.select().from(contacts).orderBy(contacts.createdAt);
    return results.reverse(); // Newest first
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }
}

export const storage = new DatabaseStorage();
