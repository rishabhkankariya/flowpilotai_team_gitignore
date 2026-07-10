'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface DayBucket { date: string; count: number; }
interface ByDayResponse { days: number; buckets: DayBucket[]; }

export function useAnalyticsByDay(days: number) {
  const [data, setData] = useState<DayBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await api.get<ByDayResponse>(`/analytics/by-day?days=${days}`);
      setData(res.data.buckets);
    } catch { setError('Failed to load daily analytics'); }
    finally { setIsLoading(false); }
  }, [days]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, isLoading, error, refetch: fetch };
}
