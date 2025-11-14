import type { Express } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';
import JSZip from 'jszip';

const upload = multer({ storage: multer.memoryStorage() });

export function registerUploadRoutes(app: Express) {
  // Upload model file to Supabase Storage
  app.post('/api/upload/model', requireAuth, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      // Validate file size (100MB max)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({ message: 'File size must be less than 100MB' });
      }

      // Validate file extension
      const allowedExtensions = ['.glb', '.gltf', '.zip'];
      const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

      if (!allowedExtensions.includes(extension)) {
        return res.status(400).json({ message: 'Only .glb, .gltf, and .zip files are supported' });
      }

      const timestamp = Date.now();

      // Handle ZIP files (GLTF with assets)
      if (extension === '.zip') {
        const result = await uploadZipModel(file, userId, timestamp);
        return res.json(result);
      }

      // Handle single GLB/GLTF files
      const fileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${userId}/${timestamp}_${fileName}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('models')
        .upload(path, file.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.mimetype,
        });

      if (error) {
        return res.status(400).json({ message: `Upload failed: ${error.message}` });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('models')
        .getPublicUrl(path);

      return res.json({
        url: publicUrl,
        path,
        size: file.size
      });
    } catch (error: any) {
      console.error('Upload model error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete model files from storage
  app.delete('/api/upload/model', requireAuth, async (req, res) => {
    try {
      const { modelPathOrUrl } = req.body;

      if (!modelPathOrUrl) {
        return res.status(400).json({ message: 'Model path or URL is required' });
      }

      // Extract path from URL if needed
      const modelPath = modelPathOrUrl.includes('supabase.co')
        ? extractPathFromUrl(modelPathOrUrl)
        : modelPathOrUrl;

      // Check if this is a GLTF model with folder structure
      const pathParts = modelPath.split('/');

      if (pathParts.length > 2) {
        // GLTF model with folder structure - delete entire folder
        const folderPath = pathParts.slice(0, -1).join('/');

        const { data: files, error: listError } = await supabase.storage
          .from('models')
          .list(folderPath);

        if (listError) {
          return res.status(400).json({ message: `Failed to list files: ${listError.message}` });
        }

        if (files && files.length > 0) {
          const filePaths = files.map(file => `${folderPath}/${file.name}`);
          const { error: deleteError } = await supabase.storage
            .from('models')
            .remove(filePaths);

          if (deleteError) {
            return res.status(400).json({ message: `Failed to delete files: ${deleteError.message}` });
          }
        }
      } else {
        // Single file (GLB)
        const { error } = await supabase.storage
          .from('models')
          .remove([modelPath]);

        if (error) {
          return res.status(400).json({ message: `Failed to delete file: ${error.message}` });
        }
      }

      return res.json({ message: 'Model files deleted successfully' });
    } catch (error: any) {
      console.error('Delete model files error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}

// Helper function to upload ZIP file containing GLTF model with assets
async function uploadZipModel(
  file: Express.Multer.File,
  userId: string,
  timestamp: number
): Promise<{ url: string; path: string; files: string[] }> {
  try {
    // Extract ZIP contents
    const zip = await JSZip.loadAsync(file.buffer);

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
    const modelFolderName = file.originalname.replace('.zip', '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const basePath = `${userId}/${timestamp}_${modelFolderName}`;

    // Upload all files from ZIP
    const uploadedFiles: string[] = [];

    for (const fileName of files) {
      const zipEntry = zip.files[fileName];

      // Skip directories
      if (zipEntry.dir) continue;

      // Get file content as buffer
      const buffer = await zipEntry.async('nodebuffer');
      const filePath = `${basePath}/${fileName}`;

      // Upload to Supabase Storage
      await supabase.storage
        .from('models')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: getContentType(fileName),
        });

      uploadedFiles.push(filePath);
    }

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
}

// Helper function to get content type based on file extension
function getContentType(fileName: string): string {
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
}

// Helper function to extract storage path from public URL
function extractPathFromUrl(publicUrl: string): string {
  const pathMatch = publicUrl.match(/\/models\/(.+)$/);
  if (!pathMatch) {
    throw new Error('Invalid model URL format');
  }
  return pathMatch[1];
}
