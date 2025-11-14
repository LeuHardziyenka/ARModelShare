import type { Express } from 'express';
import { supabase } from '../db';
import { requireAuth, optionalAuth } from '../middleware/auth';

export function registerShareRoutes(app: Express) {
  // Create a new shared link
  app.post('/api/share', requireAuth, async (req, res) => {
    try {
      const { modelId, modelName, modelUrl, isActive, expiresAt, qrOptions } = req.body;
      const userId = req.user!.id;

      const shareData = {
        user_id: userId,
        model_id: modelId,
        model_name: modelName,
        is_active: isActive,
        expires_at: expiresAt,
        created_at: Date.now(),
        qr_options: qrOptions ? {
          fg_color: qrOptions.fgColor,
          bg_color: qrOptions.bgColor,
          level: qrOptions.level,
          logo_size: qrOptions.logoSize,
          include_logo: qrOptions.includeLogo,
          logo_url: qrOptions.logoUrl,
        } : null,
        views: 0,
        scans: 0,
      };

      const { data, error } = await supabase
        .from('shared_links')
        .insert([shareData])
        .select(`
          *,
          models!shared_links_model_id_fkey(model_url)
        `)
        .single();

      if (error) {
        return res.status(400).json({ message: `Failed to create share link: ${error.message}` });
      }

      return res.json({
        id: data.id,
        userId: data.user_id,
        modelId: data.model_id,
        modelUrl: data.models?.model_url || modelUrl,
        modelName: data.model_name,
        isActive: data.is_active,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        qrOptions: data.qr_options ? {
          fgColor: data.qr_options.fg_color || '#000000',
          bgColor: data.qr_options.bg_color || '#ffffff',
          level: data.qr_options.level || 'M',
          logoSize: data.qr_options.logo_size || 20,
          includeLogo: data.qr_options.include_logo || false,
          logoUrl: data.qr_options.logo_url,
        } : qrOptions,
        views: data.views,
        scans: data.scans,
      });
    } catch (error: any) {
      console.error('Create share link error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get shared link by ID (public access for AR viewing)
  app.get('/api/share/:id', optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('shared_links')
        .select(`
          *,
          models!shared_links_model_id_fkey(model_url)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: 'Share link not found' });
      }

      return res.json({
        id: data.id,
        userId: data.user_id,
        modelId: data.model_id,
        modelUrl: data.models?.model_url || '',
        modelName: data.model_name,
        isActive: data.is_active,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        qrOptions: {
          fgColor: data.qr_options?.fg_color || '#000000',
          bgColor: data.qr_options?.bg_color || '#ffffff',
          level: data.qr_options?.level || 'M',
          logoSize: data.qr_options?.logo_size || 20,
          includeLogo: data.qr_options?.include_logo || false,
          logoUrl: data.qr_options?.logo_url,
        },
        views: data.views,
        scans: data.scans,
      });
    } catch (error: any) {
      console.error('Get share link error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all shared links for a user
  app.get('/api/share', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      let query = supabase
        .from('shared_links')
        .select(`
          *,
          models!shared_links_model_id_fkey(model_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (limit !== undefined) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ message: `Failed to get share links: ${error.message}` });
      }

      const links = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        modelId: item.model_id,
        modelUrl: item.models?.model_url || '',
        modelName: item.model_name,
        isActive: item.is_active,
        expiresAt: item.expires_at,
        createdAt: item.created_at,
        qrOptions: {
          fgColor: item.qr_options?.fg_color || '#000000',
          bgColor: item.qr_options?.bg_color || '#ffffff',
          level: item.qr_options?.level || 'M',
          logoSize: item.qr_options?.logo_size || 20,
          includeLogo: item.qr_options?.include_logo || false,
          logoUrl: item.qr_options?.logo_url,
        },
        views: item.views,
        scans: item.scans,
      }));

      return res.json(links);
    } catch (error: any) {
      console.error('Get share links error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update shared link
  app.patch('/api/share/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      // Verify ownership
      const { data: existing } = await supabase
        .from('shared_links')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const updateData: any = {};
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt;
      if (updates.views !== undefined) updateData.views = updates.views;
      if (updates.scans !== undefined) updateData.scans = updates.scans;

      const { error } = await supabase
        .from('shared_links')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return res.status(400).json({ message: `Failed to update share link: ${error.message}` });
      }

      return res.json({ message: 'Share link updated successfully' });
    } catch (error: any) {
      console.error('Update share link error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Revoke a shared link
  app.post('/api/share/:id/revoke', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const { data: existing } = await supabase
        .from('shared_links')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { error } = await supabase
        .from('shared_links')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        return res.status(400).json({ message: `Failed to revoke share link: ${error.message}` });
      }

      return res.json({ message: 'Share link revoked successfully' });
    } catch (error: any) {
      console.error('Revoke share link error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Extend expiration
  app.post('/api/share/:id/extend', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { days = 30 } = req.body;
      const userId = req.user!.id;

      // Get the current link
      const { data: link, error: fetchError } = await supabase
        .from('shared_links')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !link) {
        return res.status(404).json({ message: 'Share link not found' });
      }

      if (link.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Add days to existing expiration
      const newExpiration = link.expires_at + (days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('shared_links')
        .update({ expires_at: newExpiration })
        .eq('id', id);

      if (error) {
        return res.status(400).json({ message: `Failed to extend expiration: ${error.message}` });
      }

      return res.json({ message: 'Expiration extended successfully', expiresAt: newExpiration });
    } catch (error: any) {
      console.error('Extend expiration error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Increment view count
  app.post('/api/share/:id/increment-views', async (req, res) => {
    try {
      const { id } = req.params;

      // Try RPC first
      const { error: rpcError } = await supabase.rpc('increment_views', { link_id: id });

      if (rpcError) {
        // Fallback to manual increment
        const { data: link } = await supabase
          .from('shared_links')
          .select('views')
          .eq('id', id)
          .single();

        if (link) {
          await supabase
            .from('shared_links')
            .update({ views: link.views + 1 })
            .eq('id', id);
        }
      }

      return res.json({ message: 'View count incremented' });
    } catch (error: any) {
      console.error('Increment views error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Increment scan count
  app.post('/api/share/:id/increment-scans', async (req, res) => {
    try {
      const { id } = req.params;

      // Try RPC first
      const { error: rpcError } = await supabase.rpc('increment_scans', { link_id: id });

      if (rpcError) {
        // Fallback to manual increment
        const { data: link } = await supabase
          .from('shared_links')
          .select('scans')
          .eq('id', id)
          .single();

        if (link) {
          await supabase
            .from('shared_links')
            .update({ scans: link.scans + 1 })
            .eq('id', id);
        }
      }

      return res.json({ message: 'Scan count incremented' });
    } catch (error: any) {
      console.error('Increment scans error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Count active links for user
  app.get('/api/share/count/active', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const now = Date.now();

      const { count, error } = await supabase
        .from('shared_links')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', now);

      if (error) {
        return res.status(400).json({ message: `Failed to count active links: ${error.message}` });
      }

      return res.json({ count: count || 0 });
    } catch (error: any) {
      console.error('Count active links error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Inactivate all share links for a model
  app.post('/api/share/inactivate-model/:modelId', requireAuth, async (req, res) => {
    try {
      const { modelId } = req.params;
      const userId = req.user!.id;

      // Verify model ownership
      const { data: model } = await supabase
        .from('models')
        .select('user_id')
        .eq('id', modelId)
        .single();

      if (!model || model.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { error } = await supabase
        .from('shared_links')
        .update({ is_active: false })
        .eq('model_id', modelId);

      if (error) {
        return res.status(400).json({ message: `Failed to inactivate model links: ${error.message}` });
      }

      return res.json({ message: 'Model links inactivated successfully' });
    } catch (error: any) {
      console.error('Inactivate model links error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}
