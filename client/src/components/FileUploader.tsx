import { useCallback, useState } from 'react';
import { Upload, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ValidationStage } from '@/types';

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onProgress?: (progress: number) => void;
  uploadProgress?: number;
  validationStages?: ValidationStage[];
  isUploading?: boolean;
}

export function FileUploader({
  onUpload,
  onProgress,
  uploadProgress = 0,
  validationStages = [],
  isUploading = false,
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const validateFile = (file: File): string | null => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['.glb', '.gltf', '.zip'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(extension)) {
      return 'Only .glb, .gltf, and .zip files are supported';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 100MB';
    }

    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    setError('');
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    await onUpload(file);
  }, [onUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const getStageIcon = (stage: ValidationStage) => {
    switch (stage.status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'file-integrity': 'File Integrity',
      'format-validation': 'Format Validation',
      'ar-compatibility': 'AR Compatibility',
    };
    return labels[stage] || stage;
  };

  return (
    <div className="space-y-6">
      <div
        className={`
          relative min-h-64 border-2 border-dashed rounded-xl
          transition-all duration-200
          ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
          ${isUploading ? 'pointer-events-none opacity-60' : 'hover-elevate'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        data-testid="drop-zone"
      >
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="mb-4">
            {isUploading ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : selectedFile && !error ? (
              <File className="h-16 w-16 text-primary" />
            ) : (
              <Upload className="h-16 w-16 text-muted-foreground" />
            )}
          </div>

          <h3 className="text-lg font-semibold mb-2">
            {isUploading ? 'Uploading...' : 'Upload 3D Model'}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {selectedFile && !error
              ? selectedFile.name
              : 'Drag and drop your .glb, .gltf, or .zip file here, or click to browse'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!isUploading && (
            <div>
              <input
                type="file"
                accept=".glb,.gltf,.zip"
                onChange={handleChange}
                className="hidden"
                id="file-upload"
                data-testid="input-file"
              />
              <label htmlFor="file-upload">
                <Button asChild>
                  <span data-testid="button-browse">Browse Files</span>
                </Button>
              </label>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            Maximum file size: 100MB
          </p>
        </div>
      </div>

      {isUploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Upload Progress</span>
            <span className="font-medium">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" data-testid="upload-progress" />
        </div>
      )}

      {validationStages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Validation Status</h4>
          <div className="space-y-2">
            {validationStages.map((stage) => (
              <div
                key={stage.stage}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-card-border"
                data-testid={`validation-${stage.stage}`}
              >
                {getStageIcon(stage)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{getStageLabel(stage.stage)}</p>
                  {stage.message && (
                    <p className="text-xs text-muted-foreground mt-1">{stage.message}</p>
                  )}
                </div>
                <Badge
                  variant={
                    stage.status === 'passed' ? 'default' :
                    stage.status === 'failed' ? 'destructive' :
                    'secondary'
                  }
                  className="text-xs"
                >
                  {stage.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
