import { Upload, Share2, Eye, Scan } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityEvent } from '@/types';

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'share':
        return <Share2 className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'scan':
        return <Scan className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="flex gap-4 relative"
              data-testid={`activity-${event.type}-${index}`}
            >
              {index !== events.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
              )}
              
              <div className="relative z-10 p-2 bg-primary/10 rounded-lg h-fit">
                {getEventIcon(event.type)}
              </div>
              
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium">{event.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(event.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
