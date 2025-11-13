import { BarChart3, Box, Share2, Scan, Eye } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { AnalyticsStats, ActivityEvent } from '@/types';

interface AnalyticsProps {
  stats: AnalyticsStats;
  chartData?: Array<{ date: string; uploads: number; shares: number; views: number }>;
  recentEvents?: ActivityEvent[];
  timePeriod: '7d' | '30d' | '90d';
  onTimePeriodChange: (period: '7d' | '30d' | '90d') => void;
}

export default function Analytics({
  stats,
  chartData = [],
  recentEvents = [],
  timePeriod,
  onTimePeriodChange,
}: AnalyticsProps) {

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeLabel = (type: ActivityEvent['type']): string => {
    const labels: Record<ActivityEvent['type'], string> = {
      upload: 'Model Upload',
      share: 'Link Created',
      view: 'Model Viewed',
      scan: 'QR Code Scanned',
    };
    return labels[type];
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your models' performance and engagement
        </p>
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
          title="Total Views"
          value={stats.totalViews}
          icon={Eye}
          trend={stats.totalViewsTrend}
        />
        <StatCard
          title="QR Scans"
          value={stats.totalScans}
          icon={Scan}
          trend={stats.totalScansTrend}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activity Over Time
            </CardTitle>
            <Tabs value={timePeriod} onValueChange={(v) => onTimePeriodChange(v as '7d' | '30d' | '90d')}>
              <TabsList>
                <TabsTrigger value="7d" data-testid="tab-7d">7 Days</TabsTrigger>
                <TabsTrigger value="30d" data-testid="tab-30d">30 Days</TabsTrigger>
                <TabsTrigger value="90d" data-testid="tab-90d">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <p>No activity data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  stroke="hsl(var(--chart-1))"
                  fillOpacity={1}
                  fill="url(#colorUploads)"
                  name="Uploads"
                />
                <Area
                  type="monotone"
                  dataKey="shares"
                  stroke="hsl(var(--chart-2))"
                  fillOpacity={1}
                  fill="url(#colorShares)"
                  name="Shares"
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--chart-3))"
                  fillOpacity={1}
                  fill="url(#colorViews)"
                  name="Views"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent events
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`event-${index}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getEventTypeLabel(event.type)} · {formatDate(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
