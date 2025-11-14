import { api } from '@/lib/api';
import type { UserDetails, UpdateUserDetails } from '@/types';

export const profileService = {
  // Get user details
  async getUserDetails(userId: string): Promise<UserDetails | null> {
    try {
      return await api.get<UserDetails>('/api/profile');
    } catch (error) {
      return null;
    }
  },

  // Update user details (create if doesn't exist)
  async updateUserDetails(
    userId: string,
    details: UpdateUserDetails
  ): Promise<UserDetails> {
    return api.patch<UserDetails>('/api/profile', {
      displayName: details.displayName,
      phone: details.phone,
      userLogo: details.userLogo,
    });
  },

  // Upload user logo to storage
  async uploadUserLogo(userId: string, file: File): Promise<string> {
    const result = await api.upload<{ url: string }>('/api/profile/upload-logo', file);
    return result.url;
  },

  // Delete user logo from storage
  async deleteUserLogo(logoUrl: string): Promise<void> {
    await api.delete<void>('/api/profile/logo', { logoUrl });
  },
};
