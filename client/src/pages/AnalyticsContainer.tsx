import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Analytics from './Analytics';
import { useAuth } from '@/hooks/useAuth';
import { analyticsService } from '@/services/analytics.service';

export default function AnalyticsContainer() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const defaultStats = {
    totalModels: 0,
    activeLinks: 0,
    totalScans: 0,
    totalViews: 0,
  };

  // Convert time period to days
  const days = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : 90;

  const { data: stats = defaultStats } = useQuery({
    queryKey: ['/api/analytics/stats', user?.uid],
    queryFn: async () => {
      const analyticsStats = await analyticsService.getStats(user!.uid);
      const storage = await analyticsService.getStorageUsage(user!.uid);
      return {
        ...analyticsStats,
        storageUsed: storage,
      };
    },
    enabled: !!user,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['/api/analytics/chart', user?.uid, timePeriod],
    queryFn: () => analyticsService.getChartData(user!.uid, days),
    enabled: !!user,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['/api/activity/recent', user?.uid],
    queryFn: () => analyticsService.getRecentActivity(user!.uid, 20),
    enabled: !!user,
  });

  return (
    <Analytics
      stats={stats}
      chartData={chartData}
      recentEvents={recentEvents}
      timePeriod={timePeriod}
      onTimePeriodChange={setTimePeriod}
    />
  );
}
