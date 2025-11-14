import { supabase } from '@/lib/supabase';
import type { UserLogo, InsertUserLogo } from '@/types';

export const logosService = {
  // Get all logos for a user
  async getUserLogos(userId: string): Promise<UserLogo[]> {
    const { data, error } = await supabase
      .from('user_logos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((logo) => ({
      id: logo.id,
      userId: logo.user_id,
      name: logo.name,
      logoUrl: logo.logo_url,
      createdAt: new Date(logo.created_at).getTime(),
    }));
  },

  // Get a single logo
  async getLogo(logoId: string): Promise<UserLogo | null> {
    const { data, error } = await supabase
      .from('user_logos')
      .select('*')
      .eq('id', logoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      logoUrl: data.logo_url,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  // Create a new logo
  async createLogo(logo: InsertUserLogo): Promise<UserLogo> {
    const { data, error } = await supabase
      .from('user_logos')
      .insert({
        user_id: logo.userId,
        name: logo.name,
        logo_url: logo.logoUrl,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create logo');

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      logoUrl: data.logo_url,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  // Update a logo
  async updateLogo(logoId: string, updates: Partial<InsertUserLogo>): Promise<UserLogo> {
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

    const { data, error } = await supabase
      .from('user_logos')
      .update(updateData)
      .eq('id', logoId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update logo');

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      logoUrl: data.logo_url,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  // Delete a logo
  async deleteLogo(logoId: string): Promise<void> {
    const { error } = await supabase
      .from('user_logos')
      .delete()
      .eq('id', logoId);

    if (error) throw error;
  },

  // Upload logo file to storage
  async uploadLogoFile(userId: string, file: File): Promise<string> {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User must be authenticated to upload files');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `qr-logo-${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL
    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Delete logo file from storage
  async deleteLogoFile(logoUrl: string): Promise<void> {
    // Extract file path from URL
    const url = new URL(logoUrl);
    const pathParts = url.pathname.split('/logos/');
    if (pathParts.length < 2) return;

    const filePath = pathParts[1];

    const { error } = await supabase.storage.from('logos').remove([filePath]);

    if (error) throw error;
  },
};
