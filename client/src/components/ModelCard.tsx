import { useState } from 'react';
import { MoreVertical, Share2, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModelViewer } from './ModelViewer';
import type { Model } from '@/types';

interface ModelCardProps {
  model: Model;
  onShare?: (model: Model) => void;
  onView?: (model: Model) => void;
  onDelete?: (model: Model) => void;
}

export function ModelCard({ model, onShare, onView, onDelete }: ModelCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = () => {
    switch (model.validationStatus) {
      case 'ready':
        return <Badge variant="default" className="text-xs">Ready</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="text-xs">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`model-card-${model.id}`}>
      <div className="aspect-square bg-muted relative overflow-hidden rounded-t-lg">
        {!imageError ? (
          <ModelViewer
            modelUrl={model.modelUrl}
            alt={model.filename}
            className="w-full h-full"
            autoRotate
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Eye className="h-12 w-12" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate text-base" title={model.filename}>
              {model.filename}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(model.fileSize)}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-testid={`button-model-menu-${model.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(model)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(model)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(model)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(model.uploadedAt)}
          </span>
          {getStatusBadge()}
        </div>
      </CardContent>
    </Card>
  );
}
