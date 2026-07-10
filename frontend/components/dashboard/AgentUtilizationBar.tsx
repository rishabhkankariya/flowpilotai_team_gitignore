'use client';

import { useAnalyticsByAgent } from '@/hooks/useAnalyticsByAgent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const AGENT_COLORS: Record<string, string> = {
  sales: 'bg-blue-500',
  support: 'bg-green-500',
  finance: 'bg-purple-500',
  executive: 'bg-orange-500',
};

export function AgentUtilizationBar() {
  const { data, isLoading } = useAnalyticsByAgent();

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-primary" />
          Agent Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-7 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex h-28 items-center justify-center">
            <p className="text-xs text-muted-foreground">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((agent) => (
              <div key={agent.agent}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium capitalize">{agent.agent}</span>
                  <span className="text-muted-foreground">{agent.count}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      AGENT_COLORS[agent.agent] ?? 'bg-primary',
                    )}
                    style={{ width: `${(agent.count / maxCount) * 100}%` }}
                    role="progressbar"
                    aria-valuenow={agent.count}
                    aria-valuemax={maxCount}
                    aria-label={`${agent.agent} agent: ${agent.count} submissions`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
