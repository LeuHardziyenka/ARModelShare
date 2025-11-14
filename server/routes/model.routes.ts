import type { Express } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

export function registerModelRoutes(app: Express) {
  // Create a new model record
  app.post('/api/models', requireAuth, async (req, res) => {
    try {
      const { filename, fileSize, modelUrl, validationStatus, validationIssues } = req.body;
      const userId = req.user!.id;

      const modelData = {
        user_id: userId,
        filename,
        file_size: fileSize,
        model_url: modelUrl,
        validation_status: validationStatus,
        validation_issues: validationIssues || [],
        uploaded_at: Date.now(),
      };

      const { data, error } = await supabase
        .from('models')
        .insert([modelData])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: `Failed to create model: ${error.message}` });
      }

      return res.json({
        id: data.id,
        userId: data.user_id,
        filename: data.filename,
        fileSize: data.file_size,
        modelUrl: data.model_url,
        validationStatus: data.validation_status,
        validationIssues: data.validation_issues,
        uploadedAt: data.uploaded_at,
      });
    } catch (error: any) {
      console.error('Create model error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get model by ID
  app.get('/api/models/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: 'Model not found' });
      }

      return res.json({
        id: data.id,
        userId: data.user_id,
        filename: data.filename,
        fileSize: data.file_size,
        modelUrl: data.model_url,
        validationStatus: data.validation_status,
        validationIssues: data.validation_issues,
        uploadedAt: data.uploaded_at,
      });
    } catch (error: any) {
      console.error('Get model error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all models for a user
  app.get('/api/models', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        return res.status(400).json({ message: `Failed to get models: ${error.message}` });
      }

      const models = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        filename: item.filename,
        fileSize: item.file_size,
        modelUrl: item.model_url,
        validationStatus: item.validation_status,
        validationIssues: item.validation_issues,
        uploadedAt: item.uploaded_at,
      }));

      return res.json(models);
    } catch (error: any) {
      console.error('Get models error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get recent models with pagination
  app.get('/api/models/recent', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 6;
      const offset = parseInt(req.query.offset as string) || 0;

      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return res.status(400).json({ message: `Failed to get models: ${error.message}` });
      }

      const models = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        filename: item.filename,
        fileSize: item.file_size,
        modelUrl: item.model_url,
        validationStatus: item.validation_status,
        validationIssues: item.validation_issues,
        uploadedAt: item.uploaded_at,
      }));

      return res.json(models);
    } catch (error: any) {
      console.error('Get recent models error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update model
  app.patch('/api/models/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      // Verify ownership
      const { data: existing } = await supabase
        .from('models')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const updateData: any = {};
      if (updates.filename !== undefined) updateData.filename = updates.filename;
      if (updates.fileSize !== undefined) updateData.file_size = updates.fileSize;
      if (updates.modelUrl !== undefined) updateData.model_url = updates.modelUrl;
      if (updates.validationStatus !== undefined) updateData.validation_status = updates.validationStatus;
      if (updates.validationIssues !== undefined) updateData.validation_issues = updates.validationIssues;

      const { error } = await supabase
        .from('models')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return res.status(400).json({ message: `Failed to update model: ${error.message}` });
      }

      return res.json({ message: 'Model updated successfully' });
    } catch (error: any) {
      console.error('Update model error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete model
  app.delete('/api/models/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Get model to verify ownership and get storage URL
      const { data: model, error: fetchError } = await supabase
        .from('models')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !model) {
        return res.status(404).json({ message: 'Model not found' });
      }

      if (model.user_id !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Delete from database
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ message: `Failed to delete model: ${error.message}` });
      }

      // Return model URL for frontend to handle storage deletion
      return res.json({
        message: 'Model deleted successfully',
        modelUrl: model.model_url
      });
    } catch (error: any) {
      console.error('Delete model error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Count user models
  app.get('/api/models/count', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const { count, error } = await supabase
        .from('models')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        return res.status(400).json({ message: `Failed to count models: ${error.message}` });
      }

      return res.json({ count: count || 0 });
    } catch (error: any) {
      console.error('Count models error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}
