import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { StatTrend } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: StatTrend;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {trend && (
              <p className={`text-xs ${trend.message ? 'text-muted-foreground' : trend.isPositive ? 'text-green-600' : 'text-destructive'}`}>
                {trend.message ? trend.message : `${trend.isPositive ? '+' : '-'}${trend.value}% from last month`}
              </p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
