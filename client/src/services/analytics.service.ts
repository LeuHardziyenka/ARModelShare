import { api } from '@/lib/api';
import type { AnalyticsStats, ActivityEvent, StatTrend } from '@/types';

export const analyticsService = {
  // Get analytics stats for a user with trends
  async getStats(userId: string): Promise<AnalyticsStats> {
    return api.get<AnalyticsStats>('/api/analytics/stats');
  },

  // Get recent activity for a user
  async getRecentActivity(userId: string, limitCount: number = 10): Promise<ActivityEvent[]> {
    return api.get<ActivityEvent[]>(`/api/analytics/activity?limit=${limitCount}`);
  },

  // Log activity event
  async logActivity(
    userId: string,
    type: ActivityEvent['type'],
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await api.post<void>('/api/analytics/log', {
      type,
      description,
      metadata: metadata || {},
    });
  },

  // Generate chart data for analytics
  async getChartData(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; uploads: number; shares: number; views: number }>> {
    return api.get(`/api/analytics/chart-data?days=${days}`);
  },

  // Calculate storage usage
  async getStorageUsage(userId: string): Promise<string> {
    const result = await api.get<{ usage: string }>('/api/analytics/storage');
    return result.usage;
  },

  // Calculate trend (kept for backwards compatibility)
  calculateTrend(current: number, previous: number | null): StatTrend | undefined {
    if (previous === null) {
      return {
        value: 0,
        isPositive: true,
        message: 'This is first month, no comparison for now',
      };
    }

    if (previous === 0) {
      return {
        value: current > 0 ? 100 : 0,
        isPositive: current > 0,
      };
    }

    const percentChange = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(percentChange)),
      isPositive: percentChange >= 0,
    };
  },
};
