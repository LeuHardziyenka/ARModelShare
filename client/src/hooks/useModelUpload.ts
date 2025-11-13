import { useState } from 'react';
import { uploadService } from '@/services/upload.service';
import { modelService } from '@/services/model.service';
import { validationService } from '@/services/validation.service';
import { analyticsService } from '@/services/analytics.service';
import { useToast } from '@/hooks/use-toast';
import type { Model, ValidationStage, UploadProgress } from '@/types';

export function useModelUpload(userId: string) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationStages, setValidationStages] = useState<ValidationStage[]>([]);
  const [uploadedModel, setUploadedModel] = useState<Model | null>(null);
  const { toast } = useToast();

  const uploadModel = async (file: File): Promise<Model | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setValidationStages([]);
      setUploadedModel(null);

      // Validate file
      const validation = uploadService.validateFile(file);
      if (!validation.valid) {
        toast({
          title: 'Invalid file',
          description: validation.error,
          variant: 'destructive',
        });
        return null;
      }

      // Upload to Firebase Storage
      const { url } = await uploadService.uploadModel(file, userId, (progress) => {
        setUploadProgress(progress.percent);
      });

      toast({
        title: 'Upload complete',
        description: 'Validating model...',
      });

      // Run validation
      const validationResult = await validationService.validateModel(file, (stages) => {
        setValidationStages(stages);
      });

      // Create model record in Firestore
      const model = await modelService.createModel({
        userId,
        filename: file.name,
        fileSize: file.size,
        modelUrl: url,
        validationStatus: validationResult.status,
        validationIssues: validationResult.issues,
      });

      // Log activity
      await analyticsService.logActivity(
        userId,
        'upload',
        `Uploaded ${file.name}`,
        { modelId: model.id, filename: file.name }
      );

      setUploadedModel(model);

      if (validationResult.status === 'ready') {
        toast({
          title: 'Model ready!',
          description: 'Your model is ready to share',
        });
      } else {
        toast({
          title: 'Validation issues',
          description: 'Your model uploaded but has compatibility issues',
          variant: 'destructive',
        });
      }

      return model;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload model',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setUploadProgress(0);
    setIsUploading(false);
    setValidationStages([]);
    setUploadedModel(null);
  };

  return {
    uploadModel,
    uploadProgress,
    isUploading,
    validationStages,
    uploadedModel,
    reset,
  };
}
