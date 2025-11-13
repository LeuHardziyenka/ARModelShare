import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import type { UploadProgress } from '@/types';

export const uploadService = {
  // Upload model file to Supabase Storage
  async uploadModel(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; path: string; files?: string[] }> {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const timestamp = Date.now();

    // Handle ZIP files (GLTF with assets)
    if (extension === '.zip') {
      return this.uploadZipModel(file, userId, timestamp, onProgress);
    }

    // Handle single GLB/GLTF files
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${userId}/${timestamp}_${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('models')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('models')
      .getPublicUrl(path);

    // Simulate progress for now (Supabase doesn't provide upload progress out of the box)
    if (onProgress) {
      onProgress({
        percent: 100,
        bytesUploaded: file.size,
        totalBytes: file.size,
      });
    }

    return { url: publicUrl, path };
  },

  // Upload ZIP file containing GLTF model with assets
  async uploadZipModel(
    file: File,
    userId: string,
    timestamp: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; path: string; files: string[] }> {
    try {
      // Extract ZIP contents
      const zip = await JSZip.loadAsync(file);

      // Find the main GLTF file
      let gltfFileName: string | null = null;
      const files = Object.keys(zip.files);

      for (const fileName of files) {
        if (fileName.toLowerCase().endsWith('.gltf')) {
          gltfFileName = fileName;
          break;
        }
      }

      if (!gltfFileName) {
        throw new Error('No .gltf file found in the ZIP archive');
      }

      // Create a folder for this model
      const modelFolderName = file.name.replace('.zip', '').replace(/[^a-zA-Z0-9.-]/g, '_');
      const basePath = `${userId}/${timestamp}_${modelFolderName}`;

      // Upload all files from ZIP
      const uploadPromises: Promise<any>[] = [];
      const uploadedFiles: string[] = [];
      let completedUploads = 0;
      const totalFiles = files.length;

      for (const fileName of files) {
        const zipEntry = zip.files[fileName];

        // Skip directories
        if (zipEntry.dir) continue;

        // Get file content as blob
        const blob = await zipEntry.async('blob');
        const filePath = `${basePath}/${fileName}`;

        // Upload to Supabase Storage
        const uploadPromise = supabase.storage
          .from('models')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: this.getContentType(fileName),
          })
          .then(() => {
            completedUploads++;
            uploadedFiles.push(filePath);

            // Update progress
            if (onProgress) {
              onProgress({
                percent: Math.round((completedUploads / totalFiles) * 100),
                bytesUploaded: completedUploads,
                totalBytes: totalFiles,
              });
            }
          });

        uploadPromises.push(uploadPromise);
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Get public URL for the main GLTF file
      const mainGltfPath = `${basePath}/${gltfFileName}`;
      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(mainGltfPath);

      return {
        url: publicUrl,
        path: mainGltfPath,
        files: uploadedFiles
      };

    } catch (error: any) {
      throw new Error(`Failed to process ZIP file: ${error.message}`);
    }
  },

  // Get content type based on file extension
  getContentType(fileName: string): string {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const contentTypes: Record<string, string> = {
      '.gltf': 'model/gltf+json',
      '.bin': 'application/octet-stream',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.ktx2': 'image/ktx2',
    };
    return contentTypes[extension] || 'application/octet-stream';
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

  // Extract storage path from public URL
  // Converts: https://[project].supabase.co/storage/v1/object/public/models/[path]
  // To: [path]
  extractPathFromUrl(publicUrl: string): string {
    const pathMatch = publicUrl.match(/\/models\/(.+)$/);
    if (!pathMatch) {
      throw new Error('Invalid model URL format');
    }
    return pathMatch[1];
  },

  // Delete model files from storage
  // For single files (GLB), deletes the file
  // For GLTF models (from ZIP), deletes the entire folder
  // modelPathOrUrl can be either a storage path or a public URL
  async deleteModelFiles(modelPathOrUrl: string): Promise<void> {
    // Extract path from URL if needed
    const modelPath = modelPathOrUrl.includes('supabase.co')
      ? this.extractPathFromUrl(modelPathOrUrl)
      : modelPathOrUrl;
    try {
      // Check if this is a GLTF model (path contains a folder structure)
      // GLTF paths look like: userId/timestamp_foldername/model.gltf
      // GLB paths look like: userId/timestamp_filename.glb
      const pathParts = modelPath.split('/');

      if (pathParts.length > 2) {
        // This is a GLTF model with a folder structure
        // Extract the folder path (userId/timestamp_foldername)
        const folderPath = pathParts.slice(0, -1).join('/');

        // List all files in the folder
        const { data: files, error: listError } = await supabase.storage
          .from('models')
          .list(folderPath);

        if (listError) {
          console.error('Failed to list folder files:', listError);
          throw new Error(`Failed to list files: ${listError.message}`);
        }

        if (files && files.length > 0) {
          // Delete all files in the folder
          const filePaths = files.map(file => `${folderPath}/${file.name}`);
          const { error: deleteError } = await supabase.storage
            .from('models')
            .remove(filePaths);

          if (deleteError) {
            console.error('Failed to delete folder files:', deleteError);
            throw new Error(`Failed to delete files: ${deleteError.message}`);
          }
        }
      } else {
        // This is a single file (GLB)
        const { error } = await supabase.storage
          .from('models')
          .remove([modelPath]);

        if (error) {
          console.error('Failed to delete file:', error);
          throw new Error(`Failed to delete file: ${error.message}`);
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to delete model files: ${error.message}`);
    }
  },
};
