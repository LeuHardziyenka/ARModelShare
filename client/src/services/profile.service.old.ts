import { supabase } from '@/lib/supabase';
import type { UserDetails, UpdateUserDetails } from '@/types';

export const profileService = {
  // Get user details
  async getUserDetails(userId: string): Promise<UserDetails | null> {
    const { data, error } = await supabase
      .from('user_details')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - this is okay, user hasn't set up profile yet
        return null;
      }
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      displayName: data.display_name || undefined,
      phone: data.phone || undefined,
      userLogo: data.user_logo || undefined,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  },

  // Update user details (create if doesn't exist)
  async updateUserDetails(
    userId: string,
    details: UpdateUserDetails
  ): Promise<UserDetails> {
    const { data, error } = await supabase
      .from('user_details')
      .upsert({
        id: userId,
        display_name: details.displayName || null,
        phone: details.phone || null,
        user_logo: details.userLogo || null,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update user details');

    return {
      id: data.id,
      displayName: data.display_name || undefined,
      phone: data.phone || undefined,
      userLogo: data.user_logo || undefined,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  },

  // Upload user logo to storage
  async uploadUserLogo(userId: string, file: File): Promise<string> {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User must be authenticated to upload files');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL
    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Delete user logo from storage
  async deleteUserLogo(logoUrl: string): Promise<void> {
    // Extract file path from URL
    const url = new URL(logoUrl);
    const pathParts = url.pathname.split('/logos/');
    if (pathParts.length < 2) return;

    const filePath = pathParts[1];

    const { error } = await supabase.storage.from('logos').remove([filePath]);

    if (error) throw error;
  },
};
