'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAnalyticsByAgent } from '@/hooks/useAnalyticsByAgent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AGENT_COLORS: Record<string, string> = {
  sales: '#3b82f6',
  support: '#22c55e',
  finance: '#a855f7',
  executive: '#f97316',
};

export function AgentDistributionChart() {
  const { data, isLoading, error, refetch } = useAnalyticsByAgent();

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Agent Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Agent Distribution</CardTitle></CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    name: d.agent.charAt(0).toUpperCase() + d.agent.slice(1),
    value: d.count,
    color: AGENT_COLORS[d.agent] ?? '#94a3b8',
  }));

  return (
    <Card>
      <CardHeader><CardTitle>Agent Distribution</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-sm">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
