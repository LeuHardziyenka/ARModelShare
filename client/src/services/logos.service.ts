import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { UserLogo, InsertUserLogo } from '@/types';

export const logosService = {
  // Get all logos for a user
  async getUserLogos(userId: string): Promise<UserLogo[]> {
    return api.get<UserLogo[]>('/api/logos');
  },

  // Get a single logo
  async getLogo(logoId: string): Promise<UserLogo | null> {
    try {
      return await api.get<UserLogo>(`/api/logos/${logoId}`);
    } catch (error) {
      return null;
    }
  },

  // Create a new logo
  async createLogo(logo: InsertUserLogo): Promise<UserLogo> {
    return api.post<UserLogo>('/api/logos', {
      name: logo.name,
      logoUrl: logo.logoUrl,
    });
  },

  // Update a logo
  async updateLogo(logoId: string, updates: Partial<InsertUserLogo>): Promise<UserLogo> {
    return api.patch<UserLogo>(`/api/logos/${logoId}`, {
      name: updates.name,
      logoUrl: updates.logoUrl,
    });
  },

  // Delete a logo
  async deleteLogo(logoId: string): Promise<void> {
    const result = await api.delete<{ message: string; logoUrl: string }>(`/api/logos/${logoId}`);

    // Delete storage file if we have the URL
    if (result.logoUrl) {
      try {
        await this.deleteLogoFile(result.logoUrl);
      } catch (error: any) {
        console.error('Failed to delete storage file:', error);
      }
    }
  },

  // Upload logo file to storage
  async uploadLogoFile(userId: string, file: File): Promise<string> {
    const result = await api.upload<{ url: string }>('/api/logos/upload', file);
    return result.url;
  },

  // Delete logo file from storage
  async deleteLogoFile(logoUrl: string): Promise<void> {
    await api.delete<void>('/api/logos/storage', { logoUrl });
  },
};
