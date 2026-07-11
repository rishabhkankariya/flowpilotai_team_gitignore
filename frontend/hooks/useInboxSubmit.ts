'use client';

import { useCallback, useRef } from 'react';
import api from '@/lib/api';
import { InboxSubmission } from '@/types';
import { useInboxStore } from '@/store/inbox';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000; // 2 minutes max

export function useInboxSubmit() {
  const { addSubmission, updateSubmission, setCurrentSubmission, setPolling } =
    useInboxStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
    setPolling(false);
  }, [setPolling]);

  const pollStatus = useCallback(
    (id: string) => {
      setPolling(true);
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get<InboxSubmission>(`/inbox/${id}`);
          const updated = res.data;
          updateSubmission(updated);

          if (
            updated.status === 'completed' ||
            updated.status === 'failed'
          ) {
            stopPolling();
          }
        } catch {
          stopPolling();
        }
      }, POLL_INTERVAL_MS);

      // Safety timeout
      timeoutRef.current = setTimeout(() => {
        stopPolling();
      }, POLL_TIMEOUT_MS);
    },
    [setPolling, updateSubmission, stopPolling],
  );

  const submit = useCallback(
    async (content: string, fileUrl?: string): Promise<void> => {
      const res = await api.post<InboxSubmission>('/inbox/submit', {
        content,
        file_url: fileUrl ?? null,
      });
      const submission = res.data;
      addSubmission(submission);
      setCurrentSubmission(submission);
      pollStatus(submission.id);
    },
    [addSubmission, setCurrentSubmission, pollStatus],
  );

  return { submit, stopPolling };
}
