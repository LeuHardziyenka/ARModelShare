import JSZip from 'jszip';
import type { ValidationStage } from '@/types';

export const validationService = {
  // Validate uploaded 3D models for AR compatibility
  async validateModel(
    file: File,
    onStageUpdate?: (stages: ValidationStage[]) => void
  ): Promise<{ status: 'ready' | 'warning' | 'error'; issues: string[] }> {
    const stages: ValidationStage[] = [
      { stage: 'file-integrity', status: 'pending' },
      { stage: 'format-validation', status: 'pending' },
      { stage: 'ar-compatibility', status: 'pending' },
    ];

    const issues: string[] = [];

    // Stage 1: File Integrity
    stages[0].status = 'processing';
    onStageUpdate?.(stages);

    const integrityResult = await this.validateFileIntegrity(file);
    if (!integrityResult.valid) {
      stages[0].status = 'failed';
      stages[0].message = integrityResult.message;
      issues.push(integrityResult.message);
      onStageUpdate?.(stages);
      return { status: 'error', issues };
    }

    stages[0].status = 'passed';
    stages[0].message = 'File integrity verified';
    stages[1].status = 'processing';
    onStageUpdate?.(stages);

    // Stage 2: Format Validation
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (extension !== '.glb' && extension !== '.gltf' && extension !== '.zip') {
      stages[1].status = 'failed';
      stages[1].message = 'Unsupported file format. Use GLB, GLTF, or ZIP.';
      issues.push('File format not supported. AR viewers require GLB, GLTF, or ZIP with GLTF.');
      onStageUpdate?.(stages);
      return { status: 'error', issues };
    }

    const formatResult = await this.validateFormat(file, extension);
    if (!formatResult.valid) {
      stages[1].status = 'failed';
      stages[1].message = formatResult.message;
      issues.push(formatResult.message);
      onStageUpdate?.(stages);
      return { status: 'error', issues };
    }

    stages[1].status = 'passed';
    stages[1].message = formatResult.formatMessage || `Valid ${extension.toUpperCase()} format detected`;
    stages[2].status = 'processing';
    onStageUpdate?.(stages);

    // Stage 3: AR Compatibility
    const compatibilityResult = await this.validateARCompatibility(file, extension);

    if (compatibilityResult.warnings.length > 0) {
      issues.push(...compatibilityResult.warnings);
    }

    if (compatibilityResult.valid) {
      stages[2].status = 'passed';
      stages[2].message = compatibilityResult.message;
    } else {
      stages[2].status = 'failed';
      stages[2].message = compatibilityResult.message;
      issues.push(compatibilityResult.message);
    }

    onStageUpdate?.(stages);

    // Determine final status
    const allPassed = stages.every(s => s.status === 'passed');
    const hasCriticalFailure = stages.some(s => s.status === 'failed');

    return {
      status: allPassed ? 'ready' : hasCriticalFailure ? 'error' : 'warning',
      issues,
    };
  },

  // Validate file integrity (size, type)
  async validateFileIntegrity(file: File): Promise<{ valid: boolean; message: string }> {
    // Check file size (max 100MB for AR models)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const RECOMMENDED_SIZE = 10 * 1024 * 1024; // 10MB

    if (file.size === 0) {
      return { valid: false, message: 'File is empty' };
    }

    if (file.size > MAX_SIZE) {
      return { valid: false, message: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 100MB.` };
    }

    if (file.size > RECOMMENDED_SIZE) {
      // Warning but not failure
      console.warn(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds recommended 10MB for optimal AR performance`);
    }

    return { valid: true, message: 'File integrity verified' };
  },

  // Validate GLB, GLTF, or ZIP format structure
  async validateFormat(file: File, extension: string): Promise<{ valid: boolean; message: string; formatMessage?: string }> {
    try {
      if (extension === '.glb') {
        return await this.validateGLB(file);
      } else if (extension === '.gltf') {
        return await this.validateGLTF(file);
      } else if (extension === '.zip') {
        return await this.validateZIP(file);
      }
      return { valid: false, message: 'Unsupported format' };
    } catch (error) {
      return { valid: false, message: `Format validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },

  // Validate GLB binary format
  async validateGLB(file: File): Promise<{ valid: boolean; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            resolve({ valid: false, message: 'Failed to read file' });
            return;
          }

          const dataView = new DataView(arrayBuffer);

          // Check minimum size (12 bytes for header)
          if (arrayBuffer.byteLength < 12) {
            resolve({ valid: false, message: 'File too small to be valid GLB' });
            return;
          }

          // Check GLB magic number (0x46546C67 = "glTF" in ASCII)
          const magic = dataView.getUint32(0, true);
          if (magic !== 0x46546C67) {
            resolve({ valid: false, message: 'Invalid GLB file: incorrect magic number' });
            return;
          }

          // Check GLB version (should be 2)
          const version = dataView.getUint32(4, true);
          if (version !== 2) {
            resolve({ valid: false, message: `Unsupported GLB version: ${version}. Only version 2 supported.` });
            return;
          }

          // Check file length
          const length = dataView.getUint32(8, true);
          if (length !== arrayBuffer.byteLength) {
            resolve({ valid: false, message: 'GLB file length mismatch' });
            return;
          }

          resolve({ valid: true, message: 'Valid GLB format' });
        } catch (error) {
          resolve({ valid: false, message: `GLB parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      };

      reader.onerror = () => {
        resolve({ valid: false, message: 'Failed to read GLB file' });
      };

      reader.readAsArrayBuffer(file);
    });
  },

  // Validate GLTF JSON format
  async validateGLTF(file: File): Promise<{ valid: boolean; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) {
            resolve({ valid: false, message: 'Failed to read file' });
            return;
          }

          // Try to parse as JSON
          const gltf = JSON.parse(text);

          // Check for required GLTF properties
          if (!gltf.asset) {
            resolve({ valid: false, message: 'Missing required "asset" property' });
            return;
          }

          if (!gltf.asset.version) {
            resolve({ valid: false, message: 'Missing GLTF version' });
            return;
          }

          // Check version (2.0 is standard)
          const version = parseFloat(gltf.asset.version);
          if (version < 2.0) {
            resolve({ valid: false, message: `GLTF version ${gltf.asset.version} not supported. Use 2.0+` });
            return;
          }

          resolve({ valid: true, message: 'Valid GLTF format' });
        } catch (error) {
          if (error instanceof SyntaxError) {
            resolve({ valid: false, message: 'Invalid JSON format' });
          } else {
            resolve({ valid: false, message: `GLTF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` });
          }
        }
      };

      reader.onerror = () => {
        resolve({ valid: false, message: 'Failed to read GLTF file' });
      };

      reader.readAsText(file);
    });
  },

  // Validate ZIP file containing GLTF model
  async validateZIP(file: File): Promise<{ valid: boolean; message: string; formatMessage?: string }> {
    try {
      const zipContent = await JSZip.loadAsync(file);

      // Find GLTF file in the zip
      const gltfFiles = Object.keys(zipContent.files).filter(
        filename => filename.toLowerCase().endsWith('.gltf') && !zipContent.files[filename].dir
      );

      if (gltfFiles.length === 0) {
        return { valid: false, message: 'No GLTF file found in ZIP archive' };
      }

      if (gltfFiles.length > 1) {
        return {
          valid: false,
          message: `Multiple GLTF files found in ZIP (${gltfFiles.length}). ZIP should contain only one main GLTF file.`
        };
      }

      const gltfFilename = gltfFiles[0];
      const gltfFile = zipContent.files[gltfFilename];

      // Extract and parse GLTF JSON
      const gltfText = await gltfFile.async('text');
      let gltf: any;

      try {
        gltf = JSON.parse(gltfText);
      } catch (error) {
        return { valid: false, message: 'GLTF file in ZIP contains invalid JSON' };
      }

      // Check for required GLTF properties
      if (!gltf.asset) {
        return { valid: false, message: 'GLTF file missing required "asset" property' };
      }

      if (!gltf.asset.version) {
        return { valid: false, message: 'GLTF file missing version' };
      }

      const version = parseFloat(gltf.asset.version);
      if (version < 2.0) {
        return {
          valid: false,
          message: `GLTF version ${gltf.asset.version} not supported. Use 2.0+`
        };
      }

      // Validate that all referenced external resources exist in ZIP
      const missingResources: string[] = [];
      const gltfDir = gltfFilename.includes('/')
        ? gltfFilename.substring(0, gltfFilename.lastIndexOf('/') + 1)
        : '';

      // Check buffers
      if (gltf.buffers) {
        for (let i = 0; i < gltf.buffers.length; i++) {
          const buffer = gltf.buffers[i];
          if (buffer.uri && !buffer.uri.startsWith('data:')) {
            const resourcePath = this.resolveZipPath(gltfDir, buffer.uri);
            if (!zipContent.files[resourcePath]) {
              missingResources.push(`Buffer ${i}: ${buffer.uri}`);
            }
          }
        }
      }

      // Check images
      if (gltf.images) {
        for (let i = 0; i < gltf.images.length; i++) {
          const image = gltf.images[i];
          if (image.uri && !image.uri.startsWith('data:')) {
            const resourcePath = this.resolveZipPath(gltfDir, image.uri);
            if (!zipContent.files[resourcePath]) {
              missingResources.push(`Image ${i}: ${image.uri}`);
            }
          }
        }
      }

      if (missingResources.length > 0) {
        return {
          valid: false,
          message: `Missing referenced resources in ZIP: ${missingResources.join(', ')}`
        };
      }

      return {
        valid: true,
        message: 'Valid ZIP format',
        formatMessage: `Valid ZIP with GLTF (${gltfFilename})`
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('Corrupted zip')) {
        return { valid: false, message: 'Corrupted or invalid ZIP file' };
      }
      return {
        valid: false,
        message: `ZIP validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  // Helper to resolve relative paths in ZIP archives
  resolveZipPath(baseDir: string, relativePath: string): string {
    // Remove leading './' if present
    let path = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath;

    // Combine with base directory
    const fullPath = baseDir + path;

    // Normalize path (handle ../ references)
    const parts = fullPath.split('/').filter(p => p !== '.');
    const normalized: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        normalized.pop();
      } else if (part !== '') {
        normalized.push(part);
      }
    }

    return normalized.join('/');
  },

  // Validate AR compatibility
  async validateARCompatibility(
    file: File,
    extension: string
  ): Promise<{ valid: boolean; message: string; warnings: string[] }> {
    const warnings: string[] = [];

    try {
      // For GLB files, check structure
      if (extension === '.glb') {
        const result = await this.checkGLBStructure(file);
        warnings.push(...result.warnings);

        if (!result.valid) {
          return { valid: false, message: result.message, warnings };
        }
      }

      // For GLTF files, check JSON structure
      if (extension === '.gltf') {
        const result = await this.checkGLTFStructure(file);
        warnings.push(...result.warnings);

        if (!result.valid) {
          return { valid: false, message: result.message, warnings };
        }
      }

      // For ZIP files, check GLTF structure inside
      if (extension === '.zip') {
        const result = await this.checkZIPStructure(file);
        warnings.push(...result.warnings);

        if (!result.valid) {
          return { valid: false, message: result.message, warnings };
        }
      }

      // File size recommendations
      const OPTIMAL_SIZE = 5 * 1024 * 1024; // 5MB
      const WARNING_SIZE = 20 * 1024 * 1024; // 20MB

      if (file.size > WARNING_SIZE) {
        warnings.push(`Large file size (${(file.size / 1024 / 1024).toFixed(2)}MB) may cause performance issues on mobile AR devices`);
      } else if (file.size > OPTIMAL_SIZE) {
        warnings.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) is above optimal 5MB for best AR performance`);
      }

      const message = warnings.length > 0
        ? 'Model is compatible with warnings'
        : 'Model is fully AR-compatible';

      return { valid: true, message, warnings };
    } catch (error) {
      return {
        valid: false,
        message: `AR compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings
      };
    }
  },

  // Check GLB structure for AR compatibility
  async checkGLBStructure(file: File): Promise<{ valid: boolean; message: string; warnings: string[] }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const warnings: string[] = [];

      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            resolve({ valid: false, message: 'Failed to read file', warnings });
            return;
          }

          const dataView = new DataView(arrayBuffer);

          // Skip header (12 bytes)
          let offset = 12;

          // Check for JSON chunk (first chunk should be JSON)
          if (offset + 8 <= arrayBuffer.byteLength) {
            const chunkLength = dataView.getUint32(offset, true);
            const chunkType = dataView.getUint32(offset + 4, true);

            // 0x4E4F534A = "JSON" in ASCII
            if (chunkType !== 0x4E4F534A) {
              resolve({ valid: false, message: 'Invalid GLB structure: missing JSON chunk', warnings });
              return;
            }

            // Try to parse JSON chunk
            try {
              const jsonBytes = new Uint8Array(arrayBuffer, offset + 8, chunkLength);
              const jsonText = new TextDecoder().decode(jsonBytes);
              const gltf = JSON.parse(jsonText);

              // Check for scenes (required for AR)
              if (!gltf.scenes || gltf.scenes.length === 0) {
                warnings.push('No scenes defined. Some AR viewers may not display the model correctly.');
              }

              // Check for meshes
              if (!gltf.meshes || gltf.meshes.length === 0) {
                resolve({ valid: false, message: 'No meshes found in model', warnings });
                return;
              }

              // Check for materials
              if (!gltf.materials) {
                warnings.push('No materials defined. Model may appear without textures in AR viewers.');
              }

              // Check for animations
              if (gltf.animations && gltf.animations.length > 0) {
                warnings.push('Model contains animations. Ensure AR viewer supports animated models.');
              }

            } catch (error) {
              resolve({ valid: false, message: 'Failed to parse GLB JSON chunk', warnings });
              return;
            }
          }

          resolve({ valid: true, message: 'GLB structure valid', warnings });
        } catch (error) {
          resolve({ valid: false, message: `GLB structure check failed: ${error instanceof Error ? error.message : 'Unknown error'}`, warnings });
        }
      };

      reader.onerror = () => {
        resolve({ valid: false, message: 'Failed to read GLB file', warnings });
      };

      reader.readAsArrayBuffer(file);
    });
  },

  // Check GLTF structure for AR compatibility
  async checkGLTFStructure(file: File): Promise<{ valid: boolean; message: string; warnings: string[] }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const warnings: string[] = [];

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) {
            resolve({ valid: false, message: 'Failed to read file', warnings });
            return;
          }

          const gltf = JSON.parse(text);

          // Check for scenes
          if (!gltf.scenes || gltf.scenes.length === 0) {
            warnings.push('No scenes defined. Some AR viewers may not display the model correctly.');
          }

          // Check for meshes
          if (!gltf.meshes || gltf.meshes.length === 0) {
            resolve({ valid: false, message: 'No meshes found in model', warnings });
            return;
          }

          // Check for materials
          if (!gltf.materials) {
            warnings.push('No materials defined. Model may appear without textures in AR viewers.');
          }

          // Check for external resources
          if (gltf.buffers) {
            gltf.buffers.forEach((buffer: { uri?: string }, index: number) => {
              if (buffer.uri && !buffer.uri.startsWith('data:')) {
                warnings.push(`External buffer ${index} referenced. Ensure all resources are uploaded together.`);
              }
            });
          }

          if (gltf.images) {
            gltf.images.forEach((image: { uri?: string }, index: number) => {
              if (image.uri && !image.uri.startsWith('data:')) {
                warnings.push(`External image ${index} referenced. Ensure all textures are uploaded together.`);
              }
            });
          }

          // Check for animations
          if (gltf.animations && gltf.animations.length > 0) {
            warnings.push('Model contains animations. Ensure AR viewer supports animated models.');
          }

          resolve({ valid: true, message: 'GLTF structure valid', warnings });
        } catch (error) {
          resolve({ valid: false, message: `GLTF structure check failed: ${error instanceof Error ? error.message : 'Unknown error'}`, warnings });
        }
      };

      reader.onerror = () => {
        resolve({ valid: false, message: 'Failed to read GLTF file', warnings });
      };

      reader.readAsText(file);
    });
  },

  // Check ZIP structure for AR compatibility
  async checkZIPStructure(file: File): Promise<{ valid: boolean; message: string; warnings: string[] }> {
    const warnings: string[] = [];

    try {
      const zipContent = await JSZip.loadAsync(file);

      // Find the GLTF file
      const gltfFiles = Object.keys(zipContent.files).filter(
        filename => filename.toLowerCase().endsWith('.gltf') && !zipContent.files[filename].dir
      );

      if (gltfFiles.length === 0) {
        return { valid: false, message: 'No GLTF file found in ZIP', warnings };
      }

      const gltfFilename = gltfFiles[0];
      const gltfFile = zipContent.files[gltfFilename];

      // Extract and parse GLTF
      const gltfText = await gltfFile.async('text');
      const gltf = JSON.parse(gltfText);

      // Check for scenes
      if (!gltf.scenes || gltf.scenes.length === 0) {
        warnings.push('No scenes defined. Some AR viewers may not display the model correctly.');
      }

      // Check for meshes
      if (!gltf.meshes || gltf.meshes.length === 0) {
        return { valid: false, message: 'No meshes found in model', warnings };
      }

      // Check for materials
      if (!gltf.materials) {
        warnings.push('No materials defined. Model may appear without textures in AR viewers.');
      }

      // Verify all external resources exist in ZIP
      const gltfDir = gltfFilename.includes('/')
        ? gltfFilename.substring(0, gltfFilename.lastIndexOf('/') + 1)
        : '';

      // Check buffers exist
      if (gltf.buffers) {
        for (let i = 0; i < gltf.buffers.length; i++) {
          const buffer = gltf.buffers[i];
          if (buffer.uri && !buffer.uri.startsWith('data:')) {
            const resourcePath = this.resolveZipPath(gltfDir, buffer.uri);
            if (!zipContent.files[resourcePath]) {
              warnings.push(`Referenced buffer not found in ZIP: ${buffer.uri}`);
            } else {
              // Verify buffer exists (size check would require extracting, which is expensive)
              // Just confirming presence is sufficient for validation
            }
          }
        }
      }

      // Check images exist
      if (gltf.images) {
        for (let i = 0; i < gltf.images.length; i++) {
          const image = gltf.images[i];
          if (image.uri && !image.uri.startsWith('data:')) {
            const resourcePath = this.resolveZipPath(gltfDir, image.uri);
            if (!zipContent.files[resourcePath]) {
              warnings.push(`Referenced texture not found in ZIP: ${image.uri}`);
            }
          }
        }
      }

      // Check for animations
      if (gltf.animations && gltf.animations.length > 0) {
        warnings.push('Model contains animations. Ensure AR viewer supports animated models.');
      }

      // Check for extensions
      if (gltf.extensionsRequired && gltf.extensionsRequired.length > 0) {
        warnings.push(`Model requires extensions: ${gltf.extensionsRequired.join(', ')}. Ensure AR viewer supports these.`);
      }

      // Count total files in ZIP
      const fileCount = Object.keys(zipContent.files).filter(f => !zipContent.files[f].dir).length;
      if (fileCount > 50) {
        warnings.push(`ZIP contains ${fileCount} files. Large file counts may slow loading.`);
      }

      return { valid: true, message: 'ZIP structure valid for AR', warnings };

    } catch (error) {
      return {
        valid: false,
        message: `ZIP structure check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings
      };
    }
  },

  // Helper to simulate async delays
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
