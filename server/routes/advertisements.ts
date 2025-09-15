// @ts-nocheck
import type { Express, Response } from 'express';
import OpenAI from 'openai';
import multer from 'multer';
import { storage } from '../storage.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../lib/auth.js';
import { generateSocialPosts } from '../ai/socialPostGenerator.js';
import { generateAd } from '../ai/adGeneratorChain.js';
import { logUsage, estimateTokens } from '../ai/usage.js';
import { ensureProfileAndCheckQuota } from '../lib/limits.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ dest: 'uploads/' });

interface AuthenticatedRequest extends Request {
  user?: { id: number; email?: string } | null;
}

export function registerAdvertisementRoutes(app: Express) {
  // Create advertisement (social post or ad) from an existing press release
  app.post('/api/advertisements', rateLimit(), requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pressReleaseId, platform, type } = req.body;
      const userId = req.user!.id;
      const t0 = Date.now();

      const releaseForQuota = await storage.getPressReleaseById(pressReleaseId, userId);
      if (releaseForQuota) {
        const q = await ensureProfileAndCheckQuota(userId, estimateTokens(releaseForQuota.release.length) || 0);
        if (!q.allowed) return res.status(429).json({ error: 'Monthly token quota exceeded', quota: q });
      }

      if (!pressReleaseId || !platform || !type) {
        return res.status(400).json({ error: 'Missing required fields: pressReleaseId, platform, type' });
      }

      const release = await storage.getPressReleaseById(pressReleaseId, userId);
      if (!release) return res.status(404).json({ error: 'Press release not found' });

      let content = '';
      let title = '';

      if (type === 'social_media') {
        const social = await generateSocialPosts(release.release);
        switch (platform) {
          case 'twitter':
            content = social.twitter; title = `Twitter Post - ${release.headline}`; break;
          case 'facebook':
            content = social.facebook; title = `Facebook Post - ${release.headline}`; break;
          case 'linkedin':
            content = social.linkedin; title = `LinkedIn Post - ${release.headline}`; break;
          case 'instagram':
            const social2 = await generateSocialPosts(release.release);
            content = social2.facebook.slice(0, 2000);
            title = `Instagram Post - ${release.headline}`; break;
        }
      } else if (type === 'ad') {
        if (platform !== 'google_ads' && platform !== 'facebook') {
          return res.status(400).json({ error: 'Unsupported ad platform' });
        }
        const adJson = await generateAd({ platform, press_release: release.release });
        content = [
          `Headline: ${adJson.headline}`,
          adJson.primary_text,
          adJson.description ? `Description: ${adJson.description}` : '',
          `CTA: ${adJson.cta}`,
          adJson.variants.length ? `\nVariants:\n${adJson.variants.map((v: any) => `- ${v.headline}: ${v.primary_text}`).join('\n')}` : ''
        ].filter(Boolean).join('\n\n');
        title = `${platform === 'google_ads' ? 'Google Ad' : 'Facebook Ad'} - ${release.headline}`;
      }

      // Create image prompt (not generating image yet)
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
        imageUrl: undefined,
      });

      const latencyMs = Date.now() - t0;
      logUsage({
        userId,
        eventType: 'ad_generate',
        promptChars: release.release.length,
        completionChars: content.length,
        latencyMs,
        model: type === 'ad' ? 'ad_generator_chain' : 'social_post_chain',
        meta: { platform, type }
      });
      const tokenDelta = (estimateTokens(release.release.length) || 0) + (estimateTokens(content.length) || 0);
      storage.incrementUserTokens(userId, tokenDelta).catch(()=>{});
      res.json({ ...advertisement, _usage: { latencyMs } });
    } catch (error: any) {
      console.error('Error creating advertisement:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // List all advertisements for user
  app.get('/api/advertisements', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const advertisements = await storage.getAdvertisements(userId);
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List advertisements by press release
  app.get('/api/advertisements/press-release/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pressReleaseId = parseInt(req.params.id);
      const userId = req.user!.id;
      const advertisements = await storage.getAdvertisementsByPressReleaseId(pressReleaseId, userId);
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update advertisement metadata/content
  app.put('/api/advertisements/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { content, title } = req.body;
      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) return res.status(404).json({ error: 'Advertisement not found' });
      const updated = await storage.updateAdvertisement(id, userId, { content: content || existingAd.content, title: title || existingAd.title });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI edit advertisement content
  app.post('/api/advertisements/:id/edit', rateLimit(), requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { instruction, currentContent } = req.body;
      const t0 = Date.now();
      const preTokens = (estimateTokens(currentContent.length + instruction.length) || 0);
      const quota = await ensureProfileAndCheckQuota(userId, preTokens);
      if (!quota.allowed) return res.status(429).json({ error: 'Monthly token quota exceeded', quota });

      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) return res.status(404).json({ error: 'Advertisement not found' });

      const prompt = `You are editing ${existingAd.type === 'social_media' ? 'a social media post' : 'an advertisement'} for ${existingAd.platform}. Here is the current content:\n\n${currentContent}\n\nUser instruction: ${instruction}\n\nPlease provide the updated content based on the user's instruction. Keep it appropriate for ${existingAd.platform} and maintain the ${existingAd.type === 'social_media' ? 'social media post' : 'advertisement'} format and style. Only return the updated content, no additional commentary.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `You are a social media and advertising expert. Modify the content based on user instructions while maintaining platform-specific best practices for ${existingAd.platform}.` },
          { role: 'user', content: prompt },
        ],
      });

      const updatedContent = completion.choices[0].message.content || currentContent;
      const latencyMs = Date.now() - t0;
      logUsage({ userId, eventType: 'ai_generate', promptChars: currentContent.length + instruction.length, completionChars: updatedContent.length, latencyMs, model: 'ad_edit', meta: { adId: id } });
      const tokenDelta = (estimateTokens(currentContent.length + instruction.length) || 0) + (estimateTokens(updatedContent.length) || 0);
      storage.incrementUserTokens(userId, tokenDelta).catch(()=>{});
      res.json({ content: updatedContent, _usage: { latencyMs } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate image for advertisement (initial or regenerate)
  app.post('/api/advertisements/:id/generate-image', rateLimit(), requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { imagePrompt } = req.body;
      const t0 = Date.now();
      const existingAd = await storage.getAdvertisementById(id, userId);
      if (!existingAd) return res.status(404).json({ error: 'Advertisement not found' });
      const promptToUse = imagePrompt || existingAd.imagePrompt;
      if (!promptToUse) return res.status(400).json({ error: 'No image prompt available' });
      try {
        const imageResponse = await openai.images.generate({ model: 'dall-e-3', prompt: promptToUse, n: 1, size: '1024x1024', quality: 'standard' });
        const imageUrl = imageResponse.data?.[0]?.url || '';
        if (!imageUrl) return res.status(500).json({ error: 'Failed to generate image' });
        const updated = await storage.updateAdvertisement(id, userId, { imageUrl, imagePrompt: imagePrompt || existingAd.imagePrompt, isCustomImage: false });
        const latencyMs = Date.now() - t0;
        logUsage({ userId, eventType: 'image_generate', promptChars: promptToUse.length, completionChars: 0, latencyMs, model: 'dall-e-3', meta: { adId: id } });
        res.json({ ...updated, _usage: { latencyMs } });
      } catch (err) {
        console.log('Image generation failed:', err); return res.status(500).json({ error: 'Image generation failed' });
      }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Regenerate image (alias route retained for compatibility)
  app.post('/api/advertisements/:id/regenerate-image', rateLimit(), requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id); const userId = req.user!.id; const { imagePrompt } = req.body; const t0 = Date.now();
      const existingAd = await storage.getAdvertisementById(id, userId); if (!existingAd) return res.status(404).json({ error: 'Advertisement not found' });
      const promptToUse = imagePrompt || existingAd.imagePrompt; if (!promptToUse) return res.status(400).json({ error: 'No image prompt available' });
      try {
        const imageResponse = await openai.images.generate({ model: 'dall-e-3', prompt: promptToUse, n: 1, size: '1024x1024', quality: 'standard' });
        const imageUrl = imageResponse.data?.[0]?.url || '';
        if (!imageUrl) return res.status(500).json({ error: 'Failed to generate image' });
        const updated = await storage.updateAdvertisement(id, userId, { imageUrl, imagePrompt: imagePrompt || existingAd.imagePrompt, isCustomImage: false });
        const latencyMs = Date.now() - t0;
        logUsage({ userId, eventType: 'image_generate', promptChars: promptToUse.length, completionChars: 0, latencyMs, model: 'dall-e-3', meta: { adId: id, regenerate: true } });
        res.json({ ...updated, _usage: { latencyMs } });
      } catch (err) { console.log('Image generation failed:', err); return res.status(500).json({ error: 'Image generation failed' }); }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Upload custom image
  app.post('/api/advertisements/:id/upload-image', requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id); const userId = req.user!.id;
      const existingAd = await storage.getAdvertisementById(id, userId); if (!existingAd) return res.status(404).json({ error: 'Advertisement not found' });
      if (!req.file) return res.status(400).json({ error: 'No image file provided' });
      const imageUrl = `/uploads/${req.file.filename}`;
      const updated = await storage.updateAdvertisement(id, userId, { imageUrl, isCustomImage: true });
      res.json(updated);
    } catch (error: any) { console.error('Error uploading image:', error); res.status(500).json({ error: error.message }); }
  });

  // Delete advertisement
  app.delete('/api/advertisements/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id); const userId = req.user!.id; await storage.deleteAdvertisement(id, userId); res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });
}
