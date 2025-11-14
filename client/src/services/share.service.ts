import { api } from '@/lib/api';
import type { SharedLink, InsertSharedLink } from '@/types';

export const shareService = {
  // Create a new shared link
  async createShareLink(data: InsertSharedLink): Promise<SharedLink> {
    return api.post<SharedLink>('/api/share', {
      modelId: data.modelId,
      modelName: data.modelName,
      modelUrl: data.modelUrl,
      isActive: data.isActive,
      expiresAt: data.expiresAt,
      qrOptions: data.qrOptions,
    });
  },

  // Get shared link by ID
  async getShareLink(id: string): Promise<SharedLink | null> {
    try {
      return await api.get<SharedLink>(`/api/share/${id}`);
    } catch (error) {
      return null;
    }
  },

  // Get all shared links for a user
  async getUserShareLinks(userId: string): Promise<SharedLink[]> {
    return api.get<SharedLink[]>('/api/share');
  },

  // Get recent shared links for a user with pagination
  async getRecentShareLinks(
    userId: string,
    limitCount: number = 10,
    offset: number = 0
  ): Promise<SharedLink[]> {
    return api.get<SharedLink[]>(`/api/share?limit=${limitCount}&offset=${offset}`);
  },

  // Update shared link
  async updateShareLink(id: string, data: Partial<SharedLink>): Promise<void> {
    await api.patch<void>(`/api/share/${id}`, {
      isActive: data.isActive,
      expiresAt: data.expiresAt,
      views: data.views,
      scans: data.scans,
    });
  },

  // Revoke a shared link
  async revokeShareLink(id: string): Promise<void> {
    await api.post<void>(`/api/share/${id}/revoke`);
  },

  // Extend expiration
  async extendExpiration(id: string, days: number = 30): Promise<void> {
    await api.post<void>(`/api/share/${id}/extend`, { days });
  },

  // Increment view count
  async incrementViews(id: string): Promise<void> {
    await api.post<void>(`/api/share/${id}/increment-views`);
  },

  // Increment scan count
  async incrementScans(id: string): Promise<void> {
    await api.post<void>(`/api/share/${id}/increment-scans`);
  },

  // Count active links for user
  async countActiveLinks(userId: string): Promise<number> {
    const result = await api.get<{ count: number }>('/api/share/count/active');
    return result.count;
  },

  // Inactivate all share links for a model
  async inactivateModelLinks(modelId: string): Promise<void> {
    await api.post<void>(`/api/share/inactivate-model/${modelId}`);
  },

  // Build share URL
  buildShareUrl(linkId: string): string {
    return `${window.location.origin}/ar?id=${linkId}`;
  },
};
