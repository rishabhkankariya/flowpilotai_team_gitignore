'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface AnalyticsSummary {
  total_submissions: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  avg_confidence: number;
  by_agent: Record<string, number>;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<AnalyticsSummary>('/analytics/summary');
      setData(res.data);
    } catch {
      setError('Failed to load analytics summary');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
