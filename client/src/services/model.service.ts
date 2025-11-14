import { api } from '@/lib/api';
import { uploadService } from './upload.service';
import type { Model, InsertModel } from '@/types';

export const modelService = {
  // Create a new model record
  async createModel(data: InsertModel): Promise<Model> {
    return api.post<Model>('/api/models', {
      filename: data.filename,
      fileSize: data.fileSize,
      modelUrl: data.modelUrl,
      validationStatus: data.validationStatus,
      validationIssues: data.validationIssues || [],
    });
  },

  // Get model by ID
  async getModel(id: string): Promise<Model | null> {
    try {
      return await api.get<Model>(`/api/models/${id}`);
    } catch (error) {
      return null;
    }
  },

  // Get all models for a user
  async getUserModels(userId: string): Promise<Model[]> {
    return api.get<Model[]>('/api/models');
  },

  // Get recent models for a user with pagination
  async getRecentModels(
    userId: string,
    limitCount: number = 6,
    offset: number = 0
  ): Promise<Model[]> {
    return api.get<Model[]>(`/api/models/recent?limit=${limitCount}&offset=${offset}`);
  },

  // Update model
  async updateModel(id: string, data: Partial<Model>): Promise<void> {
    await api.patch<void>(`/api/models/${id}`, {
      filename: data.filename,
      fileSize: data.fileSize,
      modelUrl: data.modelUrl,
      validationStatus: data.validationStatus,
      validationIssues: data.validationIssues,
    });
  },

  // Delete model
  async deleteModel(id: string): Promise<void> {
    const result = await api.delete<{ message: string; modelUrl: string }>(`/api/models/${id}`);

    // Delete storage files if we have the URL
    if (result.modelUrl) {
      try {
        await uploadService.deleteModelFiles(result.modelUrl);
      } catch (error: any) {
        console.error('Failed to delete storage files:', error);
        // Don't throw here - the database record is already deleted
      }
    }
  },

  // Count user models
  async countUserModels(userId: string): Promise<number> {
    const result = await api.get<{ count: number }>('/api/models/count');
    return result.count;
  },
};
