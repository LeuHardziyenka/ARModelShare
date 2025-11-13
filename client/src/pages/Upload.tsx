import { useState } from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploader } from '@/components/FileUploader';
import { ModelViewer } from '@/components/ModelViewer';
import type { Model, ValidationStage } from '@/types';

interface UploadProps {
  onUpload: (file: File) => Promise<void>;
  uploadProgress?: number;
  isUploading?: boolean;
  validationStages?: ValidationStage[];
  uploadedModel?: Model | null;
  onShare?: (model: Model) => void;
  onBack?: () => void;
}

export default function Upload({
  onUpload,
  uploadProgress = 0,
  isUploading = false,
  validationStages = [],
  uploadedModel = null,
  onShare,
  onBack,
}: UploadProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Upload Model</h1>
          <p className="text-muted-foreground mt-2">
            Upload your 3D model to share in augmented reality
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <FileUploader
            onUpload={onUpload}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
            validationStages={validationStages}
          />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadedModel ? (
                <div className="space-y-4">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <ModelViewer
                      modelUrl={uploadedModel.modelUrl}
                      alt={uploadedModel.filename}
                      className="w-full h-full"
                      autoRotate
                      ar
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Filename:</span>
                      <span className="font-mono">{uploadedModel.filename}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{(uploadedModel.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="capitalize">{uploadedModel.validationStatus}</span>
                    </div>
                  </div>

                  {uploadedModel.validationStatus === 'ready' && onShare && (
                    <Button
                      onClick={() => onShare(uploadedModel)}
                      className="w-full"
                      data-testid="button-share-model"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share This Model
                    </Button>
                  )}
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">Upload a model to preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
