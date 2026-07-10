'use client';

import {
  Inbox,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCcw,
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';

export function MetricsRow() {
  const { data, isLoading, error, refetch } = useAnalytics();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Submissions',
      value: data?.total_submissions ?? 0,
      icon: Inbox,
      colorClass: 'text-blue-500',
    },
    {
      label: 'Completed',
      value: data?.completed ?? 0,
      icon: CheckCircle2,
      colorClass: 'text-green-500',
    },
    {
      label: 'Failed',
      value: data?.failed ?? 0,
      icon: XCircle,
      colorClass: 'text-red-500',
    },
    {
      label: 'Avg Confidence',
      value: data?.avg_confidence ?? 0,
      icon: TrendingUp,
      format: 'percent' as const,
      colorClass: 'text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} isLoading={isLoading} />
      ))}
    </div>
  );
}
