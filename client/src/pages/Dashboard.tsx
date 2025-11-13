import { Box, Share2, Database, Scan } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ModelCard } from '@/components/ModelCard';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { Model, SharedLink, ActivityEvent, AnalyticsStats } from '@/types';

interface DashboardProps {
  stats: AnalyticsStats & {
    storageUsed: string;
  };
  recentModels: Model[];
  recentLinks: SharedLink[];
  recentActivity: ActivityEvent[];
  onShareModel?: (model: Model) => void;
  onViewModel?: (model: Model) => void;
  onDeleteModel?: (model: Model) => void;
  onUploadClick?: () => void;
  modelsPage?: number;
  totalModelsPages?: number;
  onModelsPageChange?: (page: number) => void;
  linksPage?: number;
  totalLinksPages?: number;
  onLinksPageChange?: (page: number) => void;
}

export default function Dashboard({
  stats,
  recentModels = [],
  recentLinks = [],
  recentActivity = [],
  onShareModel,
  onViewModel,
  onDeleteModel,
  onUploadClick,
  modelsPage = 1,
  totalModelsPages = 1,
  onModelsPageChange,
  linksPage = 1,
  totalLinksPages = 1,
  onLinksPageChange,
}: DashboardProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your 3D models and shared links
          </p>
        </div>
        {onUploadClick && (
          <Button onClick={onUploadClick} data-testid="button-upload-new">
            <Box className="h-4 w-4 mr-2" />
            Upload Model
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Models"
          value={stats.totalModels}
          icon={Box}
          trend={stats.totalModelsTrend}
        />
        <StatCard
          title="Active Links"
          value={stats.activeLinks}
          icon={Share2}
          trend={stats.activeLinksTrend}
        />
        <StatCard
          title="QR Scans"
          value={stats.totalScans}
          icon={Scan}
          trend={stats.totalScansTrend}
        />
        <StatCard
          title="Storage Used"
          value={stats.storageUsed}
          icon={Database}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">My Models</h2>
            {recentModels.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-card-border">
                <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No models yet</p>
                {onUploadClick && (
                  <Button onClick={onUploadClick} variant="outline">
                    Upload Your First Model
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {recentModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onShare={onShareModel}
                      onView={onViewModel}
                      onDelete={onDeleteModel}
                    />
                  ))}
                </div>

                {totalModelsPages > 1 && onModelsPageChange && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => modelsPage > 1 && onModelsPageChange(modelsPage - 1)}
                            className={modelsPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalModelsPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => onModelsPageChange(page)}
                              isActive={page === modelsPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => modelsPage < totalModelsPages && onModelsPageChange(modelsPage + 1)}
                            className={modelsPage >= totalModelsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Shared Links</h2>
            {recentLinks.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-lg border border-card-border">
                <p className="text-sm text-muted-foreground">No shared links yet</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {recentLinks.map((link) => (
                    <div
                      key={link.id}
                      className="p-4 bg-card rounded-lg border border-card-border flex items-center justify-between hover-elevate"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.modelName}</p>
                        <p className="text-sm text-muted-foreground">
                          {link.scans} scans · {link.views} views
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {link.isActive ? 'Active' : 'Expired'}
                      </div>
                    </div>
                  ))}
                </div>

                {totalLinksPages > 1 && onLinksPageChange && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => linksPage > 1 && onLinksPageChange(linksPage - 1)}
                            className={linksPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalLinksPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => onLinksPageChange(page)}
                              isActive={page === linksPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => linksPage < totalLinksPages && onLinksPageChange(linksPage + 1)}
                            className={linksPage >= totalLinksPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <ActivityTimeline events={recentActivity} />
        </div>
      </div>
    </div>
  );
}
