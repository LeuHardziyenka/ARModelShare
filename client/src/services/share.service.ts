import { supabase } from '@/lib/supabase';
import type { SharedLink, InsertSharedLink, QROptions } from '@/types';

export const shareService = {
  // Create a new shared link
  async createShareLink(data: InsertSharedLink): Promise<SharedLink> {
    const shareData = {
      user_id: data.userId,
      model_id: data.modelId,
      model_name: data.modelName,
      is_active: data.isActive,
      expires_at: data.expiresAt,
      created_at: Date.now(),
      views: 0,
      scans: 0,
    };

    const { data: insertedData, error } = await supabase
      .from('shared_links')
      .insert([shareData])
      .select(`
        *,
        models!shared_links_model_id_fkey(model_url)
      `)
      .single();

    if (error) throw new Error(`Failed to create share link: ${error.message}`);

    return {
      id: insertedData.id,
      userId: insertedData.user_id,
      modelId: insertedData.model_id,
      modelUrl: insertedData.models?.model_url || data.modelUrl,
      modelName: insertedData.model_name,
      isActive: insertedData.is_active,
      expiresAt: insertedData.expires_at,
      createdAt: insertedData.created_at,
      qrOptions: data.qrOptions,
      views: insertedData.views,
      scans: insertedData.scans,
    };
  },

  // Get shared link by ID
  async getShareLink(id: string): Promise<SharedLink | null> {
    const { data, error } = await supabase
      .from('shared_links')
      .select(`
        *,
        models!shared_links_model_id_fkey(model_url)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
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
        level: (data.qr_options?.level as 'L' | 'M' | 'Q' | 'H') || 'M',
        logoSize: data.qr_options?.logo_size || 20,
        includeLogo: data.qr_options?.include_logo || false,
        logoUrl: data.qr_options?.logo_url,
      },
      views: data.views,
      scans: data.scans,
    };
  },

  // Get all shared links for a user
  async getUserShareLinks(userId: string): Promise<SharedLink[]> {
    const { data, error } = await supabase
      .from('shared_links')
      .select(`
        *,
        models!shared_links_model_id_fkey(model_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get user share links: ${error.message}`);

    return (data || []).map(item => ({
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
        level: (item.qr_options?.level as 'L' | 'M' | 'Q' | 'H') || 'M',
        logoSize: item.qr_options?.logo_size || 20,
        includeLogo: item.qr_options?.include_logo || false,
        logoUrl: item.qr_options?.logo_url,
      },
      views: item.views,
      scans: item.scans,
    }));
  },

  // Get recent shared links for a user with pagination
  async getRecentShareLinks(
    userId: string,
    limitCount: number = 10,
    offset: number = 0
  ): Promise<SharedLink[]> {
    const { data, error } = await supabase
      .from('shared_links')
      .select(`
        *,
        models!shared_links_model_id_fkey(model_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitCount - 1);

    if (error) throw new Error(`Failed to get recent share links: ${error.message}`);

    return (data || []).map(item => ({
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
        level: (item.qr_options?.level as 'L' | 'M' | 'Q' | 'H') || 'M',
        logoSize: item.qr_options?.logo_size || 20,
        includeLogo: item.qr_options?.include_logo || false,
        logoUrl: item.qr_options?.logo_url,
      },
      views: item.views,
      scans: item.scans,
    }));
  },

  // Update shared link
  async updateShareLink(id: string, data: Partial<SharedLink>): Promise<void> {
    const updateData: any = {};
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.expiresAt !== undefined) updateData.expires_at = data.expiresAt;
    if (data.views !== undefined) updateData.views = data.views;
    if (data.scans !== undefined) updateData.scans = data.scans;

    const { error } = await supabase
      .from('shared_links')
      .update(updateData)
      .eq('id', id);

    if (error) throw new Error(`Failed to update share link: ${error.message}`);
  },

  // Revoke a shared link
  async revokeShareLink(id: string): Promise<void> {
    await this.updateShareLink(id, { isActive: false });
  },

  // Extend expiration
  async extendExpiration(id: string, days: number = 30): Promise<void> {
    // Get the current link to access its existing expiration date
    const link = await this.getShareLink(id);
    if (!link) {
      throw new Error('Share link not found');
    }

    // Add days to the EXISTING expiration date, not to NOW
    const newExpiration = link.expiresAt + (days * 24 * 60 * 60 * 1000);
    await this.updateShareLink(id, { expiresAt: newExpiration });
  },

  // Increment view count
  async incrementViews(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_views', { link_id: id });
    if (error) {
      // Fallback to manual increment if RPC doesn't exist
      const link = await this.getShareLink(id);
      if (link) {
        await this.updateShareLink(id, { views: link.views + 1 });
      }
    }
  },

  // Increment scan count
  async incrementScans(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_scans', { link_id: id });
    if (error) {
      // Fallback to manual increment if RPC doesn't exist
      const link = await this.getShareLink(id);
      if (link) {
        await this.updateShareLink(id, { scans: link.scans + 1 });
      }
    }
  },

  // Count active links for user
  async countActiveLinks(userId: string): Promise<number> {
    const now = Date.now();
    const { count, error } = await supabase
      .from('shared_links')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', now);

    if (error) throw new Error(`Failed to count active links: ${error.message}`);
    return count || 0;
  },

  // Inactivate all share links for a model
  async inactivateModelLinks(modelId: string): Promise<void> {
    const { error } = await supabase
      .from('shared_links')
      .update({ is_active: false })
      .eq('model_id', modelId);

    if (error) throw new Error(`Failed to inactivate model links: ${error.message}`);
  },

  // Build share URL
  buildShareUrl(linkId: string): string {
    return `${window.location.origin}/ar?id=${linkId}`;
  },
};
