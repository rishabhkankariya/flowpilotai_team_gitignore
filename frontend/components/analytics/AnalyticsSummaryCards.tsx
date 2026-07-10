'use client';

import { Inbox, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

export function AnalyticsSummaryCards() {
  const { data, isLoading, error, refetch } = useAnalytics();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total Submissions" value={data?.total_submissions ?? 0} icon={Inbox} isLoading={isLoading} colorClass="text-blue-500" />
      <MetricCard label="Completed" value={data?.completed ?? 0} icon={CheckCircle2} isLoading={isLoading} colorClass="text-green-500" />
      <MetricCard label="Failed" value={data?.failed ?? 0} icon={XCircle} isLoading={isLoading} colorClass="text-red-500" />
      <MetricCard label="Avg Confidence" value={data?.avg_confidence ?? 0} icon={TrendingUp} format="percent" isLoading={isLoading} colorClass="text-purple-500" />
    </div>
  );
}
