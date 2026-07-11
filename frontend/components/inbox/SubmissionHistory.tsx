'use client';

import { useInboxStore } from '@/store/inbox';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function SubmissionHistory() {
  const { submissions, setCurrentSubmission, currentSubmission } = useInboxStore();

  if (submissions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Submissions
      </h3>
      <div className="space-y-2">
        {submissions.slice(0, 5).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentSubmission(s)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-all duration-150',
              'hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary',
              currentSubmission?.id === s.id
                ? 'bg-muted border-primary/50 shadow-sm'
                : 'bg-card border-border'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                {s.content || (s.file_url ? `📎 Attached document: ${s.file_url.split('/').pop()}` : 'No text content')}
              </p>
              <span
                className={cn(
                  'flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  STATUS_COLORS[s.status],
                )}
              >
                {s.status}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{formatDateTime(s.created_at)}</span>
              {s.assigned_agent && (
                <span className="capitalize font-semibold text-primary">{s.assigned_agent} Agent</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
