'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore } from '@/store/inbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import { WorkflowViewer } from '@/components/workflow/WorkflowViewer';
import type { AgentType, WorkflowStatus } from '@/types';

const AGENT_COLORS: Record<AgentType, string> = {
  sales: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  support: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  finance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  executive: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const STATUS_ICONS: Record<WorkflowStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />,
  processing: (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  ),
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
};

export function ResultPanel() {
  const currentSubmission = useInboxStore((s) => s.currentSubmission);
  const isPolling = useInboxStore((s) => s.isPolling);

  return (
    <AnimatePresence mode="wait">
      {!currentSubmission ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center h-[400px]"
        >
          <Brain className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">No submission yet</p>
            <p className="text-sm text-muted-foreground/70">
              Submit a message or document to start the AI workflow
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={currentSubmission.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Workflow Analysis</CardTitle>
                <div className="flex items-center gap-2">
                  {STATUS_ICONS[currentSubmission.status]}
                  <span className="text-sm font-medium capitalize text-muted-foreground">
                    {currentSubmission.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {/* Agent + Intent metadata */}
              {(currentSubmission.assigned_agent || currentSubmission.detected_intent) && (
                <div className="flex flex-wrap gap-2">
                  {currentSubmission.assigned_agent && (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                        AGENT_COLORS[currentSubmission.assigned_agent as AgentType] || 'bg-muted text-muted-foreground',
                      )}
                    >
                      {String(currentSubmission.assigned_agent).toUpperCase()} Agent
                    </span>
                  )}
                  {currentSubmission.detected_intent && (
                    <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
                      Intent: {currentSubmission.detected_intent}
                    </Badge>
                  )}
                </div>
              )}

              {/* Confidence Score Bar */}
              {currentSubmission.confidence_score !== null && currentSubmission.confidence_score !== undefined && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Confidence Score</span>
                    <span className="font-bold">
                      {(currentSubmission.confidence_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={currentSubmission.confidence_score * 100}
                    className="h-2"
                  />
                  {currentSubmission.confidence_score < 0.5 && (
                    <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 p-2 rounded">
                      ⚠️ Low confidence classification. Workflow routed to Executive Agent for audit.
                    </p>
                  )}
                </div>
              )}

              {/* Execution Steps */}
              {currentSubmission.result?.steps && currentSubmission.result.steps.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Execution Steps
                  </h4>
                  <WorkflowViewer steps={currentSubmission.result.steps} />
                </div>
              )}

              {/* Result Content */}
              {currentSubmission.status === 'completed' && currentSubmission.result?.agent_response && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Agent Output
                  </h4>
                  <div className="rounded-lg bg-muted/50 p-4 border overflow-x-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
                      {typeof currentSubmission.result.agent_response === 'string'
                        ? currentSubmission.result.agent_response
                        : JSON.stringify(currentSubmission.result.agent_response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {currentSubmission.status === 'failed' && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    Execution Failure
                  </h4>
                  <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-4">
                    <p className="text-sm text-destructive">
                      {currentSubmission.error_message ?? 'An unknown error occurred during workflow execution.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Polling / Loading Info */}
              {isPolling && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <Clock className="h-3 w-3" />
                  <span>Polling for workflow updates...</span>
                </div>
              )}

              <div className="text-[10px] text-muted-foreground border-t pt-3 flex justify-between">
                <span>ID: {currentSubmission.id}</span>
                <span>Submitted {formatDateTime(currentSubmission.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
