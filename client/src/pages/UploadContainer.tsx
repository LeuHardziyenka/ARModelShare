import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import Upload from './Upload';
import { ShareModal } from '@/components/ShareModal';
import { useAuth } from '@/hooks/useAuth';
import { useModelUpload } from '@/hooks/useModelUpload';
import { useShareLink } from '@/hooks/useShareLink';
import { profileService } from '@/services/profile.service';
import type { Model } from '@/types';

export default function UploadContainer() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { uploadModel, uploadProgress, isUploading, validationStages, uploadedModel } = 
    useModelUpload(user?.uid || '');
  const { shareUrl, qrOptions, setQROptions, createShareLink, downloadQR } =
    useShareLink(user?.uid || '');
  const [showShareModal, setShowShareModal] = useState(false);

  // Fetch user details for profile logo
  const { data: userDetails } = useQuery({
    queryKey: ['/api/user-details', user?.uid],
    queryFn: () => profileService.getUserDetails(user!.uid),
    enabled: !!user,
  });

  const handleUpload = async (file: File) => {
    const model = await uploadModel(file);
    if (model) {
      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/models/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
    }
  };

  const handleShare = async (model: Model) => {
    const link = await createShareLink(model);
    if (link) {
      setShowShareModal(true);
      queryClient.invalidateQueries({ queryKey: ['/api/shares'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    }
  };

  const handleDownloadQR = async () => {
    if (uploadedModel) {
      await downloadQR(uploadedModel.id, uploadedModel.filename);
    }
  };

  return (
    <>
      <Upload
        onUpload={handleUpload}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        validationStages={validationStages}
        uploadedModel={uploadedModel}
        onShare={handleShare}
        onBack={() => setLocation('/dashboard')}
      />
      
      {uploadedModel && (
        <ShareModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          shareUrl={shareUrl}
          qrOptions={qrOptions}
          onQROptionsChange={setQROptions}
          onDownloadQR={handleDownloadQR}
          userId={user?.uid}
          userLogoUrl={userDetails?.userLogo}
        />
      )}
    </>
  );
}
