import type { Express } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export function registerProfileRoutes(app: Express) {
  // Get user details
  app.get('/api/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabase
        .from('user_details')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No row found - user hasn't set up profile yet
          return res.json(null);
        }
        return res.status(400).json({ message: error.message });
      }

      if (!data) {
        return res.json(null);
      }

      return res.json({
        id: data.id,
        displayName: data.display_name || undefined,
        phone: data.phone || undefined,
        userLogo: data.user_logo || undefined,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      });
    } catch (error: any) {
      console.error('Get user details error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user details (create if doesn't exist)
  app.patch('/api/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { displayName, phone, userLogo } = req.body;

      const { data, error } = await supabase
        .from('user_details')
        .upsert({
          id: userId,
          display_name: displayName || null,
          phone: phone || null,
          user_logo: userLogo || null,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      if (!data) {
        return res.status(500).json({ message: 'Failed to update user details' });
      }

      return res.json({
        id: data.id,
        displayName: data.display_name || undefined,
        phone: data.phone || undefined,
        userLogo: data.user_logo || undefined,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      });
    } catch (error: any) {
      console.error('Update user details error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Upload user logo to storage
  app.post('/api/profile/upload-logo', requireAuth, upload.single('file'), async (req, res) => {
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
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file.buffer, {
          cacheControl: '3600',
          upsert: true,
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
      console.error('Upload user logo error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete user logo from storage
  app.delete('/api/profile/logo', requireAuth, async (req, res) => {
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

      return res.json({ message: 'User logo deleted successfully' });
    } catch (error: any) {
      console.error('Delete user logo error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}
