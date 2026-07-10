'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { InboxSubmission, PaginatedResponse } from '@/types';

interface UseSubmissionHistoryResult {
  submissions: InboxSubmission[];
  total: number;
  page: number;
  pages: number;
  isLoading: boolean;
  error: string | null;
  setPage: (p: number) => void;
  refetch: () => void;
}

export function useSubmissionHistory(size = 20): UseSubmissionHistoryResult {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<InboxSubmission> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedResponse<InboxSubmission>>(
        `/inbox/?page=${page}&size=${size}`,
      );
      setData(res.data);
    } catch {
      setError('Failed to load workflow history.');
    } finally {
      setIsLoading(false);
    }
  }, [page, size]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    submissions: data?.items ?? [],
    total: data?.total ?? 0,
    page,
    pages: data?.pages ?? 1,
    isLoading,
    error,
    setPage,
    refetch: fetch,
  };
}
