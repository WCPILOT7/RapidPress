import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPressReleaseSchema, insertContactSchema } from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csvParser from "csv-parser";
import nodemailer from "nodemailer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ dest: 'uploads/' });

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Generate press release
  app.post('/api/generate', async (req, res) => {
    try {
      const validatedData = insertPressReleaseSchema.parse(req.body);
      
      const prompt = `Write a professional press release based on the following:

Company: ${validatedData.company}
Headline: ${validatedData.headline}
Copy: ${validatedData.copy}
PR Contact: ${validatedData.contact}
Quote: ${validatedData.quote || 'No quote provided'}
Competitor Info: ${validatedData.competitors || 'No competitor information provided'}

Structure it with a compelling headline, subheadline, main body, quote, and boilerplate. Make it professional and newsworthy.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: 'system', content: 'You are a public relations expert specializing in writing professional press releases.' },
          { role: 'user', content: prompt },
        ],
      });

      const generatedRelease = completion.choices[0].message.content || '';
      
      const pressRelease = await storage.createPressRelease({
        ...validatedData,
        release: generatedRelease,
      });

      res.json(pressRelease);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all press releases
  app.get('/api/releases', async (req, res) => {
    try {
      const releases = await storage.getPressReleases();
      res.json(releases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get press release by ID
  app.get('/api/releases/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const release = await storage.getPressReleaseById(id);
      if (!release) {
        return res.status(404).json({ error: 'Press release not found' });
      }
      res.json(release);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete press release
  app.delete('/api/releases/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePressRelease(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload contacts CSV
  app.post('/api/contacts/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const contacts: any[] = [];

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          if (row.name && row.email && row.publication) {
            contacts.push({
              name: row.name.trim(),
              email: row.email.trim(),
              publication: row.publication.trim(),
            });
          }
        })
        .on('end', async () => {
          try {
            const validatedContacts = contacts.map(contact => 
              insertContactSchema.parse(contact)
            );
            
            const createdContacts = await storage.createContacts(validatedContacts);
            
            // Clean up uploaded file
            fs.unlinkSync(filePath);
            
            res.json({ 
              message: 'Contacts uploaded successfully', 
              total: createdContacts.length,
              contacts: createdContacts 
            });
          } catch (error: any) {
            res.status(400).json({ error: error.message });
          }
        })
        .on('error', (error) => {
          res.status(500).json({ error: 'Error parsing CSV file' });
        });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all contacts
  app.get('/api/contacts', async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete contact
  app.delete('/api/contacts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContact(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send press release to contacts
  app.post('/api/send-release', async (req, res) => {
    try {
      const { releaseId, recipientIds, subject, customMessage } = req.body;
      
      const release = await storage.getPressReleaseById(releaseId);
      if (!release) {
        return res.status(404).json({ error: 'Press release not found' });
      }

      let contacts = await storage.getContacts();
      
      // Filter contacts if specific recipients are selected
      if (recipientIds && recipientIds.length > 0) {
        contacts = contacts.filter(contact => recipientIds.includes(contact.id));
      }

      if (contacts.length === 0) {
        return res.status(400).json({ error: 'No contacts to send to' });
      }

      const emailSubject = subject || `Press Release: ${release.headline}`;
      const emailBody = customMessage 
        ? `${customMessage}\n\n---\n\n${release.release}`
        : release.release;

      // Send emails
      const promises = contacts.map(contact =>
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: contact.email,
          subject: emailSubject,
          text: emailBody,
        })
      );

      await Promise.all(promises);

      res.json({ 
        message: `Press release sent successfully`,
        recipients: contacts.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
