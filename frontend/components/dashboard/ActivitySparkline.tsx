'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useAnalyticsByDay } from '@/hooks/useAnalyticsByDay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function ActivitySparkline() {
  const { data, isLoading } = useAnalyticsByDay(7);

  const total = data.reduce((acc, b) => acc + b.count, 0);
  const allZero = total === 0;

  const chartData = data.map((b) => ({
    date: new Date(b.date).toLocaleDateString('en-US', { weekday: 'short' }),
    count: b.count,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          7-Day Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 animate-pulse rounded bg-muted" />
        ) : allZero ? (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-muted-foreground">
              Start submitting to see trends
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-2xl font-bold">{total} <span className="text-sm font-normal text-muted-foreground">submissions</span></p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ borderRadius: '6px', fontSize: '12px' }}
                  formatter={(v: number) => [v, 'Submissions']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#sparkGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
