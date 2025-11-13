import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import ShareManager from './ShareManager';
import { useAuth } from '@/hooks/useAuth';
import { useShareLink } from '@/hooks/useShareLink';
import { shareService } from '@/services/share.service';
import { profileService } from '@/services/profile.service';
import { useToast } from '@/hooks/use-toast';
import { ShareModal } from '@/components/ShareModal';
import type { SharedLink } from '@/types';

export default function ShareManagerContainer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { copyLink, downloadQR, qrOptions, setQROptions } = useShareLink(user?.uid || '');
  const { toast } = useToast();
  const [selectedLink, setSelectedLink] = useState<SharedLink | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const { data: links = [] } = useQuery({
    queryKey: ['/api/shares', user?.uid],
    queryFn: () => shareService.getUserShareLinks(user!.uid),
    enabled: !!user,
  });

  // Fetch user details for profile logo
  const { data: userDetails } = useQuery({
    queryKey: ['/api/user-details', user?.uid],
    queryFn: () => profileService.getUserDetails(user!.uid),
    enabled: !!user,
  });

  const handleExtend = async (link: SharedLink) => {
    try {
      await shareService.extendExpiration(link.id, 30);
      // Invalidate all share-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/shares'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shares/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shares/count'] });
      toast({
        title: 'Link extended',
        description: 'Expiration date extended by 30 days',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to extend link',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRevoke = async (link: SharedLink) => {
    try {
      await shareService.revokeShareLink(link.id);
      // Invalidate all share-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/shares'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shares/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shares/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
      toast({
        title: 'Link revoked',
        description: 'Share link has been deactivated',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to revoke link',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpen = (link: SharedLink) => {
    const url = shareService.buildShareUrl(link.id);
    window.open(url, '_blank');
  };

  const handleGenerateQR = (link: SharedLink) => {
    setSelectedLink(link);
    setShowQRModal(true);
  };

  const handleDownloadQR = async () => {
    if (selectedLink) {
      await downloadQR(selectedLink.id, selectedLink.modelName);
    }
  };

  return (
    <>
      <ShareManager
        links={links}
        onExtend={handleExtend}
        onRevoke={handleRevoke}
        onCopy={copyLink}
        onGenerateQR={handleGenerateQR}
        onOpen={handleOpen}
      />

      {selectedLink && (
        <ShareModal
          open={showQRModal}
          onOpenChange={setShowQRModal}
          shareUrl={shareService.buildShareUrl(selectedLink.id)}
          qrOptions={qrOptions}
          onQROptionsChange={setQROptions}
          onDownloadQR={handleDownloadQR}
          userId={user?.uid}
          userLogoUrl={userDetails?.userLogo}
          defaultTab="qr"
        />
      )}
    </>
  );
}
