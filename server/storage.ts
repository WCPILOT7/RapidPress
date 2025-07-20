import { pressReleases, contacts, type PressRelease, type InsertPressRelease, type Contact, type InsertContact } from "@shared/schema";

export interface IStorage {
  // Press Release methods
  createPressRelease(pressRelease: InsertPressRelease & { release: string }): Promise<PressRelease>;
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

export class MemStorage implements IStorage {
  private pressReleases: Map<number, PressRelease>;
  private contacts: Map<number, Contact>;
  private currentPressReleaseId: number;
  private currentContactId: number;

  constructor() {
    this.pressReleases = new Map();
    this.contacts = new Map();
    this.currentPressReleaseId = 1;
    this.currentContactId = 1;
  }

  async createPressRelease(data: InsertPressRelease & { release: string }): Promise<PressRelease> {
    const id = this.currentPressReleaseId++;
    const pressRelease: PressRelease = {
      ...data,
      quote: data.quote || null,
      competitors: data.competitors || null,
      id,
      createdAt: new Date(),
    };
    this.pressReleases.set(id, pressRelease);
    return pressRelease;
  }

  async getPressReleases(): Promise<PressRelease[]> {
    return Array.from(this.pressReleases.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getPressReleaseById(id: number): Promise<PressRelease | undefined> {
    return this.pressReleases.get(id);
  }

  async updatePressRelease(id: number, updates: Partial<PressRelease>): Promise<PressRelease> {
    const existingRelease = this.pressReleases.get(id);
    if (!existingRelease) {
      throw new Error('Press release not found');
    }
    
    const updatedRelease: PressRelease = {
      ...existingRelease,
      ...updates,
      id, // Ensure ID doesn't change
    };
    
    this.pressReleases.set(id, updatedRelease);
    return updatedRelease;
  }

  async deletePressRelease(id: number): Promise<void> {
    this.pressReleases.delete(id);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const newContact: Contact = {
      ...contact,
      id,
      createdAt: new Date(),
    };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async createContacts(contactsData: InsertContact[]): Promise<Contact[]> {
    const results: Contact[] = [];
    for (const contactData of contactsData) {
      const contact = await this.createContact(contactData);
      results.push(contact);
    }
    return results;
  }

  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async deleteContact(id: number): Promise<void> {
    this.contacts.delete(id);
  }
}

export const storage = new MemStorage();
