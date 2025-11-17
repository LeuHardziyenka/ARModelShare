import type { Express } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

export function registerAnalyticsRoutes(app: Express) {
  // Get analytics stats for a user
  app.get('/api/analytics/stats', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get current stats
      const [modelsResult, activeLinksResult, shareLinksResult, prevMonthResult] = await Promise.all([
        // Total models count
        supabase
          .from('models')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),

        // Active links count
        supabase
          .from('shared_links')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true)
          .gt('expires_at', Date.now()),

        // All share links for scans/views
        supabase
          .from('shared_links')
          .select('views, scans')
          .eq('user_id', userId),

        // Previous month stats
        (async () => {
          const now = new Date();
          let prevMonth = now.getMonth();
          let prevYear = now.getFullYear();

          if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
          }

          return supabase
            .from('monthly_stats')
            .select('*')
            .eq('user_id', userId)
            .eq('month', prevMonth)
            .eq('year', prevYear)
            .single();
        })()
      ]);

      const totalModels = modelsResult.count || 0;
      const activeLinks = activeLinksResult.count || 0;
      const shareLinks = shareLinksResult.data || [];
      const prevMonthData = prevMonthResult.data;

      const totalScans = shareLinks.reduce((sum, link) => sum + (link.scans || 0), 0);
      const totalViews = shareLinks.reduce((sum, link) => sum + (link.views || 0), 0);

      // Save monthly snapshot
      await supabase.rpc('save_monthly_stats_snapshot', {
        p_user_id: userId,
        p_total_models: totalModels,
        p_active_links: activeLinks,
        p_total_scans: totalScans,
        p_total_views: totalViews,
      });

      // Calculate trends
      const calculateTrend = (current: number, previous: number | null) => {
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
      };

      const stats = {
        totalModels,
        activeLinks,
        totalScans,
        totalViews,
        totalModelsTrend: calculateTrend(totalModels, prevMonthData?.total_models ?? null),
        activeLinksTrend: calculateTrend(activeLinks, prevMonthData?.active_links ?? null),
        totalScansTrend: calculateTrend(totalScans, prevMonthData?.total_scans ?? null),
        totalViewsTrend: calculateTrend(totalViews, prevMonthData?.total_views ?? null),
      };

      return res.json(stats);
    } catch (error: any) {
      console.error('Get stats error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get recent activity for a user
  app.get('/api/analytics/activity', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        return res.status(400).json({ message: `Failed to get activity: ${error.message}` });
      }

      const events = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        description: item.description,
        timestamp: item.timestamp,
        metadata: item.metadata,
      }));

      return res.json(events);
    } catch (error: any) {
      console.error('Get activity error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Log activity event
  app.post('/api/analytics/log', requireAuth, async (req, res) => {
    try {
      const { type, description, metadata } = req.body;
      const userId = req.user!.id;

      console.log(`[Activity Log] Logging activity - User: ${userId}, Type: ${type}, Description: ${description}`);

      const event = {
        user_id: userId,
        type,
        description,
        timestamp: Date.now(),
        metadata: metadata || {},
      };

      const { data, error } = await supabase
        .from('activity')
        .insert([event])
        .select();

      if (error) {
        console.error(`[Activity Log] ❌ Failed to insert activity - Type: ${type}, Error:`, error);
        return res.status(400).json({ message: `Failed to log activity: ${error.message}` });
      }

      console.log(`[Activity Log] ✓ Successfully logged activity - ID: ${data[0]?.id}, Type: ${type}`);
      return res.json({ message: 'Activity logged successfully', id: data[0]?.id });
    } catch (error: any) {
      console.error('[Activity Log] Unexpected error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get chart data for analytics
  app.get('/api/analytics/chart-data', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 30;

      // Get activity events
      const { data: events } = await supabase
        .from('activity')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1000);

      const now = Date.now();
      const startDate = now - (days * 24 * 60 * 60 * 1000);

      // Filter events within date range
      const filteredEvents = (events || []).filter(e => e.timestamp >= startDate);

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

      const chartData = Array.from(dataMap.entries())
        .map(([date, values]) => ({ date, ...values }))
        .reverse();

      return res.json(chartData);
    } catch (error: any) {
      console.error('Get chart data error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get storage usage
  app.get('/api/analytics/storage', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const { data: models } = await supabase
        .from('models')
        .select('file_size')
        .eq('user_id', userId);

      const totalBytes = (models || []).reduce((sum, model) => sum + model.file_size, 0);

      const gb = totalBytes / (1024 * 1024 * 1024);
      let usage: string;

      if (gb >= 1) {
        usage = `${gb.toFixed(2)} GB`;
      } else {
        const mb = totalBytes / (1024 * 1024);
        usage = `${mb.toFixed(1)} MB`;
      }

      return res.json({ usage, totalBytes });
    } catch (error: any) {
      console.error('Get storage usage error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}
