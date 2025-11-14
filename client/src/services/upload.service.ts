import { api } from '@/lib/api';
import type { UploadProgress } from '@/types';

export const uploadService = {
  // Upload model file to backend
  async uploadModel(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; path: string; files?: string[] }> {
    // Simulate progress for now
    if (onProgress) {
      onProgress({
        percent: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
      });
    }

    const result = await api.upload<{ url: string; path: string; files?: string[]; size: number }>(
      '/api/upload/model',
      file
    );

    if (onProgress) {
      onProgress({
        percent: 100,
        bytesUploaded: file.size,
        totalBytes: file.size,
      });
    }

    return {
      url: result.url,
      path: result.path,
      files: result.files,
    };
  },

  // Validate file before upload
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedExtensions = ['.glb', '.gltf', '.zip'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(extension)) {
      return { valid: false, error: 'Only .glb, .gltf, and .zip files are supported' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 100MB' };
    }

    return { valid: true };
  },

  // Delete model files from storage
  async deleteModelFiles(modelPathOrUrl: string): Promise<void> {
    await api.delete<void>('/api/upload/model', { modelPathOrUrl });
  },

  // Get content type based on file extension (client-side helper)
  getContentType(fileName: string): string {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const contentTypes: Record<string, string> = {
      '.gltf': 'model/gltf+json',
      '.glb': 'model/gltf-binary',
      '.bin': 'application/octet-stream',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.ktx2': 'image/ktx2',
    };
    return contentTypes[extension] || 'application/octet-stream';
  },

  // Extract storage path from public URL (client-side helper)
  extractPathFromUrl(publicUrl: string): string {
    const pathMatch = publicUrl.match(/\/models\/(.+)$/);
    if (!pathMatch) {
      throw new Error('Invalid model URL format');
    }
    return pathMatch[1];
  },
};
