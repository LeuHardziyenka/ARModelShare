import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Dashboard from './Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { modelService } from '@/services/model.service';
import { shareService } from '@/services/share.service';
import { analyticsService } from '@/services/analytics.service';
import { profileService } from '@/services/profile.service';
import { useShareLink } from '@/hooks/useShareLink';
import { ShareModal } from '@/components/ShareModal';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import type { Model } from '@/types';

export default function DashboardContainer() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [modelsPage, setModelsPage] = useState(1);
  const [linksPage, setLinksPage] = useState(1);
  const { shareUrl, qrOptions, setQROptions, createShareLink, downloadQR } = useShareLink(user?.uid || '');

  const modelsPerPage = 6;
  const linksPerPage = 10;

  // Fetch total counts for pagination
  const { data: totalModelsCount = 0 } = useQuery({
    queryKey: ['/api/models/count', user?.uid],
    queryFn: () => modelService.countUserModels(user!.uid),
    enabled: !!user,
  });

  const { data: totalLinksCount = 0 } = useQuery({
    queryKey: ['/api/shares/count', user?.uid],
    queryFn: async () => {
      const links = await shareService.getUserShareLinks(user!.uid);
      return links.length;
    },
    enabled: !!user,
  });

  // Fetch dashboard data with pagination
  const { data: recentModels = [] } = useQuery({
    queryKey: ['/api/models/recent', user?.uid, modelsPage],
    queryFn: () => modelService.getRecentModels(user!.uid, modelsPerPage, (modelsPage - 1) * modelsPerPage),
    enabled: !!user,
  });

  const { data: recentLinks = [] } = useQuery({
    queryKey: ['/api/shares/recent', user?.uid, linksPage],
    queryFn: () => shareService.getRecentShareLinks(user!.uid, linksPerPage, (linksPage - 1) * linksPerPage),
    enabled: !!user,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['/api/activity/recent', user?.uid],
    queryFn: () => analyticsService.getRecentActivity(user!.uid),
    enabled: !!user,
  });

  const { data: storageUsed = '0 MB' } = useQuery({
    queryKey: ['/api/storage/usage', user?.uid],
    queryFn: () => analyticsService.getStorageUsage(user!.uid),
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/stats', user?.uid],
    queryFn: async () => {
      const analyticsStats = await analyticsService.getStats(user!.uid);
      const storage = await analyticsService.getStorageUsage(user!.uid);
      return {
        totalModels: analyticsStats.totalModels,
        activeLinks: analyticsStats.activeLinks,
        totalScans: analyticsStats.totalScans,
        totalViews: analyticsStats.totalViews,
        totalModelsTrend: analyticsStats.totalModelsTrend,
        activeLinksTrend: analyticsStats.activeLinksTrend,
        totalScansTrend: analyticsStats.totalScansTrend,
        totalViewsTrend: analyticsStats.totalViewsTrend,
        storageUsed: storage,
      };
    },
    enabled: !!user,
  });

  // Fetch user details for profile logo
  const { data: userDetails } = useQuery({
    queryKey: ['/api/user-details', user?.uid],
    queryFn: () => profileService.getUserDetails(user!.uid),
    enabled: !!user,
  });

  // Delete model mutation
  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      console.log('[Dashboard] Starting model deletion:', modelId);
      // Inactivate all related share links first
      await shareService.inactivateModelLinks(modelId);
      console.log('[Dashboard] Inactivated share links for model:', modelId);
      // Then delete the model (which also deletes storage files)
      await modelService.deleteModel(modelId);
      console.log('[Dashboard] Successfully deleted model:', modelId);
      return modelId;
    },
    onSuccess: async (modelId) => {
      console.log('[Dashboard] Delete mutation success, logging activity...');

      // Log activity for the deletion FIRST, then invalidate
      if (user?.uid && modelToDelete) {
        try {
          console.log('[Dashboard] Calling logActivity with:', {
            userId: user.uid,
            type: 'delete',
            filename: modelToDelete.filename,
          });

          await analyticsService.logActivity(
            user.uid,
            'delete',
            `Deleted model "${modelToDelete.filename}"`,
            { modelId, filename: modelToDelete.filename }
          );

          console.log('[Dashboard] ✓ Activity logged successfully');
        } catch (error) {
          console.error('[Dashboard] ❌ Failed to log activity:', error);
        }
      } else {
        console.warn('[Dashboard] ⚠️ Cannot log activity - missing user or modelToDelete');
      }

      // Small delay to ensure activity is saved before invalidating
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[Dashboard] Invalidating all queries...');

      // Invalidate all related queries with specific keys
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/models/recent', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['/api/models/count', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['/api/shares/recent', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['/api/shares/count', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['/api/storage/usage', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['/api/activity/recent', user?.uid] }),
      ]);

      console.log('[Dashboard] ✓ All queries invalidated, UI should refresh now');

      toast({
        title: 'Model deleted',
        description: 'Model and all related links have been removed.',
      });
    },
    onError: (error: Error) => {
      console.error('[Dashboard] Delete mutation failed:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete model',
        variant: 'destructive',
      });
    },
  });

  const handleShareModel = async (model: Model) => {
    setSelectedModel(model);
    const link = await createShareLink(model);
    if (link) {
      setShowShareModal(true);
    }
  };

  const handleDeleteModel = (model: Model) => {
    setModelToDelete(model);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (modelToDelete) {
      await deleteModelMutation.mutateAsync(modelToDelete.id);
      setShowDeleteDialog(false);
      setModelToDelete(null);
      // Reset to first page if current page becomes empty
      const totalModels = totalModelsCount - 1;
      const maxPage = Math.ceil(totalModels / modelsPerPage);
      if (modelsPage > maxPage && maxPage > 0) {
        setModelsPage(maxPage);
      }
    }
  };

  const handleDownloadQR = async () => {
    if (selectedModel) {
      await downloadQR(selectedModel.id, selectedModel.filename);
    }
  };

  // Calculate total pages
  const totalModelsPages = Math.ceil(totalModelsCount / modelsPerPage);
  const totalLinksPages = Math.ceil(totalLinksCount / linksPerPage);

  return (
    <>
      <Dashboard
        stats={stats || {
          totalModels: 0,
          activeLinks: 0,
          totalScans: 0,
          totalViews: 0,
          storageUsed: '0 MB',
          totalModelsTrend: undefined,
          activeLinksTrend: undefined,
          totalScansTrend: undefined,
          totalViewsTrend: undefined,
        }}
        recentModels={recentModels}
        recentLinks={recentLinks}
        recentActivity={recentActivity}
        onShareModel={handleShareModel}
        onDeleteModel={handleDeleteModel}
        onUploadClick={() => setLocation('/upload')}
        modelsPage={modelsPage}
        totalModelsPages={totalModelsPages}
        onModelsPageChange={setModelsPage}
        linksPage={linksPage}
        totalLinksPages={totalLinksPages}
        onLinksPageChange={setLinksPage}
      />
      
      {selectedModel && (
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{modelToDelete?.filename}"?
              This will permanently remove the model and inactivate all related share links.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteModelMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteModelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteModelMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
