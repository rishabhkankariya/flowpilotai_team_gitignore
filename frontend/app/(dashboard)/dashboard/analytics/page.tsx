'use client';

import { useState } from 'react';
import { AnalyticsSummaryCards } from '@/components/analytics/AnalyticsSummaryCards';
import { AgentDistributionChart } from '@/components/analytics/AgentDistributionChart';
import { DailyActivityChart } from '@/components/analytics/DailyActivityChart';

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into your AI workflow performance.
        </p>
      </div>
      <AnalyticsSummaryCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <AgentDistributionChart />
        <DailyActivityChart days={days} onDaysChange={setDays} />
      </div>
    </div>
  );
}
