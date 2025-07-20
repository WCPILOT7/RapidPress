import { pressReleases, contacts, advertisements, type PressRelease, type InsertPressRelease, type Contact, type InsertContact, type Advertisement, type InsertAdvertisement } from "@shared/schema";
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
  
  // Advertisement methods
  createAdvertisement(advertisement: InsertAdvertisement): Promise<Advertisement>;
  getAdvertisements(): Promise<Advertisement[]>;
  getAdvertisementsByPressReleaseId(pressReleaseId: number): Promise<Advertisement[]>;
  getAdvertisementById(id: number): Promise<Advertisement | undefined>;
  updateAdvertisement(id: number, updates: Partial<Advertisement>): Promise<Advertisement>;
  deleteAdvertisement(id: number): Promise<void>;
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

  async createAdvertisement(advertisement: InsertAdvertisement): Promise<Advertisement> {
    const [newAdvertisement] = await db
      .insert(advertisements)
      .values({
        ...advertisement,
        imagePrompt: advertisement.imagePrompt || null,
        imageUrl: advertisement.imageUrl || null,
      })
      .returning();
    return newAdvertisement;
  }

  async getAdvertisements(): Promise<Advertisement[]> {
    const results = await db.select().from(advertisements).orderBy(advertisements.createdAt);
    return results.reverse(); // Newest first
  }

  async getAdvertisementsByPressReleaseId(pressReleaseId: number): Promise<Advertisement[]> {
    const results = await db
      .select()
      .from(advertisements)
      .where(eq(advertisements.pressReleaseId, pressReleaseId))
      .orderBy(advertisements.createdAt);
    return results.reverse(); // Newest first
  }

  async getAdvertisementById(id: number): Promise<Advertisement | undefined> {
    const [advertisement] = await db.select().from(advertisements).where(eq(advertisements.id, id));
    return advertisement || undefined;
  }

  async updateAdvertisement(id: number, updates: Partial<Advertisement>): Promise<Advertisement> {
    const [updatedAdvertisement] = await db
      .update(advertisements)
      .set(updates)
      .where(eq(advertisements.id, id))
      .returning();
    
    if (!updatedAdvertisement) {
      throw new Error('Advertisement not found');
    }
    
    return updatedAdvertisement;
  }

  async deleteAdvertisement(id: number): Promise<void> {
    await db.delete(advertisements).where(eq(advertisements.id, id));
  }
}

export const storage = new DatabaseStorage();
