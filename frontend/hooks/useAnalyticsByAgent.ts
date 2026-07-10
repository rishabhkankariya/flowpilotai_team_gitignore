'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface AgentBreakdown {
  agent: string;
  count: number;
  avg_confidence: number;
  completed: number;
  failed: number;
}

interface ByAgentResponse { agents: AgentBreakdown[]; }

export function useAnalyticsByAgent() {
  const [data, setData] = useState<AgentBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await api.get<ByAgentResponse>('/analytics/by-agent');
      setData(res.data.agents);
    } catch { setError('Failed to load agent analytics'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, isLoading, error, refetch: fetch };
}
