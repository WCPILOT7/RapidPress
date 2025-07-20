import {
  pressReleases,
  contacts,
  advertisements,
  users,
  type PressRelease,
  type InsertPressRelease,
  type Contact,
  type InsertContact,
  type Advertisement,
  type InsertAdvertisement,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Press Release methods
  createPressRelease(userId: string, pressRelease: InsertPressRelease & { headline: string; release: string }): Promise<PressRelease>;
  getPressReleases(userId: string): Promise<PressRelease[]>;
  getPressReleaseById(userId: string, id: number): Promise<PressRelease | undefined>;
  updatePressRelease(userId: string, id: number, updates: Partial<PressRelease>): Promise<PressRelease>;
  deletePressRelease(userId: string, id: number): Promise<void>;
  
  // Contact methods
  createContact(userId: string, contact: InsertContact): Promise<Contact>;
  createContacts(userId: string, contacts: InsertContact[]): Promise<Contact[]>;
  getContacts(userId: string): Promise<Contact[]>;
  deleteContact(userId: string, id: number): Promise<void>;
  
  // Advertisement methods
  createAdvertisement(userId: string, advertisement: InsertAdvertisement): Promise<Advertisement>;
  getAdvertisements(userId: string): Promise<Advertisement[]>;
  getAdvertisementsByPressReleaseId(userId: string, pressReleaseId: number): Promise<Advertisement[]>;
  getAdvertisementById(userId: string, id: number): Promise<Advertisement | undefined>;
  updateAdvertisement(userId: string, id: number, updates: Partial<Advertisement>): Promise<Advertisement>;
  deleteAdvertisement(userId: string, id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  async createPressRelease(userId: string, data: InsertPressRelease & { headline: string; release: string }): Promise<PressRelease> {
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

  async getPressReleases(userId: string): Promise<PressRelease[]> {
    const results = await db.select().from(pressReleases)
      .where(eq(pressReleases.userId, userId))
      .orderBy(pressReleases.createdAt);
    return results.reverse(); // Newest first
  }

  async getPressReleaseById(userId: string, id: number): Promise<PressRelease | undefined> {
    const [pressRelease] = await db.select().from(pressReleases)
      .where(and(eq(pressReleases.id, id), eq(pressReleases.userId, userId)));
    return pressRelease || undefined;
  }

  async updatePressRelease(userId: string, id: number, updates: Partial<PressRelease>): Promise<PressRelease> {
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

  async deletePressRelease(userId: string, id: number): Promise<void> {
    await db.delete(pressReleases).where(and(eq(pressReleases.id, id), eq(pressReleases.userId, userId)));
  }

  async createContact(userId: string, contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values({ ...contact, userId })
      .returning();
    return newContact;
  }

  async createContacts(userId: string, contactsData: InsertContact[]): Promise<Contact[]> {
    const results = await db
      .insert(contacts)
      .values(contactsData.map(contact => ({ ...contact, userId })))
      .returning();
    return results;
  }

  async getContacts(userId: string): Promise<Contact[]> {
    const results = await db.select().from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(contacts.createdAt);
    return results.reverse(); // Newest first
  }

  async deleteContact(userId: string, id: number): Promise<void> {
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
  }

  async createAdvertisement(userId: string, advertisement: InsertAdvertisement): Promise<Advertisement> {
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

  async getAdvertisements(userId: string): Promise<Advertisement[]> {
    const results = await db.select().from(advertisements)
      .where(eq(advertisements.userId, userId))
      .orderBy(advertisements.createdAt);
    return results.reverse(); // Newest first
  }

  async getAdvertisementsByPressReleaseId(userId: string, pressReleaseId: number): Promise<Advertisement[]> {
    const results = await db
      .select()
      .from(advertisements)
      .where(and(eq(advertisements.pressReleaseId, pressReleaseId), eq(advertisements.userId, userId)))
      .orderBy(advertisements.createdAt);
    return results.reverse(); // Newest first
  }

  async getAdvertisementById(userId: string, id: number): Promise<Advertisement | undefined> {
    const [advertisement] = await db.select().from(advertisements)
      .where(and(eq(advertisements.id, id), eq(advertisements.userId, userId)));
    return advertisement || undefined;
  }

  async updateAdvertisement(userId: string, id: number, updates: Partial<Advertisement>): Promise<Advertisement> {
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

  async deleteAdvertisement(userId: string, id: number): Promise<void> {
    await db.delete(advertisements).where(and(eq(advertisements.id, id), eq(advertisements.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
