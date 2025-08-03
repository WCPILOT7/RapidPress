import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPressReleaseSchema, insertContactSchema, insertAdvertisementSchema, insertUserSchema, loginSchema } from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import csvParser from "csv-parser";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";

// Extend session data
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

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

// Session configuration
const PgSession = ConnectPgSimple(session);

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; name: string };
}

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const attachUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.session?.userId) {
    const user = await storage.getUserById(req.session.userId);
    if (user) {
      req.user = { id: user.id, email: user.email, name: user.name };
    }
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true, // Create session even for unauthenticated requests
    rolling: true, // Reset expiration on activity
    name: 'connect.sid',
    cookie: {
      secure: false, // Never use secure in development
      httpOnly: false, // Allow JavaScript access for debugging
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: false, // Allow cross-origin cookies
      path: '/', // Ensure cookie is available for all paths
    },
  }));

  // Apply user attachment middleware to all routes
  app.use(attachUser);

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Create session and save it
      req.session.userId = user.id;
      
      // Save session before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create session and save it
      req.session.userId = user.id;
      
      // Save session before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    if (req.user) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });
  
  // Generate press release from uploaded file
  app.post('/api/generate-from-file', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user!.id;
      
      // Extract text content from the uploaded file
      let fileContent = '';
      const filePath = req.file.path;
      
      try {
        if (req.file.mimetype === 'text/plain') {
          fileContent = fs.readFileSync(filePath, 'utf8');
        } else if (req.file.mimetype === 'application/pdf') {
          // For PDF files, we'll need a PDF parser library
          // For now, return an error asking for text files
          return res.status(400).json({ error: 'PDF parsing not yet supported. Please upload a text file (.txt) or use manual entry.' });
        } else if (req.file.mimetype.includes('word') || req.file.mimetype.includes('rtf')) {
          // For Word/RTF files, we'll need specific parsers
          return res.status(400).json({ error: 'Word/RTF parsing not yet supported. Please upload a text file (.txt) or use manual entry.' });
        } else {
          return res.status(400).json({ error: 'Unsupported file type. Please upload a text file (.txt).' });
        }
        
        // Clean up the uploaded file
        fs.unlinkSync(filePath);
        
      } catch (fileError) {
        console.error('File processing error:', fileError);
        return res.status(400).json({ error: 'Failed to process uploaded file. Please try again.' });
      }

      // Get additional form data if provided
      const additionalData = {
        company: req.body.company || '',
        contact: req.body.contact || '',
        contactEmail: req.body.contactEmail || '',
        contactPhone: req.body.contactPhone || '',
        date: req.body.date || new Date().toISOString().split('T')[0],
        brandTone: req.body.brandTone || '',
        quote: req.body.quote || '',
        competitors: req.body.competitors || '',
      };

      // Generate headline from file content
      const headlinePrompt = `Generate a compelling, professional press release headline based on the following document content:

${fileContent.substring(0, 2000)} ${fileContent.length > 2000 ? '...' : ''}

${additionalData.company ? `Company: ${additionalData.company}` : ''}

The headline should be:
- Under 100 characters
- Attention-grabbing and newsworthy
- Professional and clear
- Focused on the key announcement from the document

Return only the headline, no quotes or additional text.`;

      const headlineCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert at writing compelling press release headlines. Generate only the headline, nothing else.' },
          { role: 'user', content: headlinePrompt },
        ],
      });

      const generatedHeadline = headlineCompletion.choices[0].message.content || '';

      // Generate the full press release
      const prompt = `Create a professional press release based on the following document content and additional details:

DOCUMENT CONTENT:
${fileContent}

ADDITIONAL DETAILS:
${additionalData.company ? `Company: ${additionalData.company}` : ''}
${additionalData.contact ? `PR Contact: ${additionalData.contact}` : ''}
${additionalData.contactEmail ? `Contact Email: ${additionalData.contactEmail}` : ''}
${additionalData.contactPhone ? `Contact Phone: ${additionalData.contactPhone}` : ''}
Release Date: ${additionalData.date}
${additionalData.quote ? `Executive Quote: ${additionalData.quote}` : ''}
${additionalData.competitors ? `Competitor Info: ${additionalData.competitors}` : ''}
${additionalData.brandTone ? `Brand Tone & Guidelines: ${additionalData.brandTone}` : ''}

Instructions:
1. Use the document content as the primary source for the press release
2. Structure it professionally with proper headline, dateline, body, and contact information
3. Extract key information, quotes, and details from the document
4. Include the provided release date (${additionalData.date})
5. If company details or contact info aren't in the document, use the additional details provided
6. ${additionalData.brandTone ? `Follow the brand tone and guidelines: ${additionalData.brandTone}` : 'Use a professional, newsworthy tone'}

Create a complete, polished press release that follows standard PR format.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a public relations expert specializing in writing professional press releases from source documents.' },
          { role: 'user', content: prompt },
        ],
      });

      const generatedRelease = completion.choices[0].message.content || '';
      
      // Save to database with extracted or provided information
      const pressRelease = await storage.createPressRelease(userId, {
        company: additionalData.company || 'Company Name', // Fallback if not provided
        copy: fileContent.substring(0, 1000), // Store first part of file content as copy
        contact: additionalData.contact || 'PR Contact',
        contactEmail: additionalData.contactEmail || 'contact@company.com',
        contactPhone: additionalData.contactPhone || 'Phone Number',
        date: additionalData.date,
        brandTone: additionalData.brandTone,
        quote: additionalData.quote,
        competitors: additionalData.competitors,
        headline: generatedHeadline,
        release: generatedRelease,
      });

      res.json(pressRelease);
    } catch (error: any) {
      console.error('File upload generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate press release from file' });
    }
  });

  // Generate press release
  app.post('/api/generate', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertPressReleaseSchema.parse(req.body);
      const userId = req.user!.id;
      
      // First, generate a compelling headline
      const headlinePrompt = `Generate a compelling, professional press release headline for the following:

Company: ${validatedData.company}
Main story/announcement: ${validatedData.copy}
Context: ${validatedData.competitors || 'No additional context'}

The headline should be:
- Under 100 characters
- Attention-grabbing and newsworthy
- Professional and clear
- Focused on the key announcement

Return only the headline, no quotes or additional text.`;

      const headlineCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert at writing compelling press release headlines. Generate only the headline, nothing else.' },
          { role: 'user', content: headlinePrompt },
        ],
      });

      const generatedHeadline = headlineCompletion.choices[0].message.content || '';

      // Then generate the full press release
      const prompt = `Write a professional press release based on the following:

Company: ${validatedData.company}
Headline: ${generatedHeadline}
Release Date: ${validatedData.date}
Copy: ${validatedData.copy}
PR Contact: ${validatedData.contact}
Contact Email: ${validatedData.contactEmail}
Contact Phone: ${validatedData.contactPhone}
Quote: ${validatedData.quote || 'No quote provided'}
Competitor Info: ${validatedData.competitors || 'No competitor information provided'}
Brand Tone & Guidelines: ${validatedData.brandTone || 'No specific brand guidelines provided'}

IMPORTANT: Use the provided release date (${validatedData.date}) prominently in the press release. Format the date appropriately in the press release header or opening paragraph.

${validatedData.brandTone ? `Follow these brand tone, voice, and guidelines: ${validatedData.brandTone}. If company boilerplate details are provided in the guidelines, incorporate them appropriately into the press release.` : ''}

Structure it with the provided headline, subheadline, main body, quote, and boilerplate with proper contact information. Make it professional and newsworthy.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: 'system', content: 'You are a public relations expert specializing in writing professional press releases.' },
          { role: 'user', content: prompt },
        ],
      });

      const generatedRelease = completion.choices[0].message.content || '';
      
      const pressRelease = await storage.createPressRelease(userId, {
        ...validatedData,
        headline: generatedHeadline,
        release: generatedRelease,
      });

      res.json(pressRelease);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all press releases
  app.get('/api/releases', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const releases = await storage.getPressReleases(userId);
      res.json(releases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get press release by ID
  app.get('/api/releases/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const release = await storage.getPressReleaseById(id, userId);
      if (!release) {
        return res.status(404).json({ error: 'Press release not found' });
      }
      res.json(release);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update press release
  app.put('/api/releases/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { release } = req.body;
      
      const existingRelease = await storage.getPressReleaseById(id, userId);
      if (!existingRelease) {
        return res.status(404).json({ error: 'Press release not found' });
      }

      const updatedRelease = await storage.updatePressRelease(id, userId, { release });
      res.json(updatedRelease);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Edit press release with AI
  app.post('/api/releases/:id/edit', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { instruction, currentContent } = req.body;
      
      const existingRelease = await storage.getPressReleaseById(id, userId);
      if (!existingRelease) {
        return res.status(404).json({ error: 'Press release not found' });
      }

      const prompt = `You are editing a press release. Here is the current content:

${currentContent}

User instruction: ${instruction}

Please provide the updated press release content based on the user's instruction. Keep the professional press release format and style. Only return the updated content, no additional commentary.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: 'system', content: 'You are a professional press release editor. Modify the content based on user instructions while maintaining press release standards.' },
          { role: 'user', content: prompt },
        ],
      });

      const updatedContent = completion.choices[0].message.content || currentContent;
      
      res.json({ release: updatedContent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Translate press release
  app.post('/api/releases/:id/translate', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { language } = req.body;
      
      const existingRelease = await storage.getPressReleaseById(id, userId);
      if (!existingRelease) {
        return res.status(404).json({ error: 'Press release not found' });
      }

      const prompt = `Translate the following press release to ${language}. Maintain the professional press release format, structure, and tone. Keep all company names, proper nouns, and contact information unchanged. Only translate the text content:

${existingRelease.release}

Please provide only the translated press release content, with no additional commentary.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `You are a professional translator specializing in business communications. Translate press releases accurately while maintaining their professional format and impact. Always preserve proper nouns, company names, and contact details.` },
          { role: 'user', content: prompt },
        ],
      });

      const translatedContent = completion.choices[0].message.content || existingRelease.release;
      
      // Also translate the headline
      const headlinePrompt = `Translate this press release headline to ${language}: "${existingRelease.headline}"
      
      Provide only the translated headline, no additional text.`;

      const headlineCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are translating press release headlines. Provide only the translated headline.' },
          { role: 'user', content: headlinePrompt },
        ],
      });

      const translatedHeadline = headlineCompletion.choices[0].message.content || existingRelease.headline;
      
      // Create new translated press release (exclude id and createdAt from existing release)
      const { id: _, createdAt: __, ...releaseData } = existingRelease;
      const translatedRelease = await storage.createPressRelease(userId, {
        ...releaseData,
        headline: translatedHeadline,
        release: translatedContent,
        language: language,
        originalId: existingRelease.originalId || existingRelease.id, // Link to original
      });

      res.json(translatedRelease);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete press release
  app.delete('/api/releases/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      await storage.deletePressRelease(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload contacts CSV
  app.post('/api/contacts/upload', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
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
            
            const userId = req.user!.id;
            const createdContacts = await storage.createContacts(userId, validatedContacts);
            
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
  app.get('/api/contacts', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const contacts = await storage.getContacts(userId);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete contact
  app.delete('/api/contacts/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      await storage.deleteContact(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send press release to contacts
  app.post('/api/send-release', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { releaseId, recipientIds, subject, customMessage } = req.body;
      const userId = req.user!.id;
      
      const release = await storage.getPressReleaseById(releaseId, userId);
      if (!release) {
        return res.status(404).json({ error: 'Press release not found' });
      }

      let contacts = await storage.getContacts(userId);
      
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

  // Create advertisement from press release
  app.post('/api/advertisements', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { pressReleaseId, platform, type } = req.body;
      const userId = req.user!.id;
      
      if (!pressReleaseId || !platform || !type) {
        return res.status(400).json({ error: 'Missing required fields: pressReleaseId, platform, type' });
      }
      
      const release = await storage.getPressReleaseById(pressReleaseId, userId);
      if (!release) {
        return res.status(404).json({ error: 'Press release not found' });
      }

      let prompt = '';
      let title = '';
      
      if (type === 'social_media') {
        switch (platform) {
          case 'twitter':
            prompt = `Create a compelling Twitter/X post based on this press release. Keep it under 280 characters and make it engaging with relevant hashtags:\n\n${release.release}`;
            title = `Twitter Post - ${release.headline}`;
            break;
          case 'facebook':
            prompt = `Create an engaging Facebook post based on this press release. Make it conversational and include a call-to-action:\n\n${release.release}`;
            title = `Facebook Post - ${release.headline}`;
            break;
          case 'linkedin':
            prompt = `Create a professional LinkedIn post based on this press release. Make it business-focused and include relevant industry hashtags:\n\n${release.release}`;
            title = `LinkedIn Post - ${release.headline}`;
            break;
          case 'instagram':
            prompt = `Create an Instagram caption based on this press release. Make it visually engaging and include relevant hashtags:\n\n${release.release}`;
            title = `Instagram Post - ${release.headline}`;
            break;
        }
      } else if (type === 'ad') {
        switch (platform) {
          case 'google_ads':
            prompt = `Create a Google Ads text advertisement based on this press release. Include a compelling headline, description, and call-to-action. Keep headlines under 30 characters and descriptions under 90 characters:\n\n${release.release}`;
            title = `Google Ad - ${release.headline}`;
            break;
          case 'facebook':
            prompt = `Create a Facebook ad copy based on this press release. Make it compelling and include a strong call-to-action:\n\n${release.release}`;
            title = `Facebook Ad - ${release.headline}`;
            break;
        }
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `You are a social media and advertising expert. Create compelling, platform-specific content that drives engagement and action.` },
          { role: 'user', content: prompt },
        ],
      });

      const content = completion.choices[0].message.content || '';

      // Generate image prompt for visual content but don't create the image yet
      let imagePrompt = '';
      
      if (platform === 'instagram' || platform === 'facebook' || platform === 'linkedin' || type === 'ad') {
        const imageCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert at creating detailed image prompts for social media and advertising content.' },
            { role: 'user', content: `Create a detailed image prompt for a ${platform} ${type} about this: ${release.headline}. The image should be professional, visually appealing, and relevant to the content. Keep it under 1000 characters.` },
          ],
        });
        imagePrompt = imageCompletion.choices[0].message.content || '';
      }

      const advertisement = await storage.createAdvertisement(userId, {
        pressReleaseId,
        title,
        content,
        platform,
        type,
        imagePrompt: imagePrompt || undefined,
        imageUrl: undefined, // No image generated initially
      });

      res.json(advertisement);
    } catch (error: any) {
      console.error('Error creating advertisement:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all advertisements
  app.get('/api/advertisements', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const advertisements = await storage.getAdvertisements(userId);
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get advertisements by press release ID
  app.get('/api/advertisements/press-release/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const pressReleaseId = parseInt(req.params.id);
      const userId = req.user!.id;
      const advertisements = await storage.getAdvertisementsByPressReleaseId(pressReleaseId, userId);
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update advertisement
  app.put('/api/advertisements/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { content, title } = req.body;
      
      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }

      const updatedAdvertisement = await storage.updateAdvertisement(id, userId, { 
        content: content || existingAd.content,
        title: title || existingAd.title 
      });
      res.json(updatedAdvertisement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Edit advertisement with AI
  app.post('/api/advertisements/:id/edit', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { instruction, currentContent } = req.body;
      
      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }

      const prompt = `You are editing ${existingAd.type === 'social_media' ? 'a social media post' : 'an advertisement'} for ${existingAd.platform}. Here is the current content:

${currentContent}

User instruction: ${instruction}

Please provide the updated content based on the user's instruction. Keep it appropriate for ${existingAd.platform} and maintain the ${existingAd.type === 'social_media' ? 'social media post' : 'advertisement'} format and style. Only return the updated content, no additional commentary.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `You are a social media and advertising expert. Modify the content based on user instructions while maintaining platform-specific best practices for ${existingAd.platform}.` },
          { role: 'user', content: prompt },
        ],
      });

      const updatedContent = completion.choices[0].message.content || currentContent;
      
      res.json({ content: updatedContent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Regenerate image for advertisement
  // Generate image for advertisement
  app.post('/api/advertisements/:id/generate-image', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { imagePrompt } = req.body;
      
      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }

      const promptToUse = imagePrompt || existingAd.imagePrompt;
      if (!promptToUse) {
        return res.status(400).json({ error: 'No image prompt available' });
      }

      try {
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: promptToUse,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        });
        
        const imageUrl = imageResponse.data?.[0]?.url || '';
        
        if (imageUrl) {
          const updatedAdvertisement = await storage.updateAdvertisement(id, userId, { 
            imageUrl,
            imagePrompt: imagePrompt || existingAd.imagePrompt,
            isCustomImage: false
          });
          res.json(updatedAdvertisement);
        } else {
          res.status(500).json({ error: 'Failed to generate image' });
        }
      } catch (error) {
        console.log('Image generation failed:', error);
        res.status(500).json({ error: 'Image generation failed' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/advertisements/:id/regenerate-image', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { imagePrompt } = req.body;
      
      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }

      const promptToUse = imagePrompt || existingAd.imagePrompt;
      if (!promptToUse) {
        return res.status(400).json({ error: 'No image prompt available' });
      }

      try {
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: promptToUse,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        });
        
        const imageUrl = imageResponse.data?.[0]?.url || '';
        
        if (imageUrl) {
          const updatedAdvertisement = await storage.updateAdvertisement(id, userId, { 
            imageUrl,
            imagePrompt: imagePrompt || existingAd.imagePrompt,
            isCustomImage: false // Reset to AI-generated
          });
          res.json(updatedAdvertisement);
        } else {
          res.status(500).json({ error: 'Failed to generate image' });
        }
      } catch (error) {
        console.log('Image generation failed:', error);
        res.status(500).json({ error: 'Image generation failed' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload custom image for advertisement
  app.post('/api/advertisements/:id/upload-image', requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Store the relative path for the uploaded image
      const imageUrl = `/uploads/${req.file.filename}`;
      
      const updatedAdvertisement = await storage.updateAdvertisement(id, userId, { 
        imageUrl,
        isCustomImage: true
      });
      
      res.json(updatedAdvertisement);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete advertisement
  app.delete('/api/advertisements/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      await storage.deleteAdvertisement(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
