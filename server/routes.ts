import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPressReleaseSchema, insertContactSchema, insertAdvertisementSchema } from "@shared/schema";
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
Copy: ${validatedData.copy}
PR Contact: ${validatedData.contact}
Contact Email: ${validatedData.contactEmail}
Contact Phone: ${validatedData.contactPhone}
Quote: ${validatedData.quote || 'No quote provided'}
Competitor Info: ${validatedData.competitors || 'No competitor information provided'}

Structure it with the provided headline, subheadline, main body, quote, and boilerplate with proper contact information. Make it professional and newsworthy.`;

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
        headline: generatedHeadline,
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

  // Update press release
  app.put('/api/releases/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { release } = req.body;
      
      const existingRelease = await storage.getPressReleaseById(id);
      if (!existingRelease) {
        return res.status(404).json({ error: 'Press release not found' });
      }

      const updatedRelease = await storage.updatePressRelease(id, { release });
      res.json(updatedRelease);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Edit press release with AI
  app.post('/api/releases/:id/edit', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { instruction, currentContent } = req.body;
      
      const existingRelease = await storage.getPressReleaseById(id);
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

  // Create advertisement from press release
  app.post('/api/advertisements', async (req, res) => {
    try {
      const { pressReleaseId, platform, type } = req.body;
      
      if (!pressReleaseId || !platform || !type) {
        return res.status(400).json({ error: 'Missing required fields: pressReleaseId, platform, type' });
      }
      
      const release = await storage.getPressReleaseById(pressReleaseId);
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

      // Generate image prompt and actual image for visual content
      let imagePrompt = '';
      let imageUrl = '';
      
      if (platform === 'instagram' || platform === 'facebook' || platform === 'linkedin' || type === 'ad') {
        const imageCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert at creating detailed image prompts for social media and advertising content.' },
            { role: 'user', content: `Create a detailed image prompt for a ${platform} ${type} about this: ${release.headline}. The image should be professional, visually appealing, and relevant to the content. Keep it under 1000 characters.` },
          ],
        });
        imagePrompt = imageCompletion.choices[0].message.content || '';

        // Generate actual image using DALL-E
        if (imagePrompt) {
          try {
            const imageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: imagePrompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            });
            imageUrl = imageResponse.data?.[0]?.url || '';
          } catch (error) {
            console.log('Image generation failed:', error);
            // Continue without image if generation fails
          }
        }
      }

      const advertisement = await storage.createAdvertisement({
        pressReleaseId,
        title,
        content,
        platform,
        type,
        imagePrompt: imagePrompt || undefined,
        imageUrl: imageUrl || undefined,
      });

      res.json(advertisement);
    } catch (error: any) {
      console.error('Error creating advertisement:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all advertisements
  app.get('/api/advertisements', async (req, res) => {
    try {
      const advertisements = await storage.getAdvertisements();
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get advertisements by press release ID
  app.get('/api/advertisements/press-release/:id', async (req, res) => {
    try {
      const pressReleaseId = parseInt(req.params.id);
      const advertisements = await storage.getAdvertisementsByPressReleaseId(pressReleaseId);
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update advertisement
  app.put('/api/advertisements/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { content, title } = req.body;
      
      const existingAd = await storage.getAdvertisementById(id);
      if (!existingAd) {
        return res.status(404).json({ error: 'Advertisement not found' });
      }

      const updatedAdvertisement = await storage.updateAdvertisement(id, { 
        content: content || existingAd.content,
        title: title || existingAd.title 
      });
      res.json(updatedAdvertisement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Edit advertisement with AI
  app.post('/api/advertisements/:id/edit', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { instruction, currentContent } = req.body;
      
      const existingAd = await storage.getAdvertisementById(id);
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
  app.post('/api/advertisements/:id/regenerate-image', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { imagePrompt } = req.body;
      
      const existingAd = await storage.getAdvertisementById(id);
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
          const updatedAdvertisement = await storage.updateAdvertisement(id, { 
            imageUrl,
            imagePrompt: imagePrompt || existingAd.imagePrompt
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

  // Delete advertisement
  app.delete('/api/advertisements/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAdvertisement(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
