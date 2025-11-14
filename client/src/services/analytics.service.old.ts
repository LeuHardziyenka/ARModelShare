import { supabase } from '@/lib/supabase';
import { modelService } from './model.service';
import { shareService } from './share.service';
import type { AnalyticsStats, ActivityEvent, MonthlyStats, StatTrend } from '@/types';

export const analyticsService = {
  // Get previous month's stats
  async getPreviousMonthStats(userId: string): Promise<MonthlyStats | null> {
    const now = new Date();
    let prevMonth = now.getMonth(); // 0-11
    let prevYear = now.getFullYear();

    // If current month is January (0), previous month is December of last year
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const { data, error } = await supabase
      .from('monthly_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      month: data.month,
      year: data.year,
      totalModels: data.total_models,
      activeLinks: data.active_links,
      totalScans: data.total_scans,
      totalViews: data.total_views,
      createdAt: new Date(data.created_at).getTime(),
    };
  },

  // Save current month's stats snapshot
  async saveMonthlySnapshot(userId: string, stats: {
    totalModels: number;
    activeLinks: number;
    totalScans: number;
    totalViews: number;
  }): Promise<void> {
    const { error } = await supabase.rpc('save_monthly_stats_snapshot', {
      p_user_id: userId,
      p_total_models: stats.totalModels,
      p_active_links: stats.activeLinks,
      p_total_scans: stats.totalScans,
      p_total_views: stats.totalViews,
    });

    if (error) {
      console.error('Failed to save monthly snapshot:', error);
    }
  },

  // Calculate trend
  calculateTrend(current: number, previous: number | null): StatTrend | undefined {
    if (previous === null) {
      return {
        value: 0,
        isPositive: true,
        message: 'This is first month, no comparison for now',
      };
    }

    if (previous === 0) {
      // Avoid division by zero
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

  // Get analytics stats for a user with trends
  async getStats(userId: string): Promise<AnalyticsStats> {
    const [totalModels, activeLinks, shareLinks, prevMonthStats] = await Promise.all([
      modelService.countUserModels(userId),
      shareService.countActiveLinks(userId),
      shareService.getUserShareLinks(userId),
      this.getPreviousMonthStats(userId),
    ]);

    const totalScans = shareLinks.reduce((sum: number, link) => sum + link.scans, 0);
    const totalViews = shareLinks.reduce((sum: number, link) => sum + link.views, 0);

    // Save current month's snapshot (upsert)
    await this.saveMonthlySnapshot(userId, {
      totalModels,
      activeLinks,
      totalScans,
      totalViews,
    });

    // Calculate trends
    const stats: AnalyticsStats = {
      totalModels,
      activeLinks,
      totalScans,
      totalViews,
      totalModelsTrend: this.calculateTrend(totalModels, prevMonthStats?.totalModels ?? null),
      activeLinksTrend: this.calculateTrend(activeLinks, prevMonthStats?.activeLinks ?? null),
      totalScansTrend: this.calculateTrend(totalScans, prevMonthStats?.totalScans ?? null),
      totalViewsTrend: this.calculateTrend(totalViews, prevMonthStats?.totalViews ?? null),
    };

    return stats;
  },

  // Log activity event
  async logActivity(
    userId: string,
    type: ActivityEvent['type'],
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event = {
      user_id: userId,
      type,
      description,
      timestamp: Date.now(),
      metadata: metadata || {},
    };

    const { error } = await supabase
      .from('activity')
      .insert([event]);

    if (error) throw new Error(`Failed to log activity: ${error.message}`);
  },

  // Get recent activity for a user
  async getRecentActivity(userId: string, limitCount: number = 10): Promise<ActivityEvent[]> {
    const { data, error } = await supabase
      .from('activity')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limitCount);

    if (error) throw new Error(`Failed to get recent activity: ${error.message}`);

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      type: item.type,
      description: item.description,
      timestamp: item.timestamp,
      metadata: item.metadata,
    }));
  },

  // Generate chart data for analytics
  async getChartData(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; uploads: number; shares: number; views: number }>> {
    const events = await this.getRecentActivity(userId, 1000);
    const now = Date.now();
    const startDate = now - (days * 24 * 60 * 60 * 1000);

    // Filter events within date range
    const filteredEvents = events.filter(e => e.timestamp >= startDate);

    // Group by date
    const dataMap = new Map<string, { uploads: number; shares: number; views: number }>();

    for (let i = 0; i < days; i++) {
      const date = new Date(now - (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap.set(dateKey, { uploads: 0, shares: 0, views: 0 });
    }

    filteredEvents.forEach(event => {
      const dateKey = new Date(event.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const data = dataMap.get(dateKey);
      if (data) {
        if (event.type === 'upload') data.uploads++;
        if (event.type === 'share') data.shares++;
        if (event.type === 'view') data.views++;
      }
    });

    return Array.from(dataMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .reverse();
  },

  // Calculate storage usage (simplified)
  async getStorageUsage(userId: string): Promise<string> {
    const models = await modelService.getUserModels(userId);
    const totalBytes = models.reduce((sum, model) => sum + model.fileSize, 0);
    
    const gb = totalBytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    
    const mb = totalBytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  },
};
