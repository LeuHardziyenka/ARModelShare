import type { Express } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export function registerLogoRoutes(app: Express) {
  // Get all logos for a user
  app.get('/api/logos', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabase
        .from('user_logos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const logos = (data || []).map((logo) => ({
        id: logo.id,
        userId: logo.user_id,
        name: logo.name,
        logoUrl: logo.logo_url,
        createdAt: new Date(logo.created_at).getTime(),
      }));

      return res.json(logos);
    } catch (error: any) {
      console.error('Get logos error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get a single logo
  app.get('/api/logos/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('user_logos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ message: 'Logo not found' });
        }
        return res.status(400).json({ message: error.message });
      }

      if (!data) {
        return res.status(404).json({ message: 'Logo not found' });
      }

      return res.json({
        id: data.id,
        userId: data.user_id,
        name: data.name,
        logoUrl: data.logo_url,
        createdAt: new Date(data.created_at).getTime(),
      });
    } catch (error: any) {
      console.error('Get logo error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create a new logo
  app.post('/api/logos', requireAuth, async (req, res) => {
    try {
      const { name, logoUrl } = req.body;
      const userId = req.user!.id;

      const { data, error } = await supabase
        .from('user_logos')
        .insert({
          user_id: userId,
          name,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      if (!data) {
        return res.status(500).json({ message: 'Failed to create logo' });
      }

      return res.json({
        id: data.id,
        userId: data.user_id,
        name: data.name,
        logoUrl: data.logo_url,
        createdAt: new Date(data.created_at).getTime(),
      });
    } catch (error: any) {
      console.error('Create logo error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update a logo
  app.patch('/api/logos/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      // Verify ownership
      const { data: existing } = await supabase
        .from('user_logos')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

      const { data, error } = await supabase
        .from('user_logos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      if (!data) {
        return res.status(500).json({ message: 'Failed to update logo' });
      }

      return res.json({
        id: data.id,
        userId: data.user_id,
        name: data.name,
        logoUrl: data.logo_url,
        createdAt: new Date(data.created_at).getTime(),
      });
    } catch (error: any) {
      console.error('Update logo error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete a logo
  app.delete('/api/logos/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const { data: existing } = await supabase
        .from('user_logos')
        .select('user_id, logo_url')
        .eq('id', id)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { error } = await supabase
        .from('user_logos')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      // Return logo URL for frontend to handle storage deletion
      return res.json({
        message: 'Logo deleted successfully',
        logoUrl: existing.logo_url
      });
    } catch (error: any) {
      console.error('Delete logo error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Upload logo file to storage
  app.post('/api/logos/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({ message: 'File size must be less than 5MB' });
      }

      // Generate unique filename
      const fileExt = file.originalname.split('.').pop();
      const fileName = `qr-logo-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.mimetype,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return res.status(400).json({ message: `Failed to upload file: ${uploadError.message}` });
      }

      // Get public URL
      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);

      return res.json({ url: data.publicUrl });
    } catch (error: any) {
      console.error('Upload logo error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete logo file from storage
  app.delete('/api/logos/storage', requireAuth, async (req, res) => {
    try {
      const { logoUrl } = req.body;

      if (!logoUrl) {
        return res.status(400).json({ message: 'Logo URL is required' });
      }

      // Extract file path from URL
      const url = new URL(logoUrl);
      const pathParts = url.pathname.split('/logos/');
      if (pathParts.length < 2) {
        return res.status(400).json({ message: 'Invalid logo URL' });
      }

      const filePath = pathParts[1];

      const { error } = await supabase.storage.from('logos').remove([filePath]);

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      return res.json({ message: 'Logo file deleted successfully' });
    } catch (error: any) {
      console.error('Delete logo file error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}
