import { supabase } from '@/lib/supabase';
import { uploadService } from './upload.service';
import type { Model, InsertModel } from '@/types';

export const modelService = {
  // Create a new model record
  async createModel(data: InsertModel): Promise<Model> {
    // Map camelCase to snake_case for database
    const modelData = {
      user_id: data.userId,
      filename: data.filename,
      file_size: data.fileSize,
      model_url: data.modelUrl,
      validation_status: data.validationStatus,
      validation_issues: data.validationIssues || [],
      uploaded_at: Date.now(),
    };

    const { data: insertedData, error } = await supabase
      .from('models')
      .insert([modelData])
      .select()
      .single();

    if (error) throw new Error(`Failed to create model: ${error.message}`);

    return {
      id: insertedData.id,
      userId: insertedData.user_id,
      filename: insertedData.filename,
      fileSize: insertedData.file_size,
      modelUrl: insertedData.model_url,
      validationStatus: insertedData.validation_status,
      validationIssues: insertedData.validation_issues,
      uploadedAt: insertedData.uploaded_at,
    };
  },

  // Get model by ID
  async getModel(id: string): Promise<Model | null> {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      filename: data.filename,
      fileSize: data.file_size,
      modelUrl: data.model_url,
      validationStatus: data.validation_status,
      validationIssues: data.validation_issues,
      uploadedAt: data.uploaded_at,
    };
  },

  // Get all models for a user
  async getUserModels(userId: string): Promise<Model[]> {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) throw new Error(`Failed to get user models: ${error.message}`);

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      filename: item.filename,
      fileSize: item.file_size,
      modelUrl: item.model_url,
      validationStatus: item.validation_status,
      validationIssues: item.validation_issues,
      uploadedAt: item.uploaded_at,
    }));
  },

  // Get recent models for a user with pagination
  async getRecentModels(
    userId: string,
    limitCount: number = 6,
    offset: number = 0
  ): Promise<Model[]> {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limitCount - 1);

    if (error) throw new Error(`Failed to get recent models: ${error.message}`);

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      filename: item.filename,
      fileSize: item.file_size,
      modelUrl: item.model_url,
      validationStatus: item.validation_status,
      validationIssues: item.validation_issues,
      uploadedAt: item.uploaded_at,
    }));
  },

  // Update model
  async updateModel(id: string, data: Partial<Model>): Promise<void> {
    const updateData: any = {};
    if (data.filename !== undefined) updateData.filename = data.filename;
    if (data.fileSize !== undefined) updateData.file_size = data.fileSize;
    if (data.modelUrl !== undefined) updateData.model_url = data.modelUrl;
    if (data.validationStatus !== undefined) updateData.validation_status = data.validationStatus;
    if (data.validationIssues !== undefined) updateData.validation_issues = data.validationIssues;

    const { error } = await supabase
      .from('models')
      .update(updateData)
      .eq('id', id);

    if (error) throw new Error(`Failed to update model: ${error.message}`);
  },

  // Delete model
  async deleteModel(id: string): Promise<void> {
    // First, get the model to retrieve the storage URL
    const model = await this.getModel(id);

    if (!model) {
      throw new Error('Model not found');
    }

    // Delete from database first
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete model: ${error.message}`);

    // Then delete storage files
    try {
      await uploadService.deleteModelFiles(model.modelUrl);
    } catch (error: any) {
      console.error('Failed to delete storage files:', error);
      // Don't throw here - the database record is already deleted
      // Just log the error
    }
  },

  // Count user models
  async countUserModels(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('models')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to count models: ${error.message}`);
    return count || 0;
  },
};
