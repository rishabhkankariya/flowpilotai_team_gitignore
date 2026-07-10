'use client';

import { useEffect, useRef, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  format?: 'number' | 'percent';
  colorClass?: string;
  isLoading?: boolean;
}

function useCountUp(target: number, duration = 600): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  format = 'number',
  colorClass = 'text-primary',
  isLoading = false,
}: MetricCardProps) {
  const animated = useCountUp(isLoading ? 0 : value);

  const displayValue =
    format === 'percent'
      ? `${(isLoading ? 0 : value * 100).toFixed(1)}%`
      : animated.toLocaleString();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                'bg-primary/10',
              )}
            >
              <Icon className={cn('h-5 w-5', colorClass)} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
