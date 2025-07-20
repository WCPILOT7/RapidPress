import { users, pressReleases, contacts, advertisements, type User, type InsertUser, type PressRelease, type InsertPressRelease, type Contact, type InsertContact, type Advertisement, type InsertAdvertisement } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  
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
}

export const storage = new DatabaseStorage();
