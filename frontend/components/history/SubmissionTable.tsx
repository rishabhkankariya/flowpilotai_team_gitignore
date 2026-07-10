'use client';

import { useState } from 'react';
import { InboxSubmission, WorkflowStatus } from '@/types';
import { SubmissionDrawer } from './SubmissionDrawer';
import { useSubmissionHistory } from '@/hooks/useSubmissionHistory';
import { Button } from '@/components/ui/button';
import { formatDateTime, truncate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: WorkflowStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Pending', value: 'pending' },
];

const STATUS_COLORS: Record<WorkflowStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const AGENT_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-700',
  support: 'bg-green-100 text-green-700',
  finance: 'bg-purple-100 text-purple-700',
  executive: 'bg-orange-100 text-orange-700',
};

export function SubmissionTable() {
  const { submissions, total, page, pages, isLoading, error, setPage, refetch } =
    useSubmissionHistory();
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<InboxSubmission | null>(null);

  const filtered = statusFilter === 'all'
    ? submissions
    : submissions.filter((s) => s.status === statusFilter);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border p-12">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className="h-8 text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Submitted</th>
              <th className="px-4 py-3 text-left font-medium">Content</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Agent</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b">
                  {[1,2,3,4,5].map((j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No submissions found
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setSelectedSubmission(s)}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(s.created_at)}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="truncate block">{truncate(s.content, 50)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[s.status])}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {s.assigned_agent && (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', AGENT_COLORS[s.assigned_agent])}>
                        {s.assigned_agent}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-xs">
                    {s.confidence_score !== null && s.confidence_score !== undefined
                      ? `${(s.confidence_score * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} total submissions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page} of {pages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page + 1)}
              disabled={page === pages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SubmissionDrawer
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
      />
    </>
  );
}
