import { useState } from 'react';
import { shareService } from '@/services/share.service';
import { qrService } from '@/services/qr.service';
import { analyticsService } from '@/services/analytics.service';
import { useToast } from '@/hooks/use-toast';
import type { Model, SharedLink, QROptions } from '@/types';

export function useShareLink(userId: string) {
  const [shareUrl, setShareUrl] = useState('');
  const [qrOptions, setQROptions] = useState<QROptions>(qrService.getDefaultOptions());
  const { toast } = useToast();

  const createShareLink = async (model: Model, expirationDays: number = 30): Promise<SharedLink | null> => {
    try {
      const expiresAt = Date.now() + (expirationDays * 24 * 60 * 60 * 1000);
      
      const link = await shareService.createShareLink({
        userId,
        modelId: model.id,
        modelUrl: model.modelUrl,
        modelName: model.filename,
        expiresAt,
        isActive: true,
        qrOptions,
      });

      const url = shareService.buildShareUrl(link.id);
      setShareUrl(url);

      // Log activity
      await analyticsService.logActivity(
        userId,
        'share',
        `Created share link for ${model.filename}`,
        { linkId: link.id, modelId: model.id }
      );

      toast({
        title: 'Share link created',
        description: 'Your model is now shareable',
      });

      return link;
    } catch (error: any) {
      console.error('Share link error:', error);
      toast({
        title: 'Failed to create share link',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const downloadQR = async (linkId: string, modelName: string) => {
    try {
      const qrElement = document.querySelector('[data-testid="qr-code"]') as HTMLElement;
      if (!qrElement) {
        throw new Error('QR code element not found');
      }

      const filename = `${modelName.replace(/[^a-zA-Z0-9]/g, '_')}_qr.png`;
      await qrService.downloadQRCode(qrElement, filename);

      toast({
        title: 'QR code downloaded',
        description: 'QR code saved successfully',
      });
    } catch (error: any) {
      console.error('QR download error:', error);
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  return {
    shareUrl,
    setShareUrl,
    qrOptions,
    setQROptions,
    createShareLink,
    downloadQR,
    copyLink,
  };
}
