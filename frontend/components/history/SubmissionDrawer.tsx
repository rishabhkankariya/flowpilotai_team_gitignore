'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { InboxSubmission, WorkflowStatus } from '@/types';
import { WorkflowViewer } from '@/components/workflow/WorkflowViewer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SubmissionDrawerProps {
  submission: InboxSubmission | null;
  onClose: () => void;
}

const STATUS_STYLES: Record<WorkflowStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function SubmissionDrawer({ submission, onClose }: SubmissionDrawerProps) {
  return (
    <AnimatePresence>
      {submission && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-card shadow-2xl sm:max-w-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Submission Details</h2>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', STATUS_STYLES[submission.status])}>
                  {submission.status}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meta */}
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p>{formatDateTime(submission.created_at)}</p>
                </div>
                {submission.assigned_agent && (
                  <div>
                    <p className="text-xs text-muted-foreground">Agent</p>
                    <p className="capitalize">{submission.assigned_agent} Agent</p>
                  </div>
                )}
                {submission.confidence_score !== null && submission.confidence_score !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p>{(submission.confidence_score * 100).toFixed(1)}%</p>
                  </div>
                )}
                {submission.detected_intent && (
                  <div>
                    <p className="text-xs text-muted-foreground">Intent</p>
                    <p>{submission.detected_intent.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Content */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Original Message</p>
                <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">
                  {submission.content}
                </p>
              </div>

              {/* Error */}
              {submission.error_message && (
                <>
                  <Separator />
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <p className="text-xs font-medium text-destructive mb-1">Error</p>
                    <p className="text-sm text-destructive">{submission.error_message}</p>
                  </div>
                </>
              )}

              {/* Workflow Timeline */}
              {submission.result?.steps && submission.result.steps.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-4 text-xs font-medium text-muted-foreground">Workflow Timeline</p>
                    <WorkflowViewer steps={submission.result.steps} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
