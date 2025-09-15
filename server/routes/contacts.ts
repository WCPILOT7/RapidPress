// @ts-nocheck
import type { Express, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import csvParser from 'csv-parser';
import nodemailer from 'nodemailer';
import { storage } from '../storage.js';
import { requireAuth } from '../lib/auth.js';
import { insertContactSchema } from '@shared/schema';

interface AuthenticatedRequest extends Request { user?: { id: number; email?: string } | null; }

const upload = multer({ dest: 'uploads/' });

// Reuse transporter config (simple recreation to keep module isolated)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export function registerContactRoutes(app: Express) {
  // CSV upload контактов
  app.post('/api/contacts/upload', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const filePath = req.file.path; const contacts: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: any) => {
          if (row.name && row.email && row.publication) {
            contacts.push({ name: row.name.trim(), email: row.email.trim(), publication: row.publication.trim() });
          }
        })
        .on('end', async () => {
          try {
            const validated = contacts.map(c => insertContactSchema.parse(c));
            const userId = req.user!.id;
            const created = await storage.createContacts(userId, validated);
            fs.unlinkSync(filePath);
            res.json({ message: 'Contacts uploaded successfully', total: created.length, contacts: created });
          } catch (e: any) { res.status(400).json({ error: e.message }); }
        })
        .on('error', () => res.status(500).json({ error: 'Error parsing CSV file' }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Список контактов
  app.get('/api/contacts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try { const userId = req.user!.id; const contacts = await storage.getContacts(userId); res.json(contacts); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Удаление контакта
  app.delete('/api/contacts/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try { const id = parseInt(req.params.id); const userId = req.user!.id; await storage.deleteContact(id, userId); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Отправка пресс-релиза контактам
  app.post('/api/send-release', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { releaseId, recipientIds, subject, customMessage } = req.body; const userId = req.user!.id;
      const release = await storage.getPressReleaseById(releaseId, userId); if (!release) return res.status(404).json({ error: 'Press release not found' });
      let contacts = await storage.getContacts(userId);
      if (recipientIds && recipientIds.length > 0) { contacts = contacts.filter(c => recipientIds.includes(c.id)); }
      if (!contacts.length) return res.status(400).json({ error: 'No contacts to send to' });
      const emailSubject = subject || `Press Release: ${release.headline}`;
      const emailBody = customMessage ? `${customMessage}\n\n---\n\n${release.release}` : release.release;
      const promises = contacts.map(c => transporter.sendMail({ from: process.env.EMAIL_USER, to: c.email, subject: emailSubject, text: emailBody }));
      await Promise.all(promises);
      res.json({ message: 'Press release sent successfully', recipients: contacts.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
