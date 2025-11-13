import { useState } from 'react';
import { Copy, Check, Share2, Code } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeGenerator } from './QRCodeGenerator';
import { useToast } from '@/hooks/use-toast';
import type { QROptions } from '@/types';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  qrOptions: QROptions;
  onQROptionsChange: (options: QROptions) => void;
  onDownloadQR: () => void;
  userId?: string;
  userLogoUrl?: string;
  defaultTab?: 'link' | 'qr' | 'embed';
}

export function ShareModal({
  open,
  onOpenChange,
  shareUrl,
  qrOptions,
  onQROptionsChange,
  onDownloadQR,
  userId,
  userLogoUrl,
  defaultTab = 'link',
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const embedCode = `<iframe src="${shareUrl}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="share-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Model
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link" data-testid="tab-link">Direct Link</TabsTrigger>
            <TabsTrigger value="qr" data-testid="tab-qr">QR Code</TabsTrigger>
            <TabsTrigger value="embed" data-testid="tab-embed">Embed</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-link">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-share-link"
                />
                <Button
                  onClick={() => copyToClipboard(shareUrl)}
                  variant="outline"
                  data-testid="button-copy-link"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view your 3D model in AR
              </p>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="pt-6">
            <QRCodeGenerator
              value={shareUrl}
              options={qrOptions}
              onOptionsChange={onQROptionsChange}
              onDownload={onDownloadQR}
              userId={userId}
              userLogoUrl={userLogoUrl}
            />
          </TabsContent>

          <TabsContent value="embed" className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embed-code">Embed Code</Label>
              <div className="relative">
                <Textarea
                  id="embed-code"
                  value={embedCode}
                  readOnly
                  className="font-mono text-sm min-h-24"
                  data-testid="textarea-embed-code"
                />
                <Button
                  onClick={() => copyToClipboard(embedCode)}
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  data-testid="button-copy-embed"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Copy and paste this code into your website to embed the 3D viewer
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Code className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Embed Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Adjust width and height as needed</li>
                    <li>The viewer is fully responsive</li>
                    <li>AR mode works on mobile devices</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
